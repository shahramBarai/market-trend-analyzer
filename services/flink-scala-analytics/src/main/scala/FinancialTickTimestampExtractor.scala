import finance.trading.analysis.message.FinancialTick

import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor
import org.apache.flink.streaming.api.windowing.time.Time
import java.time.Instant

class FinancialTickTimestampExtractor
    extends BoundedOutOfOrdernessTimestampExtractor[FinancialTick](
      Time.seconds(10)
    ) {

  override def extractTimestamp(element: FinancialTick): Long = {
    try {
      val timestamp = element.tradeTimestamp match {
        case None => throw new Exception("Missing timestamp")
        case Some(timestamp) => Instant.ofEpochSecond(timestamp.seconds, timestamp.nanos).toEpochMilli
      }
      timestamp
    } catch {
      case e: Exception =>
        println(
          s"Error parsing timestamp '${element.tradeTimestamp}': ${e.getMessage}"
        )
        0L
    }
  }
}
