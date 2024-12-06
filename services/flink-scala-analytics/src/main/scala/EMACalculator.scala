import finance.trading.analysis.message.{FinancialTick, EMAResult}

import org.apache.flink.api.common.state.{ValueState, ValueStateDescriptor}
import org.apache.flink.configuration.Configuration
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction
import org.apache.flink.streaming.api.scala.function.RichWindowFunction
import org.apache.flink.streaming.api.windowing.windows.TimeWindow
import org.apache.flink.util.Collector

class EMACalculator
    extends RichWindowFunction[
      FinancialTick, // Input type
      EMAResult, // Output type
      String, // Key type
      TimeWindow // Window type
    ] {

  private var ema38State: ValueState[Double] = _
  private var ema100State: ValueState[Double] = _

  override def open(parameters: Configuration): Unit = {
    val ema38Descriptor =
      new ValueStateDescriptor[Double]("ema38", classOf[Double])
    val ema100Descriptor =
      new ValueStateDescriptor[Double]("ema100", classOf[Double])

    ema38State = getRuntimeContext.getState(ema38Descriptor)
    ema100State = getRuntimeContext.getState(ema100Descriptor)
  }

  override def apply(
      key: String,
      window: TimeWindow,
      input: Iterable[FinancialTick],
      out: Collector[EMAResult]
  ): Unit = {
    val closePrice = input.last.last.toDouble // Last price event in the window

    // Retrieve previous EMA values or initialize to 0
    val prevEMA38 = Option(ema38State.value()).getOrElse(0.0)
    val prevEMA100 = Option(ema100State.value()).getOrElse(0.0)

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
        tradeTimestamp = input.last.tradeTimestamp
      )
    )
  }
}
