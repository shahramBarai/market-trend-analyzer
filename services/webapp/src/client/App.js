import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Combobox from "./components/Combobox";
import ShareInfo from "./components/pages/ShareInfo";

function App() {
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
    <div className="container mx-auto p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Market Data</h2>
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
      {/* Display financial ticks */}
      {value === "" ? (
        <div className="text-center text-gray-500">Select a stock</div>
      ) : (
        <ShareInfo socket={socketRef.current} share={value} />
      )}
    </div>
  );
}

export default App;
