import { Kafka } from "kafkajs";
import {
  decodeEMAResult,
  decodeFinancialTick,
  decodeBuyAdvisory,
} from "../helpers/protobufLoader.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { CompressionTypes, CompressionCodecs } = require("kafkajs");
const SnappyCodec = require("kafkajs-snappy");

// Register Snappy codec
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

const KAFKA_BROKERS = process.env.KAFKA_BROKERS.split(",") || ["localhost:9094"];

export async function getHistoricalMessages(topic, share) {
  const kafka = new Kafka({
    clientId: "historical-client",
    brokers: KAFKA_BROKERS,
  });

  const groupId = `historical-${Date.now()}`;
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  const messages = [];
  let done = false;
  let idleTimeout = null;

  function scheduleStop() {
    if (idleTimeout) clearTimeout(idleTimeout);
    // If no new messages after 2 seconds, consider done
    idleTimeout = setTimeout(() => {
      done = true;
    }, 2000);
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      scheduleStop();
      // Decode based on topic logic (adjust as necessary)
      let decoded = null;
      if (topic.includes("-ema")) {
        decoded = decodeEMAResult(message.value);
        if (decoded.symbol !== share) return;
        messages.push(decoded);
      } else if (topic.includes("-ticks")) {
        const tick = decodeFinancialTick(message.value);
        if (tick.id !== share) return;
        messages.push(tick);
      } else if (topic.includes("-advisories")) {
        const advisory = decodeBuyAdvisory(message.value);
        if (advisory.symbol !== share) return;
        messages.push(advisory);
      }
    },
  });

  while (!done) {
    await new Promise((res) => setTimeout(res, 500));
  }

  await consumer.disconnect();
  return messages;
}
