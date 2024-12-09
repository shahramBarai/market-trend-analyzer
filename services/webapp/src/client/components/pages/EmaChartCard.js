import { useMemo, useState } from "react";
import { Card, LineChard } from "../ChartCards";
import { Button } from "../Button";

export default function EmaChartCard({ share, data }) {
  const [startTime, setStartTime] = useState(data[0].tradeTimestamp);

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

  // Filter or map your data so it fits into [startTime, endTime] if needed
  // Or just show all data; Recharts will handle points out of domain.
  const filteredData = useMemo(() => {
    return data.filter(
      (d) => d.tradeTimestamp >= startTime && d.tradeTimestamp <= endTime
    );
  }, [data, startTime, endTime]);

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
      <LineChard
        className="text-sm"
        data={filteredData}
        dataKeys={["ema38", "ema100"]}
        xAxisDataKey="tradeTimestamp"
        domain={[startTime, endTime]}
        ticks={ticks}
      />
    </Card>
  );
}
