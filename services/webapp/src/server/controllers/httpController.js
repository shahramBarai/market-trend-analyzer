import { getHistoricalMessages } from "../services/historicalService.js"; // We'll create this file next

export async function historicalHandler(req, res) {
  const { dataType, share } = req.query;
  if (!dataType || !share) {
    return res
      .status(400)
      .json({ error: "Missing dataType or share parameter" });
  }

  const region = share.split(".")[1];
  const topic = `${region}-${dataType}`;

  try {
    const messages = await getHistoricalMessages(topic, share);
    res.json({ share, messages });
  } catch (err) {
    console.error("Error fetching historical messages:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Returns the list of shares from ../shared/symbols.json as JSON
export async function getSharesName(req, res) {
  res.sendFile("symbols.json", {
    root: "../shared",
    headers: {
      "Content-Type": "application/json",
    },
  });
}
