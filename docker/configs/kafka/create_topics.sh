#!/bin/bash

CONFIG_FILE="/configs/topics.json"
BROKER="kafka:9092"


# Check if topics configuration file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Topics configuration file ($CONFIG_FILE) not found!"
  exit 1
fi

# Create topics
echo "Creating topics..."

# Extract each JSON object (one per line)
topics=$(cat "$CONFIG_FILE" | tr -d '\n' | sed 's/},/}\n/g')

# Process each JSON object
echo "$topics" | while read -r topic; do
  name=$(echo "$topic" | grep -oP '"name":\s*"\K[^"]+')
  partitions=$(echo "$topic" | grep -oP '"partitions":\s*\K\d+')
  replication=$(echo "$topic" | grep -oP '"replicationFactor":\s*\K\d+')

  echo "Creating topic: $name with $partitions partitions and $replication replication factor..."

  /opt/bitnami/kafka/bin/kafka-topics.sh --create \
    --bootstrap-server "$BROKER" \
    --topic "$name" \
    --partitions "$partitions" \
    --replication-factor "$replication" || {
      echo "Failed to create topic: $name"
      exit 1
    }
done

echo "Topics created successfully."