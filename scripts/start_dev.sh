#!/bin/bash

# Function to check if a command was successful and exit if it wasn't
check_success() {
    if [ $? -ne 0 ]; then
        echo "Error occurred during the previous command. Exiting."
        exit 1
    fi
}

echo "Starting Kafka setup..."

# Start Kafka service
docker compose up -d kafka
check_success

# Wait until kafka:9094 is open
echo "Waiting for Kafka to start..."
while ! nc -z localhost 9094; do sleep 1; done
echo "Kafka started."


# Run the Kafka topic creation script
echo "Creating Kafka topics..."
docker exec -it kafka /bin/bash /configs/create_topics.sh
check_success
echo "Kafka setup completed."

# Set up Flink analytics job
echo "Setting up Flink analytics job..."
# Clean and compile the Flink job
mkdir -p build
docker run -it --rm \
  --name scala-sbt \
  -v ./services/flink-scala-analytics:/app \
  -v ./shared:/shared \
  -v ./build:/build \
  -w /app \
  sbtscala/scala-sbt:eclipse-temurin-jammy-21.0.2_13_1.9.9_2.12.19 \
  bash -c "sbt 'set Compile / PB.protoSources := Seq(file(\"/shared\"))' 'set target := file(\"/build\")' assembly && chown -R $(id -u):$(id -g) /build"
check_success
echo "Flink analytics job setup completed."

# Run everything (other containers)
echo "Starting all services..."
docker compose up -d
check_success
echo "All services started."

# Run the Flink job in background
echo "Running Flink job..."
docker exec flink-jobmanager bash -c " \
flink run -d /opt/flink/usrlib/scala-2.12/flink-scala-analytics-assembly-0.1.0-SNAPSHOT.jar \
--region FR \
--inputTopic FR-ticks \
--outputTopicEMA FR-ema \
--outputTopicBuyAdvisory FR-advisories \
--parallelism 2 \
--kafkaBrokers kafka:9092"
check_success
docker exec flink-jobmanager bash -c " \
flink run -d /opt/flink/usrlib/scala-2.12/flink-scala-analytics-assembly-0.1.0-SNAPSHOT.jar \
--region NL \
--inputTopic NL-ticks \
--outputTopicEMA NL-ema \
--outputTopicBuyAdvisory NL-advisories \
--parallelism 2 \
--kafkaBrokers kafka:9092"
check_success
docker exec flink-jobmanager bash -c " \
flink run -d /opt/flink/usrlib/scala-2.12/flink-scala-analytics-assembly-0.1.0-SNAPSHOT.jar \
--region ETR \
--inputTopic ETR-ticks \
--outputTopicEMA ETR-ema \
--outputTopicBuyAdvisory ETR-advisories \
--parallelism 2 \
--kafkaBrokers kafka:9092"
check_success
echo "Flink job started."

echo "Development environment setup completed. To stop the services, run 'docker compose down'."

# check if chose to run via docker or cargo using a flag --producer=docker
if [ "$1" == "--producer=docker" ]; then
    docker compose up -d producer
    check_success
else
    cd services/producer
    cargo run
    check_success
fi
