import { createServer } from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeSocket } from "./services/socketService.js";
import { loadProtobuf } from "./helpers/protobufLoader.js";
import { startKafkaConsumer } from "./services/kafkaService.js";
import { historicalHandler } from "./controllers/httpController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve the built client code (assuming `dist` is relative to this file)
app.use(express.static(path.join(__dirname, "../../dist")));

// Fallback to index.html for all other routes
app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, "../../dist", "index.html"));
});

// Define the HTTP endpoint for historical data
app.get("/api/historical", historicalHandler);

// Create HTTP server from express app
const server = createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Load Protobuf definitions
loadProtobuf().catch((err) => {
  console.error("Error loading Protobuf:", err);
});

// Start the Kafka consumer (for real-time streaming)
startKafkaConsumer(io).catch((err) => {
  console.error("Error starting Kafka consumer:", err);
});

// Start the HTTP server
const PORT = 7777;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
