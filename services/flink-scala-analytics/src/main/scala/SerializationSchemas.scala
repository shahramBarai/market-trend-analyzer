import finance.trading.analysis.message.{FinancialTick, BuyAdvisory, EMAResult}
import org.apache.flink.api.common.serialization.{
  DeserializationSchema,
  SerializationSchema
}

import org.apache.flink.api.common.typeinfo.TypeInformation
import java.nio.charset.StandardCharsets
import org.apache.flink.streaming.connectors.kafka.KafkaSerializationSchema
import org.apache.kafka.clients.producer.ProducerRecord
import java.lang

// Protobuf deserializer for FinancialTick
class FinancialTickDeserializer extends DeserializationSchema[FinancialTick] {
  override def deserialize(message: Array[Byte]): FinancialTick = {
    FinancialTick.parseFrom(message)
  }

  override def isEndOfStream(nextElement: FinancialTick): Boolean = false

  override def getProducedType: TypeInformation[FinancialTick] =
    TypeInformation.of(classOf[FinancialTick])
}

// Protobuf serializer for EMAResult
class EMAResultSerializer extends KafkaSerializationSchema[EMAResult] {
  var topic: String = null
  def setTopic(topic: String): Unit = {
    this.topic = topic
  }
  def serialize(element: EMAResult, timestamp: lang.Long): ProducerRecord[Array[Byte],Array[Byte]] = {
    new ProducerRecord[Array[Byte], Array[Byte]](this.topic, element.symbol.getBytes(StandardCharsets.UTF_8), element.toByteArray)
  }
}

// Protobuf serializer for BuyAdvisory
class BuyAdvisorySerializer extends KafkaSerializationSchema[BuyAdvisory] {
  var topic: String = null
  def setTopic(topic: String): Unit = {
    this.topic = topic
  }
  def serialize(element: BuyAdvisory, timestamp: lang.Long): ProducerRecord[Array[Byte],Array[Byte]] = {
    new ProducerRecord[Array[Byte], Array[Byte]](this.topic, element.symbol.getBytes(StandardCharsets.UTF_8), element.toByteArray)
  }
}
