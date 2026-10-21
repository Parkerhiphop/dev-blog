---
title: Minor Fix unchecked WorkerTest
description: Kafka WorkerTest のコンパイル時に出た unchecked or unsafe operations 警告を調査し、Mockito でジェネリックなモックを作成する際の型チェックの制約を整理。既存の実装を参考に、局所的な SuppressWarnings で対処しました。
pubDate: '2026-10-21'
tags: ['Kafka', 'Java', 'Mockito']
draft: false
review-by-me: false
---

PR: https://github.com/apache/kafka/pull/23893

たった 1 行の修正ですが、そこに至るまでには調査と判断が必要でした。

## 要件

Kafka Connect のテストをコンパイルしている際、[Chia-Ping Tsai](https://github.com/chia7712) は `WorkerTest.java` に関して次のようなメッセージに気づきました：

```text
> Task :connect:runtime:compileTestJava
Note: .../kafka/connect/runtime/src/test/java/org/apache/kafka/connect/runtime/WorkerTest.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
```

目標は、警告の発生箇所を特定して解消することです。

## 背景

テストをコンパイルするだけで再現できます。

```bash
./gradlew :connect:runtime:compileTestJava --rerun-tasks
```

`--rerun-tasks` を付けると、Gradle はコンパイル済みでもタスクをスキップせずに再実行します。依存先のタスクも再実行されます。

さらに `-Xlint:unchecked` を付けてコンパイルすると、次の行が原因だとわかります。

```java
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

この行では、Mockito で `Transformation` のモックオブジェクトを作成し、`brokenTransform` に代入しています。

- `Transformation<SourceRecord>`：`SourceRecord` を扱うトランスフォーマーであることを宣言しています。
- `brokenTransform`：変数名です。
- `mock(Transformation.class)`：Mockito に `Transformation` のモックオブジェクトを作成させます。

続いて、テストではこのモックオブジェクトの振る舞いを設定しています。

```java
doThrow(new RuntimeException("Failed to configure transform"))
    .when(brokenTransform).configure(any());
```

これは「`brokenTransform.configure()` が呼ばれたら例外を投げる」という意味です。

これにより、トランスフォーマーの設定が失敗したときに Worker がどう処理するかをテストできます。

## 調査・学んだこと

### このジェネリックなモックの書き方で unchecked 警告が出る理由

Mockito の `mock` メソッドは、簡略化すると次のように理解できます。

```java
public static <T> T mock(Class<T> classToMock)
```

クラスやインターフェースのクラスリテラルを渡すと、Mockito が対応する型のモックオブジェクトを作成します。たとえば、次のようなコードです。

```java
ClientTelemetryReporter reporter = mock(ClientTelemetryReporter.class);
MetadataCache mockMetadataCache = mock(MetadataCache.class);
```

この 2 つのクラスには型パラメーターがないため、左辺で宣言した変数の型と `mock(...)` の戻り値の型が一致します。

| Mockito に渡す値 | 戻り値の型 | 変数の型 |
| --- | --- | --- |
| `ClientTelemetryReporter.class` | `ClientTelemetryReporter` | `ClientTelemetryReporter` |
| `MetadataCache.class` | `MetadataCache` | `MetadataCache` |

一方、`Transformation` インターフェースの宣言には型パラメーターがあります。

```java
public interface Transformation<R extends ConnectRecord<R>>
```

`R` は、このトランスフォーマーが扱うレコードの型を表します。そのため、次のコードでは、

```java
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

左辺で宣言した変数の型と `mock(...)` の戻り値の型に違いが生じます。

| Mockito に渡す値 | 戻り値の型 | 変数の型 |
| --- | --- | --- |
| `Transformation.class` | `R` が指定されていない raw 型の `Transformation` | `Transformation<SourceRecord>` |

コンパイラーは、作成されたモックが `Transformation` 型であることは確認できます。しかし、扱うデータが `SourceRecord` なのかは確認できないため、unchecked conversion 警告が出ます。

Java では、クラスリテラルに `SourceRecord` という型引数を指定することもできません。

```java
// コンパイルできない
Transformation<SourceRecord> brokenTransform =
    mock(Transformation<SourceRecord>.class);
```

つまり、このモックの作成方法では型引数の情報が欠けています。

この警告だけで、型エラーが起きていると判断できるわけではありません。コンパイラーが、返された raw 型と左辺で要求される型引数が整合しているかを確認できない、ということです。

### Kafka にある既存のジェネリックなモックの書き方

AI を使って Kafka のテストコードを検索したところ、関連する書き方が 3 つ見つかりました。

#### 変数宣言に suppress を付ける

`WorkerTest.java` 自体にも、次の例があります。

```java
@SuppressWarnings("unchecked")
Producer<byte[], byte[]> producer = mock(Producer.class);
```

今回と同じく、右辺は raw 型の `Producer` で、左辺は `Producer<byte[], byte[]>` を要求しています。そのため、変数宣言に対して unchecked 警告を抑制しています。

#### メソッドに suppress を付ける

`TransformationStageTest.applyAndAssert` では、メソッドにアノテーションを付け、複数のジェネリックなモックをまとめて対象にしています。

`@SuppressWarnings` は Java が提供するアノテーションで、Mockito の機能ではありません。

ここでの `"unchecked"` は、抑制する警告の種類を指定しています。**ジェネリクスの型チェックを補うものではなく、テスト実行時の振る舞いも変わりません。**

```java
@SuppressWarnings("unchecked")
private void applyAndAssert(/* ... */) {
    Plugin<Predicate<SourceRecord>> predicatePlugin = mock(Plugin.class);
    Predicate<SourceRecord> predicate = mock(Predicate.class);

    // ...
    Transformation<SourceRecord> transformation = mock(Transformation.class);
}
```

最後の行は、今回と同じ `Transformation<SourceRecord>` のモックです。unchecked 警告が出ないのは、メソッドにすでに suppress が付いているためです。

#### Mockito の `@Mock` フィールドを使う

`AbstractWorkerSourceTaskTest` では、別の方法を使っています。

```java
@Mock private KafkaProducer<byte[], byte[]> producer;
```

テストの初期化時に、Mockito がこのモックオブジェクトを作成します。ここでは raw 型の `KafkaProducer` を型引数付きの変数へ直接代入していないため、同じ unchecked conversion 警告は出ません。

## 実装・解決方法

### `SuppressWarnings` で既知の警告を局所的に抑制する

`TransformationStageTest` にもちょうど `Transformation<SourceRecord>` の警告を suppress する処理があったので、その方法を踏襲しました。

同じ `WorkerTest.java` にも変数単位の suppress があるため、今回も抑制範囲をこの宣言に限定しました。

```java
@SuppressWarnings("unchecked")
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

## 検証

```bash
./gradlew :connect:runtime:compileTestJava --rerun-tasks
```

実行後、`WorkerTest.java` の unchecked メッセージは表示されなくなりました。

```text
BUILD SUCCESSFUL in 30s
42 actionable tasks: 42 executed
```
