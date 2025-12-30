import { Server } from "socket.io";
import {io} from "socket.io-client";
const socket = io("http://localhost:8097");
export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5175",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    socket.on("joinProject", (projectId) => {
      socket.join(projectId);
    });

    socket.on("sendMessage", ({ projectId, message }) => {
      io.to(projectId).emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
export default socket;