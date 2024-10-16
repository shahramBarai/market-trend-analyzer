mod financial_tick_source;

use std::time::Duration;

use chrono::Utc;
use financial_tick_source::{CSVSource, FinTickSource, Message};

use rdkafka::config::ClientConfig;
use rdkafka::consumer::stream_consumer::StreamConsumer;
use rdkafka::consumer::Consumer;
use rdkafka::message::{BorrowedMessage, OwnedMessage};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::Message as KafkaMessage;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct JsonMessage{
    id: String,
    sec_type: String,
    last: String,
    trading_date_time: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut fin_tick_source = CSVSource::new(100);

    let topic = "08-11-2021 17:00:00";
    let mut receiver = fin_tick_source.subscribe(topic).await?;
    let time_offset = fin_tick_source.get_time_offset();

    let mut skipped = 0;

    let mut producer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9094")
        .set("message.timeout.ms", "5000")
        .create::<FutureProducer>()?;

    while let Some(record) = receiver.recv().await {
        let record = match record {
            Some(record) => record,
            None => {
                skipped += 1;
                continue;
            }
        };
        let current_time = Utc::now().naive_utc() + time_offset;
        let delay = current_time.signed_duration_since(record.trading_date_time);

        let json_message = JsonMessage {
            id: record.id,
            sec_type: record.sec_type,
            last: record.last,
            trading_date_time: record.trading_date_time.to_string(),
        };

        let json_message_str = serde_json::to_string(&json_message)?;

        let produce_future = producer.send(
            FutureRecord::to("financial_ticks")
                .key(&json_message.id)
                .payload(&json_message_str),
            Duration::from_secs(0),
        );

        match produce_future.await {
            Ok(delivery) => println!("Sent [t:{}, d:{}ms, s:{}]: {:?}", record.trading_date_time, delay.num_milliseconds(), skipped, delivery),
            Err((e, _)) => println!("Error: {:?}", e),
        }
    }

    Ok(())
}
