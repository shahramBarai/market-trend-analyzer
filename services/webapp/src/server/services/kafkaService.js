import "dotenv/config";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { Kafka, CompressionTypes, CompressionCodecs } = require("kafkajs");
const SnappyCodec = require("kafkajs-snappy");
import {
  decodeBuyAdvisory,
  decodeFinancialTick,
} from "../helpers/protobufLoader.js";

// Register Snappy codec
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

const KAFKA_BROKERS = process.env.KAFKA_BROKERS.split(",") || ["kafka:9092"];
const KAFKA_TOPICS = process.env.KAFKA_TOPICS.split(",") || [];
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || "wepapp-group";

let consumer = null;

const startKafkaConsumer = async (io) => {
  const kafka = new Kafka({
    clientId: "webapp",
    brokers: KAFKA_BROKERS,
  });

  // Create a Kafka consumer and connect to the Kafka cluster
  consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
  await consumer.connect();

  // Subscribe to the Kafka topics
  for (const topic of KAFKA_TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (topic.includes("analytics")) {
          const advisory = decodeBuyAdvisory(message.value);
          // Emit to clients interested in buy advisories
          io.to(`share_advis:${advisory.symbol}`).emit(
            `${advisory.symbol}-advis`,
            advisory
          );
        } else {
          const tick = decodeFinancialTick(message.value);
          // Emit to clients interested in financial ticks
          io.to(`share_tick:${tick.id}`).emit(`${tick.id}-tick`, tick);
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    },
  });
};

export { startKafkaConsumer };