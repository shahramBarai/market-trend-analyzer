from pyflink.datastream.execution_mode import RuntimeExecutionMode
from pyflink.datastream import StreamExecutionEnvironment, TimeCharacteristic
from pyflink.datastream.window import TumblingEventTimeWindows, TimeWindow
from pyflink.datastream.connectors.kafka import KafkaSource, KafkaSink
from pyflink.common.serialization import SerializationSchema, DeserializationSchema
from pyflink.common.time import Time
from pyflink.common.typeinfo import TypeInformation
from pyflink.common.watermark_strategy import WatermarkStrategy
import json

# Custom Protobuf-like Deserialization Schema
class ProtobufDeserializer(DeserializationSchema):
    def __init__(self):
        super().__init__()

    def deserialize(self, message: bytes):
        # Simulate Protobuf deserialization (use real Protobuf library if applicable)
        financial_tick = json.loads(message.decode('utf-8'))  # Replace with Protobuf parsing
        return {
            "symbol": financial_tick["symbol"],
            "price": financial_tick["price"],
            "volume": financial_tick["volume"],
            "timestamp": financial_tick["timestamp"]
        }

    def is_end_of_stream(self, next_element):
        return False

    def get_produced_type(self):
        return TypeInformation.of(dict)

# Custom Protobuf-like Serialization Schema
class ProtobufSerializer(SerializationSchema):
    def __init__(self):
        super().__init__()

    def serialize(self, element: dict):
        # Simulate Protobuf serialization (use real Protobuf library if applicable)
        result = json.dumps(element).encode('utf-8')  # Replace with Protobuf serialization
        return result

# Define the Flink Job
def create_job(region: str, input_topic: str, output_topic: str, parallelism: int):
    # Create execution environment
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_parallelism(parallelism)
    env.set_runtime_mode(RuntimeExecutionMode.STREAMING)
    env.set_stream_time_characteristic(TimeCharacteristic.EventTime)

    # Adding the jar to my streming environment.
    env.add_jars("file:////opt/flink/userlib/flink-sql-connector-kafka-3.2.0-1.18.jar")

    # Kafka consumer
    kafka_consumer = KafkaSource.builder() \
        .set_bootstrap_servers("localhost:9092") \
        .set_group_id(f"flink-market-analytics-{region}") \
        .set_topics(input_topic) \
        .set_value_only_deserializer(ProtobufDeserializer()) \
        .build()
        

    # Stream processing
    financial_tick_stream = env.from_source(kafka_consumer, WatermarkStrategy.for_monotonous_timestamps(), f"Kafka Source for {region}")

    # Perform analytics in 1-minute tumbling windows
    def process_window(key, window: TimeWindow, elements, out):
        total_volume = sum(tick["volume"] for tick in elements)
        avg_price = sum(tick["price"] for tick in elements) / len(elements)
        out.collect({
            "symbol": key,
            "avgPrice": avg_price,
            "totalVolume": total_volume,
            "windowEnd": window.get_end()
        })

    analytics_stream = financial_tick_stream.key_by(lambda tick: tick["symbol"]) \
        .window(TumblingEventTimeWindows.of(Time.minutes(1))) \
        .apply(process_window) \

    # Kafka producer properties
    kafka_producer_props = {
        "bootstrap.servers": "localhost:9092",
        "compression.type": "snappy"
    }

    # Kafka producer
    kafka_producer = KafkaSink.builder() \
        .set_topic(output_topic) \
        .set_properties(kafka_producer_props) \
        .set_value_serialization_schema(ProtobufSerializer()) \
        .build()

    # Add sink to Kafka
    analytics_stream.add_sink(kafka_producer)

    # Execute the Flink job
    env.execute(f"Market Analytics Job for Region {region}")

# Main function to define regions
if __name__ == '__main__':
    regions = [
        ("Region1", "FR", "FR-analytics"),
    ]

    for region, input_topic, output_topic in regions:
        create_job(region, input_topic, output_topic, parallelism=4)