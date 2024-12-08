mod financial_tick_source;

use std::sync::Arc;

use chrono::Utc;
use financial_tick_source::{CSVSource, FinTickSource};

use futures::lock::Mutex;
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};

use tokio::io::{self, AsyncWriteExt, BufWriter};
use tokio::time::{Duration, Instant};

use prost::Message;
use std::env;

fn timestamp_diff_ms(t1: prost_types::Timestamp, t2: prost_types::Timestamp) -> i64 {
    let t1 = t1.seconds * 1000 + i64::from(t1.nanos) / 1_000_000;
    let t2 = t2.seconds * 1000 + i64::from(t2.nanos) / 1_000_000;
    t1 - t2
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut fin_tick_source = CSVSource::new(100);

    let topic = "FR/08-11-2021 17:34:00";
    let mut receiver = fin_tick_source.subscribe(topic).await?;
    let time_offset = fin_tick_source.csv_get_time_offset();

    let mut skipped = 0;

    let kafka_brokers = env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9094".to_string());

    let producer = ClientConfig::new()
        .set("bootstrap.servers", kafka_brokers.as_str())
        .set("message.timeout.ms", "5000")
        .set("compression.type", "snappy")
        .create::<FutureProducer>()?;

    let batch_duration = Duration::from_secs(1); // Time limit for batching
    let mut last_flush_time = Instant::now();

    let stdout = io::stdout();
    let writer = Arc::new(Mutex::new(BufWriter::new(stdout)));

    while let Some(record) = receiver.recv().await {
        let mut record = match record {
            Some(record) => record,
            None => {
                skipped += 1;
                continue;
            }
        };

        // Split `record.id` into `share_name` and `region`
        let parts: Vec<&str> = record.id.split('.').collect();
        //let share_name = parts[0];
        let region = parts[1];

        // Embed wallclock timestamp and delay for benchmarking
        let current_time = Utc::now() + time_offset;
        record.wallclock_timestamp = Some(prost_types::Timestamp {
            seconds: current_time.timestamp(),
            nanos: current_time.timestamp_subsec_nanos() as i32,
        });
        record.delay = timestamp_diff_ms(
            record.wallclock_timestamp.unwrap(),
            record.trade_timestamp.unwrap(),
        );

        let mut buf = Vec::new();
        record.encode(&mut buf)?; // Serialize to bytes
        let topic = format!("{}-ticks", region);

        let writer_clone = Arc::clone(&writer);
        let producer_clone = producer.clone();

        tokio::spawn(async move {
            let topic_str = topic.as_str();
            let send_result = producer_clone
                .send(
                    FutureRecord::to(topic_str).key(&record.id).payload(&buf),
                    Duration::from_secs(0),
                ).await;
    
            // Append the result to the buffer
            let result_string = match send_result {
                Ok(delivery) => format!(
                    "Sent [t:{}, d:{}ms, s:{}]: {:?}\n",
                    record
                        .trade_timestamp
                        .unwrap_or_else(|| prost_types::Timestamp::default())
                        .seconds,
                    record.delay,
                    skipped,
                    delivery
                ),
                Err(e) => format!("Error sending record: {:?}", e),
            };
    
            let mut writer = writer_clone.lock().await;
            writer.write_all(result_string.as_bytes()).await.unwrap();
        });

        if last_flush_time.elapsed() > batch_duration {
            last_flush_time = Instant::now();
            let mut writer = writer.lock().await;
            writer.flush().await?;
        }
    }

    Ok(())
}
