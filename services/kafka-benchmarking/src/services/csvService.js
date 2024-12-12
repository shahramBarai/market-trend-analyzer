import { createObjectCsvWriter as createCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";

// Ensure the output directory exists
const outputDir = "output";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Cache of writers by topic
const writersByTopic = {};

// Define headers for each topic type (by their suffix)
const headers = {
  ticks: [
    { id: "id", title: "ID" },
    { id: "sec_type", title: "SEC_TYPE" },
    { id: "last", title: "LAST" },
    { id: "trade_timestamp", title: "TRADE_TIMESTAMP" },
    { id: "wallclock_timestamp", title: "WALLCLOCK_TIMESTAMP" },
    { id: "delay", title: "DELAY" },
    { id: "benchmark_timestamp", title: "BENCHMARK_TIMESTAMP" },
  ],
  ema: [
    { id: "symbol", title: "SYMBOL" },
    { id: "ema38", title: "EMA38" },
    { id: "ema100", title: "EMA100" },
    { id: "trade_timestamp", title: "TRADE_TIMESTAMP" },
    { id: "benchmark_timestamp", title: "BENCHMARK_TIMESTAMP" },
  ],
  advisories: [
    { id: "symbol", title: "SYMBOL" },
    { id: "message", title: "MESSAGE" },
    { id: "trade_timestamp", title: "TRADE_TIMESTAMP" },
    { id: "benchmark_timestamp", title: "BENCHMARK_TIMESTAMP" },
  ],
};

/**
 * Returns a CSV writer for a given topic.
 * If one does not exist, it creates a new one and caches it.
 */
function getCsvWriterForTopic(topic) {
  if (!writersByTopic[topic]) {
    // Extract the suffix of the topic. Example: "FR-ticks" -> "ticks"
    const parts = topic.split("-");
    const suffix = parts[parts.length - 1];

    const topicHeaders = headers[suffix] || []; // default to empty if not found
    // Time as DD-MM-YYYY-HH-mm-ss
    const time = new Date().toLocaleString().replace(/[\/:]/g, "-");
    const csvPath = path.join(outputDir, `${topic}-${time}.csv`);

    writersByTopic[topic] = createCsvWriter({
      path: csvPath,
      header: topicHeaders,
      append: true,
    });
  }
  return writersByTopic[topic];
}

async function writeRecord(topic, record) {
  const writer = getCsvWriterForTopic(topic);
  await writer.writeRecords([record]);
}

async function writeTick(topic, record) {
  await writeRecord(topic, record);
}

async function writeEma(topic, record) {
  await writeRecord(topic, record);
}

async function writeAdvisory(topic, record) {
  await writeRecord(topic, record);
}

export { writeTick, writeEma, writeAdvisory };
