---
title: Minor Fix unchecked WorkerTest
description: Investigating an unchecked or unsafe operations warning in Kafka WorkerTest, understanding the type checking limits of generic mocks in Mockito, and applying a local SuppressWarnings annotation based on existing code.
pubDate: '2026-10-21'
tags: ['Kafka', 'Java', 'Mockito']
draft: false
review-by-me: false
---

PR: https://github.com/apache/kafka/pull/23893

It was only a one-line fix, but getting there still took some investigation and judgment.

## Requirements

While compiling the Kafka Connect tests, [Chia-Ping Tsai](https://github.com/chia7712) noticed the following message for `WorkerTest.java`:

```text
> Task :connect:runtime:compileTestJava
Note: .../kafka/connect/runtime/src/test/java/org/apache/kafka/connect/runtime/WorkerTest.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
```

The goal was to find the source of the warning and clear it.

## Background

Simply compiling the tests reproduces the issue:

```bash
./gradlew :connect:runtime:compileTestJava --rerun-tasks
```

`--rerun-tasks` tells Gradle to run the tasks again instead of skipping them because they have already been compiled. It also reruns dependency tasks.

Compiling with `-Xlint:unchecked` pinpoints this line:

```java
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

This line uses Mockito to create a `Transformation` mock object and assigns it to `brokenTransform`.

- `Transformation<SourceRecord>`: declares a transformer that handles `SourceRecord`.
- `brokenTransform`: the variable name.
- `mock(Transformation.class)`: asks Mockito to create a `Transformation` mock object.

The test then configures the mock object's behavior:

```java
doThrow(new RuntimeException("Failed to configure transform"))
    .when(brokenTransform).configure(any());
```

This means: “Throw an exception when `brokenTransform.configure()` is called.”

This lets the test check how the Worker handles a transformer configuration failure.

## Research / What I learned

### Why does this way of creating a generic mock produce an unchecked warning?

A simplified version of Mockito's `mock` method looks like this:

```java
public static <T> T mock(Class<T> classToMock)
```

You pass in the class literal of a class or interface, and Mockito creates a mock object of the corresponding type. For example:

```java
ClientTelemetryReporter reporter = mock(ClientTelemetryReporter.class);
MetadataCache mockMetadataCache = mock(MetadataCache.class);
```

Neither class has type parameters, so the declared variable type matches the return type of `mock(...)`.

| Passed to Mockito | Return type | Variable type |
| --- | --- | --- |
| `ClientTelemetryReporter.class` | `ClientTelemetryReporter` | `ClientTelemetryReporter` |
| `MetadataCache.class` | `MetadataCache` | `MetadataCache` |

However, the `Transformation` interface is declared with a type parameter:

```java
public interface Transformation<R extends ConnectRecord<R>>
```

`R` represents the record type that the transformer handles. So in this line:

```java
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

The declared variable type differs from the return type of `mock(...)`:

| Passed to Mockito | Return type | Variable type |
| --- | --- | --- |
| `Transformation.class` | Raw type `Transformation`, with no `R` specified | `Transformation<SourceRecord>` |

The compiler can confirm that the mock's type is `Transformation`, but it cannot verify whether it handles `SourceRecord`, so it produces an unchecked conversion warning.

Java also does not allow the type argument `SourceRecord` in a class literal:

```java
// Does not compile
Transformation<SourceRecord> brokenTransform =
    mock(Transformation<SourceRecord>.class);
```

The issue is that this way of creating a mock lacks type argument information.

The warning does not establish that a type error has occurred. It just means the compiler cannot verify whether the returned raw type matches the type arguments required by the variable on the left.

### Existing generic mock patterns in Kafka

Using AI to search Kafka's test code, I found three related patterns.

#### Suppress the warning on the variable declaration

`WorkerTest.java` itself already has this example:

```java
@SuppressWarnings("unchecked")
Producer<byte[], byte[]> producer = mock(Producer.class);
```

It has the same issue: the right side is the raw type `Producer`, while the left side requires `Producer<byte[], byte[]>`. The unchecked warning is therefore suppressed on the variable declaration.

#### Suppress the warning on the method

`TransformationStageTest.applyAndAssert` places the annotation on the method, covering multiple generic mocks.

`@SuppressWarnings` is a Java annotation, not a Mockito feature.

Here, `"unchecked"` specifies the warning category to suppress. **It does not add generic type checking or change the test's runtime behavior.**

```java
@SuppressWarnings("unchecked")
private void applyAndAssert(/* ... */) {
    Plugin<Predicate<SourceRecord>> predicatePlugin = mock(Plugin.class);
    Predicate<SourceRecord> predicate = mock(Predicate.class);

    // ...
    Transformation<SourceRecord> transformation = mock(Transformation.class);
}
```

The last line creates the same kind of `Transformation<SourceRecord>` mock as in this fix. It does not show an unchecked warning because the method already suppresses it.

#### Use a Mockito `@Mock` field

`AbstractWorkerSourceTaskTest` takes another approach:

```java
@Mock private KafkaProducer<byte[], byte[]> producer;
```

Mockito creates this mock object when initializing the test. There is no direct assignment of the raw type `KafkaProducer` to a variable with type arguments here, so the same unchecked conversion warning does not occur.

## Implementation / How to Solve it

### Use `SuppressWarnings` to suppress the known warning locally

Since `TransformationStageTest` already suppresses the warning for a `Transformation<SourceRecord>` mock, I followed that approach.

The same `WorkerTest.java` file also has a variable-level suppression, so I limited the suppression to this declaration:

```java
@SuppressWarnings("unchecked")
Transformation<SourceRecord> brokenTransform = mock(Transformation.class);
```

## Verification

```bash
./gradlew :connect:runtime:compileTestJava --rerun-tasks
```

After running this command, the unchecked message for `WorkerTest.java` no longer appeared.

```text
BUILD SUCCESSFUL in 30s
42 actionable tasks: 42 executed
```
