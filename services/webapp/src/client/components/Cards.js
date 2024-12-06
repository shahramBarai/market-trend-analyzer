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

const Card = ({ className, title, children }) => {
  return (
    <div
      className={`${className} relative flex flex-col h-64 rounded-xl border shadow-sm bg-black`}
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
    <Card className={className} title={share}>
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
        <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
        <Line type="monotone" dataKey="last" stroke="#8884d8" />
      </LineChart>
    </Card>
  );
};
