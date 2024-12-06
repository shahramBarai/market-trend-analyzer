import { Server } from "socket.io";
import { handleConnection } from "../controllers/socketController.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    path: "/api/socket.io",
    cors: {
      origin: "http://localhost:7800", // or your front-end URL
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    handleConnection(socket);
  });

  return io;
};

export { initializeSocket };
