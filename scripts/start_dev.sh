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

# Run the Flink job in background
echo "Running Flink job..."
docker exec -d flink-jobmanager bash -c "flink run /opt/flink/usrlib/scala-2.12/flink-scala-analytics-assembly-0.1.0-SNAPSHOT.jar"
check_success

# Run the producer
echo "Running and printing the producer..."

cd services/producer && cargo run