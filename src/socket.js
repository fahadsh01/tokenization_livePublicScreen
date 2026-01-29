
import { io } from "socket.io-client";
const socket = io(
  "https://tokenizationbackend-production.up.railway.app",
  {
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
  }
);

export default socket;
sssssss