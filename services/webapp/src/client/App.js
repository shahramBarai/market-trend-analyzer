import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { LineChardCard } from "./components/Cards";

const SOCKET_SERVER_URL = "http://localhost:3000"; // Adjust to your server URL

function App() {
  /** @typedef {import("socket.io-client").Socket} Socket */
  /** @type {React.MutableRefObject<Socket | null>} */
  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to the Socket.io server
    socketRef.current = io(SOCKET_SERVER_URL);
    socketRef.current.on("connect", () => {
      setConnected(true);
    });
    socketRef.current.on("disconnect", () => {
      setConnected(false);
    });

    // Clean up on component unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  if (!connected) {
    return <div className="container mx-auto p-4">Connecting...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Market Data</h1>

      {/* Display financial ticks */}
      <h2 className="text-xl font-semibold mt-4">Financial Ticks</h2>
      <div className="grid grid-cols-3 grid-rows-1 gap-3">
        <LineChardCard share="ALD.FR" socket={socketRef.current} />
        <LineChardCard share="CS.FR" socket={socketRef.current} />
        <LineChardCard share="STM.FR" socket={socketRef.current} />
      </div>
    </div>
  );
}

export default App;
