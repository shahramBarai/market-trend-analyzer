import protobuf from "protobufjs";
import path from "path";
import { fileURLToPath } from "url";

let BuyAdvisoryProto = null;
let FinancialTickProto = null;
let EMAResultProto = null;

// Define __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadProtobuf = async () => {
  try {
    const root = await protobuf.load("../../shared/message.proto");
    BuyAdvisoryProto = root.lookupType("finance.trading.analysis.BuyAdvisory");
    FinancialTickProto = root.lookupType(
      "finance.trading.analysis.FinancialTick"
    );
    EMAResultProto = root.lookupType("finance.trading.analysis.EMAResult");
    console.log("Protobuf loaded successfully.");
  } catch (err) {
    console.error("Error loading Protobuf:", err);
  }
};

const decodeBuyAdvisory = (buffer) => {
  if (!BuyAdvisoryProto) {
    throw new Error("Protobuf not loaded yet.");
  }
  const decodedMessage = BuyAdvisoryProto.decode(buffer);
  return BuyAdvisoryProto.toObject(decodedMessage, {
    longs: String,
    enums: String,
    bytes: String,
  });
};

const decodeFinancialTick = (buffer) => {
  if (!FinancialTickProto) {
    throw new Error("Protobuf not loaded yet.");
  }

  const decodedMessage = FinancialTickProto.decode(buffer);
  return FinancialTickProto.toObject(decodedMessage, {
    longs: String,
    enums: String,
    bytes: String,
  });
};

const decodeEMAResult = (buffer) => {
  if (!EMAResultProto) {
    throw new Error("Protobuf not loaded yet.");
  }

  const decodedMessage = EMAResultProto.decode(buffer);
  return EMAResultProto.toObject(decodedMessage, {
    longs: String,
    enums: String,
    bytes: String,
  });
};

export {
  loadProtobuf,
  decodeBuyAdvisory,
  decodeFinancialTick,
  decodeEMAResult,
};
