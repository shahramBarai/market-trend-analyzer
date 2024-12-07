import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { LineChardCard } from "./components/Cards";
import Combobox from "./components/Combobox";

function App() {
  /** @typedef {import("socket.io-client").Socket} Socket */
  /** @type {React.MutableRefObject<Socket | null>} */
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    // Connect to the Socket.io server
    socketRef.current = io("/", {
      path: "/api/socket.io",
    });
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

  // Selecting a stock (Combobox)
  const [value, setValue] = React.useState("");

  if (!connected) {
    return <div className="container mx-auto p-4">Connecting...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Market Data</h1>

      {/* Display financial ticks */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold mt-4">Financial Ticks</h2>
          <Combobox
            value={value}
            setValue={setValue}
            items={[
              { label: "IFCSG.FR", value: "IFCSG.FR" },
              { label: "SRP.FR", value: "SRP.FR" },
              { label: "AAPL", value: "AAPL" },
              { label: "GOOGL", value: "GOOGL" },
              { label: "MSFT", value: "MSFT" },
              { label: "AMZN", value: "AMZN" },
              { label: "TSLA", value: "TSLA" },
            ]}
          />
        </div>
        {value === "" ? (
          <div className="text-center text-gray-500">Select a stock</div>
        ) : (
          <LineChardCard
            className="w-full"
            share={value}
            socket={socketRef.current}
          />
        )}
      </div>
    </div>
  );
}

export default App;
