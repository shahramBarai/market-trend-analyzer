import { Card, LineChard } from "../ChartCards";
import { useEffect, useState } from "react";

export default function ShareInfo({ socket, share }) {
  const [ticksData, setTicksData] = useState([]);
  const [emaData, setEmaData] = useState([]);
  const [advisoryData, setAdvisoryData] = useState([]);
  const [emaLoading, setEmaLoading] = useState(true);
  const [ticksLoading, setTicksLoading] = useState(true);
  const [advisoryLoading, setAdvisoryLoading] = useState(true);

  const fetchHistoricalData = async (dataType) => {
    return fetch(`/api/historical?dataType=${dataType}&share=${share}`)
      .then((res) => res.json())
      .then((data) => {
        return data.messages.map((message) => {
          const tradeTimestamp = new Date(
            message.tradeTimestamp.seconds * 1000
          );
          const hours = tradeTimestamp.getHours();
          const minutes = tradeTimestamp.getMinutes();

          return {
            ...message,
            tradeTimestamp: `${hours < 10 ? "0" + hours : hours}:${
              minutes < 10 ? "0" + minutes : minutes
            }`,
          };
        });
      });
  };

  const handleEmaStreamData = (newData) => {
    console.log("Received EMA data:", newData);
    setEmaData((prev) => [...prev, newData]);
  };

  const handleAdvisoryStreamData = (newData) => {
    console.log("Received advisory data:", newData);
    setAdvisoryData((prev) => [...prev, newData]);
  };

  const handleTicksStreamData = (newData) => {
    console.log("Received ticks data:", newData);
    setTicksData((prev) => {
      if (prev.length === 0) {
        return [newData];
      }
      if (prev.length === 1) {
        return [prev[0], newData];
      }
      return [prev[1], newData];
    });
  };

  useEffect(() => {
    fetchHistoricalData("ema")
      .then((data) => {
        console.log("Historical EMA data:", data);

        setEmaData(data);
        setEmaLoading(false);

        // Subscribe to ema steams data
        socket.emit("subscribe", { share, dataType: "ema" });
        socket.on(`${share}-ema`, handleEmaStreamData);
      })
      .catch((err) => console.error(err));

    fetchHistoricalData("advisories")
      .then((data) => {
        console.log("Historical advisory data:", data);

        setAdvisoryData(data);
        setAdvisoryLoading(false);

        // Subscribe to advisory steams data
        socket.emit("subscribe", { share, dataType: "advisories" });
        socket.on(`${share}-advisories`, handleAdvisoryStreamData);
      })
      .catch((err) => console.error(err));

    // Subscribe to ticks steams data
    socket.emit("subscribe", { share, dataType: "ticks" });
    socket.on(`${share}-ticks`, handleTicksStreamData);

    // Clean up on unmount
    return () => {
      socket.emit("unsubscribe", { share, dataType: "ema" });
      socket.off(`${share}-ema`, handleEmaStreamData);
      socket.emit("unsubscribe", { share, dataType: "advisories" });
      socket.off(`${share}-advisories`, handleAdvisoryStreamData);
    };
  }, [share, socket]);

  return (
    <div className="flex gap-3">
      <Card className="w-2/3" title={`${share} - EMA`}>
        {emaLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading...
          </div>
        ) : emaData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data
          </div>
        ) : (
          <LineChard
            className="text-sm"
            data={emaData}
            dataKeys={["ema38", "ema100"]}
            xAxisDataKey="tradeTimestamp"
          />
        )}
      </Card>
      <div className="w-1/3 flex flex-col gap-3">
        <div className="h-20 rounded-xl border shadow-sm p-4 flex items-center justify-between text-sm">
          <div className="tracking-tight font-medium">
            {share} - Last Price:
          </div>
          {ticksData.length === 0 ? (
            <div
              className={`w-1/2 h-full rounded-lg flex items-center justify-center text-gray-500 bg-gray-100`}
            >
              no data
            </div>
          ) : (
            <div
              className={`w-1/2 h-full rounded-lg flex items-center justify-center
                ${
                  ticksData.length < 2
                    ? "text-black bg-gray-100"
                    : ticksData[ticksData.length - 1].last <
                      ticksData[ticksData.length - 2].last
                    ? "text-red-800 bg-red-100"
                    : ticksData[ticksData.length - 1].last >
                      ticksData[ticksData.length - 2].last
                    ? "text-green-800 bg-green-100"
                    : "text-black bg-gray-100"
                }`}
            >
              {ticksData[ticksData.length - 1].last}
            </div>
          )}
        </div>
        <Card className="h-full" title={`${share} - Advisories`}>
          {advisoryLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading...
            </div>
          ) : advisoryData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data
            </div>
          ) : (
            <div className="isolate overflow-auto snap-end p-4 pt-0 text-sm">
              {advisoryData.map((advisory, index) => (
                <div key={index} className="flex gap-2">
                  <div className="text-gray-500">{advisory.tradeTimestamp}</div>
                  <div
                    className={`${
                      advisory.message === "Buy!"
                        ? "text-green-800 font-semibold"
                        : advisory.message === "Sell!"
                        ? "text-red-800 font-semibold"
                        : "text-gray-800"
                    }`}
                  >
                    {advisory.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
