mod financial_tick_source;

use chrono::Utc;
use financial_tick_source::{CSVSource, FinTickSource};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut fin_tick_source = CSVSource::new(100);

    let topic = "08-11-2021 17:00:00";
    let mut receiver = fin_tick_source.subscribe(topic).await?;
    let time_offset = fin_tick_source.get_time_offset();

    let file = std::fs::File::create("output.csv")?;
    let mut writer = csv::Writer::from_writer(file);

    let mut skipped = 0;

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
        let record_str = format!(
            "[t:{}, d:{}ms, s:{}] {}\n",
            record.trading_date_time.time().format("%H:%M:%S%.f"),
            delay.num_milliseconds(),
            skipped,
            record.id,
        );
        writer.write_field(record_str)?;
    }

    writer.flush()?;

    Ok(())
}
