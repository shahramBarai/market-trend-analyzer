# market-trend-analyzer
Scalable Systems and Data Management Course Project: Detecting Trading Trends in Financial Tick Data

## Scala Build Process

```bash
mkdir -p build
docker run -it --rm \
  --name scala-sbt \
  -v ./services/flink-scala-analytics:/app \
  -v ./shared:/shared \
  -v ./build:/build \
  -w /app \
  sbtscala/scala-sbt:eclipse-temurin-jammy-21.0.2_13_1.9.9_2.12.19 \
  bash -c "sbt 'set Compile / PB.protoSources := Seq(file(\"/shared\"))' 'set target := file(\"/build\")' assembly && chown -R $(id -u):$(id -g) /build"
```
