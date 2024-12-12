import "dotenv/config";
import { handleMessage } from "./messageService.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { Kafka, CompressionTypes, CompressionCodecs } = require("kafkajs");
const SnappyCodec = require("kafkajs-snappy");

// Register Snappy codec
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9094").split(
  ","
);
const KAFKA_TOPICS = process.env.KAFKA_TOPICS
  ? process.env.KAFKA_TOPICS.split(",")
  : ["FR-ticks", "FR-ema", "FR-advisories"];

const RUN_DURATION = parseInt(process.env.RUN_DURATION || "60", 10);

let consumer = null;

export async function startConsumer() {
  const kafka = new Kafka({
    clientId: "kafka-benchmarking",
    brokers: KAFKA_BROKERS,
  });

  consumer = kafka.consumer({ groupId: "kafka-benchmarking-group" });
  await consumer.connect();

  for (const topic of KAFKA_TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: true }); // ensure reading from earliest
  }

  setTimeout(async () => {
    console.log(`Stopping consumer after ${RUN_DURATION} seconds...`);
    await consumer.disconnect();
    process.exit(0);
  }, RUN_DURATION * 1000);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      // Pass topic, message buffer and benchmark timestamp to the message handler
      await handleMessage(topic, message.value, new Date().getTime());
    },
  });
}
