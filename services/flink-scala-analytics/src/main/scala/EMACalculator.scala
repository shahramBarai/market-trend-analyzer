import finance.trading.analysis.message.{FinancialTick, EMAResult}
import org.apache.flink.streaming.api.scala.function.ProcessWindowFunction
import org.apache.flink.streaming.api.windowing.windows.TimeWindow
import org.apache.flink.util.Collector
import org.apache.flink.api.common.state.ValueStateDescriptor

class EMACalculator
    extends ProcessWindowFunction[
      FinancialTick, // Input type
      EMAResult, // Output type
      String, // Key type
      TimeWindow // Window type
    ] {

  override def process(
      key: String,
      context: Context,
      elements: Iterable[FinancialTick],
      out: Collector[EMAResult]
  ): Unit = {
    val closePrice =
      elements.last.last.toDouble // Last price event in the window

    // Retrieve previous EMA values or initialize to 0
    val ema38State = context.globalState.getState[Double](
      new ValueStateDescriptor[Double]("ema38", classOf[Double], 0.0)
    )
    val ema100State = context.globalState.getState[Double](
      new ValueStateDescriptor[Double]("ema100", classOf[Double], 0.0)
    )
    val prevEMA38 = ema38State.value()
    val prevEMA100 = ema100State.value()

    // Smoothing factors
    val alpha38 = 2.0 / (1 + 38)
    val alpha100 = 2.0 / (1 + 100)

    // Calculate EMAs
    val ema38 = closePrice * alpha38 + prevEMA38 * (1 - alpha38)
    val ema100 = closePrice * alpha100 + prevEMA100 * (1 - alpha100)

    // Update state
    ema38State.update(ema38)
    ema100State.update(ema100)

    // Output the EMA results
    out.collect(
      EMAResult(
        symbol = key,
        ema38 = ema38,
        ema100 = ema100,
        tradeTimestamp = elements.last.tradeTimestamp
      )
    )
  }
}
