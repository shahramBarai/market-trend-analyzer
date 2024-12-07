# market-trend-analyzer

Scalable Systems and Data Management Course Project: Detecting Trading Trends in Financial Tick Data

## Set up Kafka

```bash
docker compose up -d kafka
docker exec -it kafka /bin/bash /configs/create_topics.sh
```

## Set up Flink analytics job

Clean and compile the project

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

## Run everything

```bash
docker compose up
```

## Run the Flink job

```bash
docker exec -it flink-jobmanager bash -c "flink run /opt/flink/usrlib/scala-2.12/flink-scala-analytics-assembly-0.1.0-SNAPSHOT.jar"
```

## Run producer

```bash
cd services/producer
cargo run
```
