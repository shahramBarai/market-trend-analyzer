import org.apache.flink.api.scala._
import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer
import org.apache.flink.api.common.serialization.SimpleStringSchema
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig
import org.apache.flink.streaming.api.windowing.time.Time
import org.apache.flink.util.Collector
import org.apache.flink.api.common.serialization.{
  DeserializationSchema,
  SerializationSchema
}
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.scala.createTypeInformation
import mypackage.message.{FinancialTick, AnalyticsResult}
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor

import java.time.format.{DateTimeFormatter, DateTimeFormatterBuilder}
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.temporal.ChronoField

object RegionalMarketAnalytics {
  // Custom Protobuf deserializer for Kafka
  class ProtobufDeserializer extends DeserializationSchema[FinancialTick] {
    override def deserialize(message: Array[Byte]): FinancialTick = {
      FinancialTick.parseFrom(message)
    }

    override def isEndOfStream(nextElement: FinancialTick): Boolean = false

    override def getProducedType: TypeInformation[FinancialTick] =
      TypeInformation.of(classOf[FinancialTick])
  }

  // Custom Protobuf serializer for Kafka
  class ProtobufSerializer extends SerializationSchema[AnalyticsResult] {
    override def serialize(element: AnalyticsResult): Array[Byte] = {
      element.toByteArray
    }
  }

  // Define the named timestamp extractor class
  class FinancialTickTimestampExtractor
      extends BoundedOutOfOrdernessTimestampExtractor[FinancialTick](
        Time.seconds(10)
      ) {

    @transient private lazy val formatter = new DateTimeFormatterBuilder()
      .appendPattern("yyyy-MM-dd HH:mm:ss")
      .optionalStart()
      .appendLiteral('.')
      .appendFraction(ChronoField.NANO_OF_SECOND, 1, 9, true)
      .optionalEnd()
      .toFormatter()

    override def extractTimestamp(element: FinancialTick): Long = {
      try {
        val localDateTime =
          LocalDateTime.parse(element.tradingDateTime, formatter)
        val timestamp = localDateTime.toInstant(ZoneOffset.UTC).toEpochMilli
        timestamp
      } catch {
        case e: Exception =>
          // Log the error and handle it appropriately
          println(
            s"Error parsing timestamp '${element.tradingDateTime}': ${e.getMessage}"
          )
          0L // Return a default timestamp or handle as needed
      }
    }

  }

  def createJob(
      region: String,
      inputTopic: String,
      outputTopic: String,
      parallelism: Int
  ): Unit = {
    // Setup Flink execution environment, event time, and parallelism
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime)
    env.setParallelism(parallelism)

    // Kafka consumer properties
    val kafkaConsumerProps = new java.util.Properties()
    kafkaConsumerProps.put(
      ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,
      "kafka:9092"
    )
    kafkaConsumerProps.put(
      ConsumerConfig.GROUP_ID_CONFIG,
      s"flink-market-analytics-$region"
    )

    // Create Kafka consumer with Protobuf deserializer
    val kafkaConsumer = new FlinkKafkaConsumer[FinancialTick](
      inputTopic,
      new ProtobufDeserializer(),
      kafkaConsumerProps
    )

    // Parse Market Tick Data
    val FinancialTickStream = env
      .addSource(kafkaConsumer)
      .assignTimestampsAndWatermarks(new FinancialTickTimestampExtractor())

    // Perform analytics in 1-minute tumbling windows
    val analyticsStream = FinancialTickStream
      .keyBy(_.id)
      .timeWindow(Time.minutes(1))
      .apply { (key, window, input, out: Collector[AnalyticsResult]) =>
        // convert .last to a double and sum all prices
        val totalVolume = input.map(_.last).map(_.toDouble).sum
        val avgPrice = totalVolume / input.size
        out.collect(
          AnalyticsResult(
            key,
            avgPrice.toString,
            totalVolume.toString,
            window.getEnd.toString
          )
        )
      }

    // Kafka producer properties
    val kafkaProducerProps = new java.util.Properties()
    kafkaProducerProps.put(
      ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
      "kafka:9092"
    )
    kafkaProducerProps.put(
      "compression.type",
      "snappy"
    )

    // Create Kafka producer with Protobuf serializer
    val kafkaProducer = new FlinkKafkaProducer[AnalyticsResult](
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
      ("Region1", "FR", "FR-analytics")
    )

    regions.foreach { case (region, inputTopic, outputTopic) =>
      createJob(region, inputTopic, outputTopic, parallelism = 1)
    }
  }
}
