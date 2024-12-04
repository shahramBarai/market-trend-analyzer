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

mod mypackage {
    include!(concat!(env!("OUT_DIR"), "/mypackage.rs"));
}
use mypackage::FinancialTick;
use prost::Message as ProtoMassage;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut fin_tick_source = CSVSource::new(100);

    let topic = "08-11-2021 17:00:00";
    let mut receiver = fin_tick_source.subscribe(topic).await?;
    let time_offset = fin_tick_source.csv_get_time_offset();

    let mut skipped = 0;

    let producer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9094")
        .set("message.timeout.ms", "5000")
        .set("compression.type", "snappy")
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

        let milliseconds = record.trading_date_time.and_utc().timestamp_subsec_millis();
        let trading_date_time_str = format!(
            "{}.{:03}",
            record.trading_date_time.format("%Y-%m-%d %H:%M:%S"),
            milliseconds
        );

        let protobuf_message = FinancialTick {
            id: record.id,
            sec_type: record.sec_type,
            last: record.last,
            trading_date_time: trading_date_time_str,
        };

        let mut buf = Vec::new();
        protobuf_message.encode(&mut buf)?; // Serialize to bytes

        // Split `record.id` into `share_name` and `region`
        let parts: Vec<&str> = protobuf_message.id.split('.').collect();
        //let share_name = parts[0];
        let region = parts[1];

        let produce_future = producer.send(
            FutureRecord::to(&region)
                .key(&protobuf_message.id)
                .payload(&buf),
            Duration::from_secs(0),
        );

        match produce_future.await {
            Ok(delivery) => println!(
                "Sent [t:{}, d:{}ms, s:{}]: {:?}",
                record.trading_date_time,
                delay.num_milliseconds(),
                skipped,
                delivery
            ),
            Err((e, _)) => println!("Error: {:?}", e),
        }
    }

    Ok(())
}
