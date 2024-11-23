import org.apache.flink.api.common.serialization.{DeserializationSchema, SerializationSchema}
import org.apache.flink.api.scala._
import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer
import org.apache.flink.api.common.serialization.SimpleStringSchema
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig
import org.apache.flink.streaming.api.windowing.time.Time
import org.apache.flink.util.Collector
import org.apache.flink.api.common.typeinfo.TypeInformation
import mypackage.{FinancialTick, AnalyticsResult} // Import generated Protobuf classes

object RegionalMarketAnalytics {

  case class FinancialTickData(symbol: String, price: Double, volume: Int, timestamp: Long)
  case class AnalyticsResultData(symbol: String, avgPrice: Double, totalVolume: Int, windowEnd: Long)

  // Custom Protobuf deserializer for Kafka
  class ProtobufDeserializer extends DeserializationSchema[FinancialTickData] {
    override def deserialize(message: Array[Byte]): FinancialTickData = {
      val financialTick = FinancialTick.parseFrom(message)
      FinancialTickData(
        financialTick.symbol,
        financialTick.price,
        financialTick.volume,
        financialTick.timestamp
      )
    }

    override def isEndOfStream(nextElement: FinancialTickData): Boolean = false

    override def getProducedType: TypeInformation[FinancialTickData] = 
      TypeInformation.of(classOf[FinancialTickData])
  }

  // Custom Protobuf serializer for Kafka
  class ProtobufSerializer extends SerializationSchema[AnalyticsResultData] {
    override def serialize(element: AnalyticsResultData): Array[Byte] = {
      val result = AnalyticsResult.newBuilder()
        .setSymbol(element.symbol)
        .setAvgPrice(element.avgPrice)
        .setTotalVolume(element.totalVolume)
        .setWindowEnd(element.windowEnd)
        .build()
      result.toByteArray
    }
  }

  def createJob(region: String, inputTopic: String, outputTopic: String, parallelism: Int): Unit = {
    // Setup Flink execution environment
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    env.setParallelism(parallelism)

    // Kafka consumer properties
    val kafkaConsumerProps = new java.util.Properties()
    kafkaConsumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092")
    kafkaConsumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, s"flink-market-analytics-$region")
    kafkaConsumerProps.put("compression.type", "snappy") // Enable Snappy compression

    // Create Kafka consumer with Protobuf deserializer
    val kafkaConsumer = new FlinkKafkaConsumer[FinancialTickData](
      inputTopic,
      new ProtobufDeserializer(),
      kafkaConsumerProps
    )

    // Parse Market Tick Data
    val FinancialTickStream = env
      .addSource(kafkaConsumer)
      .keyBy(_.symbol)

    // Perform analytics in 1-minute tumbling windows
    val analyticsStream = FinancialTickStream
      .timeWindow(Time.minutes(1))
      .apply { (key, window, input, out: Collector[AnalyticsResultData]) =>
        val totalVolume = input.map(_.volume).sum
        val avgPrice = input.map(_.price).sum / input.size
        out.collect(AnalyticsResultData(key, avgPrice, totalVolume, window.getEnd))
      }

    // Kafka producer properties
    val kafkaProducerProps = new java.util.Properties()
    kafkaProducerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092")
    kafkaProducerProps.put("compression.type", "snappy") // Enable Snappy compression

    // Create Kafka producer with Protobuf serializer
    val kafkaProducer = new FlinkKafkaProducer[AnalyticsResultData](
      outputTopic,
      new ProtobufSerializer(),
      kafkaProducerProps
    )

    // Add sink to Kafka
    analyticsStream.addSink(kafkaProducer)

    // Execute the Flink job
    env.execute(s"Market Analytics Job for Region $region")
  }

  def main(args: Array[String]): Unit = {
    // Define regional jobs
    val regions = Seq(
      ("Region1", "FR", "FR-analytics"),
    )

    regions.foreach { case (region, inputTopic, outputTopic) =>
      createJob(region, inputTopic, outputTopic, parallelism = 4)
    }
  }
}
