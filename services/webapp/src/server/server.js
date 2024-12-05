import { createServer } from "http";
import { initializeSocket } from "./services/socketService.js";
import { loadProtobuf } from "./helpers/protobufLoader.js";
import { startKafkaConsumer } from "./services/kafkaService.js";

// Create an HTTP server
const server = createServer();

// Initialize Socket.io
const io = initializeSocket(server);

// Load Protobuf definitions
loadProtobuf().catch((err) => {
  console.error("Error loading Protobuf:", err);
});

// Start the Kafka consumer
startKafkaConsumer(io).catch((err) => {
  console.error("Error starting Kafka consumer:", err);
});

// Start the HTTP server
const PORT = process.env.SERVER_PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
