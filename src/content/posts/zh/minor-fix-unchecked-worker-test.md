---
title: Minor Fix unchecked WorkerTest
description: Kafka WorkerTest 編譯時有 unchecked or unsafe operations 的警告，釐清 Mockito 建立 generic mock 時的 type checking 限制，並參考既有寫法，以局部 SuppressWarnings 處理。
pubDate: '2026-10-21'
tags: ['Kafka', 'Java', 'Mockito']
draft: false
review-by-me: true
---

PR: https://github.com/apache/kafka/pull/23893

雖然只是個 one-line fix，但背後還是歷經一番調查與判斷。

## Requirements

編譯 Kafka Connect 的測試時，[Chia-Ping Tsai](https://github.com/chia7712) 發現 `WorkerTest.java` 出現以下提示：

```text
Note: /home/chia7712/project/kafka/connect/runtime/src/test/java/org/apache/kafka/connect/runtime/WorkerTest.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
```

目標是找出警告來源，然後清除它。

## Background

直接 Compile 就可以重現問題：

```bash
./gradlew :connect:runtime:compileTestJava --rerun-tasks
```

`--rerun-tasks` 會要求 Gradle 重新執行任務，避免因為已經編譯過而跳過。dependency tasks 也會重新執行。

進一步使用 `-Xlint:unchecked` 編譯，可以定位到這一行：

```java
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

這行程式碼透過 Mockito 建立 `Transformation` mock object，並將它指定給 `brokenTransform`。

- `Transformation<SourceRecord>`：宣告「這是一個處理 `SourceRecord` 的 transformer」。
- `brokenTransform`：variable name。
- `mock(Transformation.class)`：請 Mockito 建立一個 `Transformation` mock object。

測試接著設定這個 mock object 的行為：

```java
doThrow(new RuntimeException("Failed to configure transform"))
    .when(brokenTransform).configure(any());
```

意思是：「呼叫 `brokenTransform.configure()` 時，就丟出 exception。」

以此測試 Worker 如何處理 transformer 設定失敗。

## Research / What I learned

### 這種 generic mock 寫法為何產生 unchecked 警告？

Mockito 的 `mock` method 可以簡化理解成：

```java
public static <T> T mock(Class<T> classToMock)
```

你傳入哪個 class 或 interface 的 class literal，Mockito 就建立對應 type 的 mock object。例如：

```java
ClientTelemetryReporter reporter = mock(ClientTelemetryReporter.class);
MetadataCache mockMetadataCache = mock(MetadataCache.class);
```

這兩個 class 本身沒有 type parameter，左邊宣告的 variable type 與 `mock(...)` 的 return type 能對得上。

| 傳入 Mockito | return type | variable type |
| --- | --- | --- |
| `ClientTelemetryReporter.class` | `ClientTelemetryReporter` | `ClientTelemetryReporter` |
| `MetadataCache.class` | `MetadataCache` | `MetadataCache` |


但 `Transformation` 這個 interface 的宣告帶有 type parameter：

```java
public interface Transformation<R extends ConnectRecord<R>>
```

`R` 代表這個 transformer 處理的 record type。因此：

```java
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

左邊宣告的 variable type 與 `mock(...)` 的 return type 就有差異：

| 傳入 Mockito | return type | variable type |
| --- | --- | --- |
| `Transformation.class` | `Transformation` raw type，沒有指定 `R` | `Transformation<SourceRecord>` |

compiler 能確認 mock 出來的 type 是 `Transformation`，卻無法確認它處理的資料是不是 `SourceRecord`，因此產生 unchecked conversion 警告。

Java 也不允許在 class literal 中指定 `SourceRecord` 這個 type argument：

```java
// 無法編譯
Transformation<SourceRecord> brokenTransform =
    mock(Transformation<SourceRecord>.class);
```

所以問題出在這種 mock 建立方式缺少 type argument 資訊。

這個警告無法判斷已經發生 type error，就只是 compiler 無法確認回傳的 raw type 是否符合左邊要求的 type arguments。

### Kafka 既有的 generic mock 寫法

用 AI 搜尋 Kafka 的測試程式碼後，有找到三種相關寫法。

#### 在 variable declaration 上加 suppress

`WorkerTest.java` 本身就有這個例子：

```java
@SuppressWarnings("unchecked")
Producer<byte[], byte[]> producer = mock(Producer.class);
```

它與這次問題相同：右邊是 `Producer` raw type，左邊要求 `Producer<byte[], byte[]>`，因此在 variable declaration 上抑制 unchecked 警告。

#### 在 method 上加 suppress

`TransformationStageTest.applyAndAssert` 則在 method 上加上 annotation，涵蓋多個 generic mock。

`@SuppressWarnings` 是 Java 提供的 annotation，並非 Mockito 的功能。

其中 `"unchecked"` 是這次要抑制的警告種類，**它不會補上 generic type checking，也不會改變測試執行行為。**

```java
@SuppressWarnings("unchecked")
private void applyAndAssert(/* ... */) {
    Plugin<Predicate<SourceRecord>> predicatePlugin = mock(Plugin.class);
    Predicate<SourceRecord> predicate = mock(Predicate.class);

    // ...
    Transformation<SourceRecord> transformation = mock(Transformation.class);
}
```

其中最後一行就是與這次一樣的 `Transformation<SourceRecord>` mock。它沒有顯示 unchecked 警告，是因為 method 上已經加了 suppress。

#### 使用 Mockito 的 `@Mock` field

`AbstractWorkerSourceTaskTest` 使用另一種方式：

```java
@Mock private KafkaProducer<byte[], byte[]> producer;
```

Mockito 初始化測試時會建立這個 mock object。這裡沒有直接把 `KafkaProducer` raw type 指定給帶有 type arguments 的 variable，因此不會出現相同的 unchecked conversion 警告。

## Implementation / How to Solve it

### 使用 `SuppressWarnings` 局部抑制已知警告

由於 `TransformationStageTest` 剛好也有對於 `Transformation<SourceRecord>` 做 suppress 的處理，就直接沿用了。

同一份 `WorkerTest.java` 也已有 variable 層級的 suppress，因此這次把抑制範圍限制在這個宣告。

```java
@SuppressWarnings("unchecked")
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

## Verification

```bash
./gradlew :connect:runtime:compileTestJava --rerun-tasks
```

執行後，沒有再看到 `WorkerTest.java` unchecked 提示。

```text
BUILD SUCCESSFUL in 30s
42 actionable tasks: 42 executed
```
