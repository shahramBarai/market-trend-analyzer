import finance.trading.analysis.message.{FinancialTick, BuyAdvisory}
import org.apache.flink.api.common.serialization.{
  DeserializationSchema,
  SerializationSchema
}

import org.apache.flink.api.common.typeinfo.TypeInformation
import java.nio.charset.StandardCharsets

// Protobuf deserializer for FinancialTick
class FinancialTickDeserializer extends DeserializationSchema[FinancialTick] {
  override def deserialize(message: Array[Byte]): FinancialTick = {
    FinancialTick.parseFrom(message)
  }

  override def isEndOfStream(nextElement: FinancialTick): Boolean = false

  override def getProducedType: TypeInformation[FinancialTick] =
    TypeInformation.of(classOf[FinancialTick])
}

// Protobuf serializer for FinancialTick
class ProtobufSerializer extends SerializationSchema[BuyAdvisory] {
  override def serialize(element: BuyAdvisory): Array[Byte] = {
    element.toByteArray
  }
}
