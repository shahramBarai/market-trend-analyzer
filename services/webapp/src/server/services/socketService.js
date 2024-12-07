import { Server } from "socket.io";
import { handleConnection } from "../controllers/socketController.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    handleConnection(socket);
  });

  return io;
};

export { initializeSocket };
