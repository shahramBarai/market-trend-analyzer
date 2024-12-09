"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Tooltip,
} from "recharts";

export const Card = ({ className, title, children }) => {
  return (
    <div
      className={`${className} relative flex flex-col h-96 rounded-xl border shadow-sm bg-white`}
    >
      <div className="p-4 tracking-tight text-sm font-medium">{title}</div>
      {children}
    </div>
  );
};

export const BarChartCard = ({ data, dataKeys, xAxisDataKey }) => {
  return (
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
        <XAxis dataKey={xAxisDataKey} type="number" />
        <YAxis />
        {dataKeys.map((key, index) => (
          <Bar key={index} dataKey={key} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export const LineChard = ({
  className = "",
  data,
  dataKeys,
  xAxisDataKey,
  domain,
  ticks,
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
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
        <CartesianGrid stroke="#94a3b8" strokeDasharray="5 5" />
        <Tooltip
          labelFormatter={(time) => {
            const d = new Date(time);
            return d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }}
          formatter={(value) => value.toFixed(2)}
        />
        <XAxis
          dataKey={xAxisDataKey}
          type="number"
          domain={domain}
          ticks={ticks}
          tickFormatter={(time) => {
            const d = new Date(time);
            return d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }}
          scale="time"
        />
        <YAxis />
        {dataKeys.map((key, index) => (
          <Line key={index} type="monotone" dataKey={key} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
