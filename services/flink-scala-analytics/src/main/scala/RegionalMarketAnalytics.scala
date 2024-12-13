import finance.trading.analysis.message.{FinancialTick, EMAResult, BuyAdvisory}

import org.apache.flink.api.common.ExecutionConfig;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows
import org.apache.flink.streaming.api.windowing.time.Time
import java.time.{LocalDateTime, ZoneOffset}
import java.time.format.DateTimeFormatter
import org.slf4j.{Logger, LoggerFactory}
import org.apache.flink.streaming.api.CheckpointingMode
import java.util.Optional
import org.apache.flink.streaming.connectors.kafka.partitioner.FlinkKafkaPartitioner
import org.apache.flink.api.java.utils.ParameterTool
import org.apache.flink.connector.jdbc.{
  JdbcConnectionOptions,
  JdbcStatementBuilder,
  JdbcSink
}
import java.time.Instant
import org.apache.flink.streaming.api.environment.CheckpointConfig
import org.apache.flink.configuration.CheckpointingOptions

object RegionalMarketAnalytics {
  val timescaleDBUrl = "jdbc:postgresql://timescaledb:5432/analytics"
  val timescaleDBUser = "postgres"
  val timescaleDBPassword = "password"

  def main(args: Array[String]): Unit = {
    val logger: Logger = LoggerFactory.getLogger("RegionalMarketAnalytics")
    val params = ParameterTool.fromArgs(args)

    val region = params.getRequired("region")
    val inputTopic = params.getRequired("inputTopic")
    val outputTopic_EMA = params.getRequired("outputTopicEMA")
    val outputTopic_BuyAdvisory = params.getRequired("outputTopicBuyAdvisory")
    val parallelism = params.getInt("parallelism", 1)
    val kafkaBrokers = params.get("kafkaBrokers", "kafka:9092")

    logger.info(
      s"Creating $region market analytics job with parallelism $parallelism"
    )

    createJob(
      region,
      inputTopic,
      outputTopic_EMA,
      outputTopic_BuyAdvisory,
      parallelism,
      kafkaBrokers
    )
  }

  def createJob(
      region: String,
      inputTopic: String,
      outputTopic_EMA: String,
      outputTopic_BuyAdvisory: String,
      parallelism: Int,
      kafkaBrokers: String
  ): Unit = {
    val logger: Logger = LoggerFactory.getLogger("RegionalMarketAnalytics")
    logger.info(s"Creating job for $region with parallelism $parallelism")

    // Setup Flink execution environment, event time, and parallelism
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime)
    env.setParallelism(parallelism)
    env.enableCheckpointing(5000)
    env.getCheckpointConfig.setCheckpointingMode(
      CheckpointingMode.EXACTLY_ONCE
    )
    env.getCheckpointConfig.setCheckpointTimeout(600000)
    env.getCheckpointConfig.setMinPauseBetweenCheckpoints(1000)
    env.getCheckpointConfig.setMaxConcurrentCheckpoints(1)
    env.getCheckpointConfig.setExternalizedCheckpointCleanup(
      CheckpointConfig.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION
    )
    val config = new Configuration();
    config.set(CheckpointingOptions.CHECKPOINT_STORAGE, "filesystem");
    config.set(
      CheckpointingOptions.CHECKPOINTS_DIRECTORY,
      "file:///tmp/flink-checkpoints"
    );
    env.configure(config);

    // Kafka consumer properties
    val kafkaConsumerProps = new java.util.Properties()
    kafkaConsumerProps.put(
      ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,
      kafkaBrokers
    )
    kafkaConsumerProps.put(
      ConsumerConfig.GROUP_ID_CONFIG,
      s"flink-market-analytics-$region"
    )

    // Create Kafka consumer with Protobuf deserializer
    val kafkaConsumer = new FlinkKafkaConsumer[FinancialTick](
      inputTopic,
      new FinancialTickDeserializer(),
      kafkaConsumerProps
    )

    // Parse Market Tick Data
    val FinancialTickStream = env
      .addSource(kafkaConsumer)
      .setParallelism(1)
      .name("Kafka Source")
      .assignTimestampsAndWatermarks(new FinancialTickTimestampExtractor())
      .name("Timestamps and Watermarks")

    // Set up 5-minute tumbling windows starting at midnight
    val windowSize = Time.minutes(1)
    val windowOffset = Time.hours(0) // Adjust if needed

    // Compute EMA for each symbol
    val emaStream = FinancialTickStream
      .keyBy(_.id)
      .window(TumblingEventTimeWindows.of(windowSize, windowOffset))
      .process(new EMACalculator)
      .setParallelism(parallelism)
      .name("Tumbling Window EMA Calculator")

    // Kafka producer properties for EMAs
    val emaProducerProps = new java.util.Properties()
    emaProducerProps.put(
      ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
      kafkaBrokers
    )
    emaProducerProps.put(
      ProducerConfig.TRANSACTION_TIMEOUT_CONFIG,
      "900000"
    )
    emaProducerProps.put(
      ProducerConfig.COMPRESSION_TYPE_CONFIG,
      "snappy"
    )

    // Create Kafka producer for EMA results
    val emaSerializer = new EMAResultSerializer()
    emaSerializer.setTopic(outputTopic_EMA)
    val emaProducer = new FlinkKafkaProducer[EMAResult](
      outputTopic_EMA,
      emaSerializer,
      emaProducerProps,
      FlinkKafkaProducer.Semantic.EXACTLY_ONCE,
      FlinkKafkaProducer.DEFAULT_KAFKA_PRODUCERS_POOL_SIZE
    )

    // Add sink to Kafka for EMA results
    emaStream.addSink(emaProducer).setParallelism(1).name("EMA Kafka Sink")

    // Define JDBC Sink for EMA Results
    val emaJdbcSink = JdbcSink.sink[EMAResult](
      """
        INSERT INTO ema_results (symbol, ema38, ema100, trade_timestamp)
        VALUES (?, ?, ?, ?) ON CONFLICT (symbol, trade_timestamp) DO NOTHING
      """,
      new JdbcStatementBuilder[EMAResult] {
        override def accept(
            statement: java.sql.PreparedStatement,
            record: EMAResult
        ): Unit = {
          record.tradeTimestamp match {
            case Some(timestamp) => {
              statement.setString(1, record.symbol)
              statement.setDouble(2, record.ema38)
              statement.setDouble(3, record.ema100)
              statement.setTimestamp(
                4,
                java.sql.Timestamp.from(
                  Instant.ofEpochSecond(timestamp.seconds, timestamp.nanos)
                )
              )
            }
            case None => {
              // Should not happen if the EMACalculator is timestamping records
              logger.warn(
                s"Skipping EMA record: Missing trade timestamp for symbol: ${record.symbol}"
              )
            }
          }
        }
      },
      new JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
        .withUrl(timescaleDBUrl)
        .withDriverName("org.postgresql.Driver")
        .withUsername(timescaleDBUser)
        .withPassword(timescaleDBPassword)
        .build()
    )

    // Add sink to TimescaleDB for EMA results
    emaStream.addSink(emaJdbcSink).setParallelism(1).name("EMA JDBC Sink")

    // Detect crossovers and generate buy advisories
    val buyAdvisoryStream = emaStream
      .keyBy(_.symbol)
      .flatMap(new CrossoverDetector)
      .name("Crossover Detector")
      .setParallelism(parallelism)

    // Kafka producer properties for EMAs
    val buyAdvisoryProducerProps = new java.util.Properties()
    buyAdvisoryProducerProps.put(
      ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
      kafkaBrokers
    )
    buyAdvisoryProducerProps.put(
      ProducerConfig.TRANSACTION_TIMEOUT_CONFIG,
      "900000"
    )
    buyAdvisoryProducerProps.put(
      ProducerConfig.COMPRESSION_TYPE_CONFIG,
      "snappy"
    )

    // Create Kafka producer for buy advisories
    val buyAdvisorySerializer = new BuyAdvisorySerializer()
    buyAdvisorySerializer.setTopic(outputTopic_BuyAdvisory)
    val buyAdvisoryProducer = new FlinkKafkaProducer[BuyAdvisory](
      outputTopic_BuyAdvisory,
      buyAdvisorySerializer,
      buyAdvisoryProducerProps,
      FlinkKafkaProducer.Semantic.EXACTLY_ONCE,
      FlinkKafkaProducer.DEFAULT_KAFKA_PRODUCERS_POOL_SIZE
    )

    // Add sink to Kafka for buy advisories
    buyAdvisoryStream
      .addSink(buyAdvisoryProducer)
      .setParallelism(1)
      .name("Buy Advisory Kafka Sink")

    // Define JDBC Sink for Buy Advisories
    val buyAdvisoryJdbcSink = JdbcSink.sink[BuyAdvisory](
      """
        INSERT INTO buy_advisories (symbol, trade_timestamp, advice)
        VALUES (?, ?, ?) ON CONFLICT (symbol, trade_timestamp) DO NOTHING
      """,
      new JdbcStatementBuilder[BuyAdvisory] {
        override def accept(
            statement: java.sql.PreparedStatement,
            record: BuyAdvisory
        ): Unit = {
          record.tradeTimestamp match {
            case Some(timestamp) => {
              statement.setString(1, record.symbol)
              statement.setTimestamp(
                2,
                java.sql.Timestamp.from(
                  Instant.ofEpochSecond(timestamp.seconds, timestamp.nanos)
                )
              )
              statement.setString(3, record.message)
            }
            case None => {
              // Should not happen if the EMACalculator is timestamping records
              logger.warn(
                s"Skipping advisory record: Missing trade timestamp for symbol: ${record.symbol}"
              )
            }
          }
        }
      },
      new JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
        .withUrl(timescaleDBUrl)
        .withDriverName("org.postgresql.Driver")
        .withUsername(timescaleDBUser)
        .withPassword(timescaleDBPassword)
        .build()
    )

    // Add sink to TimescaleDB for buy advisories
    buyAdvisoryStream
      .addSink(buyAdvisoryJdbcSink)
      .setParallelism(1)
      .name("Buy Advisory JDBC Sink")

    // Execute the Flink job
    env.execute(s"Market Analytics Job for Region $region")
  }
}
