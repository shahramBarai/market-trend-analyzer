import { loadProtobuf } from "./helpers/protobufLoader.js";
import { startConsumer } from "./services/kafkaService.js";

await loadProtobuf();

await startConsumer();
