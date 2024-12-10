import { useEffect, useMemo, useState } from "react";
import { Card, ResponsiveLineChart } from "../ChartCards";
import { Button } from "../Button";

export default function EmaChartCard({ share, data }) {
  const [startTime, setStartTime] = useState(
    (data[data.length - 1]?.tradeTimestamp ?? new Date().getTime()) -
      15 * 60 * 1000
  );

  // 1 hour window = 3600 seconds = 3600 * 1000 ms = 3600000 ms
  const windowDuration = 3600000;
  const endTime = startTime + windowDuration;

  // Generate ticks every 5 minutes within the one-hour window
  const ticks = useMemo(() => {
    const ticksArray = [];
    const fiveMin = 5 * 60 * 1000; // 5 minutes in ms
    for (let t = startTime; t <= endTime; t += fiveMin) {
      ticksArray.push(t);
    }
    return ticksArray;
  }, [startTime, endTime]);

  const shiftLeft = () => {
    // Move start time left by 15 minutes
    setStartTime((prev) => prev - 15 * 60 * 1000);
  };

  const shiftRight = () => {
    // Move start time right by 15 minutes
    setStartTime((prev) => prev + 15 * 60 * 1000);
  };

  return (
    <Card className="w-2/3" title={`${share} - EMA`}>
      <div className="absolute flex gap-0 top-3 right-6">
        <Button size="sm" variant="outline" onClick={shiftLeft}>
          -15 min
        </Button>
        <Button size="sm" variant="outline" onClick={shiftRight}>
          +15 min
        </Button>
      </div>
      <ResponsiveLineChart
        className="text-sm"
        data={data}
        dataKeys={["ema38", "ema100"]}
        xAxisDataKey="tradeTimestamp"
        domain={[startTime, endTime]}
        ticks={ticks}
      />
    </Card>
  );
}
