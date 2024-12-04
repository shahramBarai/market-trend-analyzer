import mypackage.message.FinancialTick

import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor
import org.apache.flink.streaming.api.windowing.time.Time
import java.time.format.DateTimeFormatter
import java.time.{LocalDateTime, ZoneOffset}

class FinancialTickTimestampExtractor
    extends BoundedOutOfOrdernessTimestampExtractor[FinancialTick](
      Time.seconds(10)
    ) {

  @transient private lazy val formatter =
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")

  override def extractTimestamp(element: FinancialTick): Long = {
    try {
      val localDateTime =
        LocalDateTime.parse(element.tradingDateTime, formatter)
      val timestamp = localDateTime.toInstant(ZoneOffset.UTC).toEpochMilli
      timestamp
    } catch {
      case e: Exception =>
        println(
          s"Error parsing timestamp '${element.tradingDateTime}': ${e.getMessage}"
        )
        0L
    }
  }
}
