import mypackage.message.{EMAResult, BuyAdvisory}

import org.apache.flink.api.common.state.{ValueState, ValueStateDescriptor}
import org.apache.flink.configuration.Configuration
import org.apache.flink.api.common.functions.RichFlatMapFunction
import org.apache.flink.util.Collector

class CrossoverDetector extends RichFlatMapFunction[EMAResult, BuyAdvisory] {

  private var prevEMA38State: ValueState[Double] = _
  private var prevEMA100State: ValueState[Double] = _

  override def open(parameters: Configuration): Unit = {
    val prevEMA38Descriptor =
      new ValueStateDescriptor[Double]("prevEMA38", classOf[Double])
    val prevEMA100Descriptor =
      new ValueStateDescriptor[Double]("prevEMA100", classOf[Double])

    prevEMA38State = getRuntimeContext.getState(prevEMA38Descriptor)
    prevEMA100State = getRuntimeContext.getState(prevEMA100Descriptor)
  }

  override def flatMap(value: EMAResult, out: Collector[BuyAdvisory]): Unit = {
    val prevEMA38 = Option(prevEMA38State.value()).getOrElse(0.0)
    val prevEMA100 = Option(prevEMA100State.value()).getOrElse(0.0)

    // Check for bullish crossover
    if (value.ema38 > value.ema100 && prevEMA38 <= prevEMA100) {
      out.collect(
        BuyAdvisory(
          symbol = value.symbol,
          timestamp = value.timestamp,
          message = s"Buy!"
        )
      )
    }

    if (value.ema38 < value.ema100 && prevEMA38 >= prevEMA100) {
      out.collect(
        BuyAdvisory(
          symbol = value.symbol,
          timestamp = value.timestamp,
          message = s"Sell!"
        )
      )
    }

    // Update previous EMA values
    prevEMA38State.update(value.ema38)
    prevEMA100State.update(value.ema100)
  }
}
