import finance.trading.analysis.message.FinancialTick

import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor
import org.apache.flink.streaming.api.windowing.time.Time
import java.time.Instant
import org.slf4j.{Logger, LoggerFactory}

class FinancialTickTimestampExtractor
    extends BoundedOutOfOrdernessTimestampExtractor[FinancialTick](
      Time.seconds(10)
    ) {
  private val logger: Logger = LoggerFactory.getLogger("FinancialTickTimestampExtractor")

  override def extractTimestamp(element: FinancialTick): Long = {
    try {
      val timestamp = element.tradeTimestamp match {
        case None => throw new Exception("Missing timestamp")
        case Some(timestamp) => Instant.ofEpochSecond(timestamp.seconds, timestamp.nanos).toEpochMilli
      }
      timestamp
    } catch {
      case e: Exception =>
        logger.error(s"Failed to extract timestamp from FinancialTick: ${element.toString}", e)
        0L
    }
  }
}
