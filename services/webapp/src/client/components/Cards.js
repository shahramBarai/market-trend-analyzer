"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  PieChart,
  Pie,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Sector,
  LineChart,
  Line,
} from "recharts";
import { useEffect, useState } from "react";

export const Card = ({ className, title, children }) => {
  return (
    <div
      className={`${className} relative flex flex-col h-96 rounded-xl border shadow-sm bg-white`}
    >
      <div className="p-6 tracking-tight text-sm font-medium">{title}</div>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
};

export const BarChartCard = ({ className, share, socket }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const dataType = "tick";
    const eventName = `${share}-tick`;

    // Subscribe to the share
    socket.emit("subscribe", { share, dataType });

    // Event handler
    const handleData = (newData) => {
      setData((prev) => [...prev, newData]);
    };

    // Listen for data
    socket.on(eventName, handleData);

    // Clean up on unmount
    return () => {
      socket.emit("unsubscribe", { share, dataType });
      socket.off(eventName, handleData);
    };
  }, [share, socket]);

  return (
    <Card className={className} title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 0,
            right: 30,
            left: 5,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={tradingDateTime} />
          <YAxis />
          <Bar dataKey={last} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export const LineChardCard = ({ className = "", share, socket }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dataType = "ema";
    const eventName = `${share}-ema`;

    const fetchHistoricalData = async () => {
      return fetch(`/api/historical?dataType=${dataType}&share=${share}`)
        .then((res) => res.json())
        .then((data) => {
          setData(data.messages);
          setLoading(false);
          console.log("Historical data:", data.messages);
        })
        .catch((err) => console.error(err));
    };

    // Event handler
    const handleData = (newData) => {
      console.log("Received EMA data:", newData);
      setData((prev) => [...prev, newData]);
    };

    fetchHistoricalData().then(() => {
      // Subscribe to the share
      socket.emit("subscribe", { share, dataType });

      // Listen for data
      socket.on(eventName, handleData);
    });

    // Clean up on unmount
    return () => {
      socket.emit("unsubscribe", { share, dataType });
      socket.off(eventName, handleData);
    };
  }, [share, socket]);

  return (
    <Card className={className} title={share}>
      {loading ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data
        </div>
      ) : (
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 0,
            right: 30,
            left: 5,
            bottom: 10,
          }}
        >
          <XAxis dataKey="tradingDateTime" />
          <YAxis />
          <CartesianGrid stroke="#94a3b8" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="ema38" stroke="#1e293b" />
          <Line type="monotone" dataKey="ema100" stroke="#020617" />
        </LineChart>
      )}
    </Card>
  );
};
