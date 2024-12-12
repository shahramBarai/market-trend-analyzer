import {
  decodeBuyAdvisory,
  decodeFinancialTick,
  decodeEMAResult,
} from "../helpers/protobufLoader.js";
import { writeTick, writeEma, writeAdvisory } from "./csvService.js";

export async function handleMessage(topic, buffer, benchmarkTimestamp) {
  try {
    if (topic.includes("-ticks")) {
      const msg = decodeFinancialTick(buffer);
      await writeTick(topic, {
        id: msg.id,
        sec_type: msg.sec_type,
        last: msg.last,
        trade_timestamp: JSON.stringify(msg.trade_timestamp),
        wallclock_timestamp: msg.wallclock_timestamp,
        delay: msg.delay,
        benchmark_timestamp: benchmarkTimestamp,
      });
    } else if (topic.includes("-ema")) {
      const msg = decodeEMAResult(buffer);
      await writeEma(topic, {
        symbol: msg.symbol,
        ema38: msg.ema38,
        ema100: msg.ema100,
        trade_timestamp: msg.trade_timestamp,
        benchmark_timestamp: benchmarkTimestamp,
      });
    } else if (topic.includes("-advisories")) {
      const msg = decodeBuyAdvisory(buffer);
      await writeAdvisory(topic, {
        symbol: msg.symbol,
        message: msg.message,
        trade_timestamp: msg.trade_timestamp,
        benchmark_timestamp: benchmarkTimestamp,
      });
    } else {
      console.log(`Received message from unknown topic: ${topic}`);
    }
  } catch (e) {
    console.error("Error handling message:", e);
  }
}
