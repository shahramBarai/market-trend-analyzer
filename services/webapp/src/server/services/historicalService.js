import { Op } from "sequelize";
import { BuyAdvisories, EMAResults } from "./databaseService.js";

async function getEMAResults(share, limit) {
  if (!limit) limit = 100;
  const latestRecord = await EMAResults.findOne({
    where: { symbol: share },
    order: [["trade_timestamp", "DESC"]],
  });

  if (!latestRecord) {
    return [];
  }

  const latestTimestamp = latestRecord.trade_timestamp;
  const fifteenMinutesBefore = new Date(latestTimestamp.getTime() - limit * 60 * 1000);

  const results = await EMAResults.findAll({
    where: {
      symbol: share,
      trade_timestamp: {
        [Op.between]: [fifteenMinutesBefore, latestTimestamp],
      },
    },
    order: [["trade_timestamp", "ASC"]],
  });

  return results.map((r) => ({
    symbol: r.symbol,
    ema38: r.ema38,
    ema100: r.ema100,
    tradeTimestamp: {
      seconds: r.trade_timestamp.getTime() / 1000,
      nanos: r.trade_timestamp.getTime() % 1000 * 1000000,
    }
  }));
}

async function getBuyAdvisories(share, limit) {
  if (!limit) limit = 100;
  const latestRecord = await BuyAdvisories.findOne({
    where: { symbol: share },
    order: [["trade_timestamp", "DESC"]],
  });

  if (!latestRecord) {
    return [];
  }

  const latestTimestamp = latestRecord.trade_timestamp;
  const fifteenMinutesBefore = new Date(latestTimestamp.getTime() - limit * 60 * 1000);

  const results = await BuyAdvisories.findAll({
    where: {
      symbol: share,
      trade_timestamp: {
        [Op.between]: [fifteenMinutesBefore, latestTimestamp],
      },
    },
    order: [["trade_timestamp", "ASC"]],
  });

  return results.map((r) => ({
    symbol: r.symbol,
    message: r.advice,
    tradeTimestamp: {
      seconds: r.trade_timestamp.getTime() / 1000,
      nanos: r.trade_timestamp.getTime() % 1000 * 1000000,
    }
  }));
}

export async function getHistoricalMessages(topic, share) {
  if (topic.includes("-ema")) {
    const res = await getEMAResults(share);
    return res;
  } else if (topic.includes("-advisories")) {
    const res = await getBuyAdvisories(share);
    return res;
  }
  return [];
}
