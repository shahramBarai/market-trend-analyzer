import { Server } from "socket.io";
import { handleConnection } from "../controllers/socketController.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:1234",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    handleConnection(socket);
  });

  return io;
};

export { initializeSocket };
