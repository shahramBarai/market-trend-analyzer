use crate::financial_tick_source::{FinTickSource, Message};
use async_trait::async_trait;
use chrono::{NaiveDateTime, TimeDelta, Utc};
use csv::ReaderBuilder;
use std::sync::Arc;
use std::{
    error::Error,
    fs::{read_dir, File},
    time::Duration,
};

use tokio::{
    sync::{mpsc, Barrier},
    task, time,
};

struct Record {
    id: String,
    sec_type: String,
    last: String,
    trading_date: String,
    trading_time: String,
}

struct RecordParsingError {
    message: String,
}

struct TradingFileProcessor {
    time_offset: TimeDelta,
    barrier_c: Arc<Barrier>,
}

impl TradingFileProcessor {
    fn new(time_offset: TimeDelta, barrier_c: Arc<Barrier>) -> TradingFileProcessor {
        TradingFileProcessor {
            time_offset,
            barrier_c,
        }
    }

    fn process_record(&self, record: Record) -> Result<Message, RecordParsingError> {
        if record.trading_date.is_empty() || record.trading_time.is_empty() {
            return Err(RecordParsingError {
                message: "Trading date and time cannot be empty".to_string(),
            });
        }

        let trading_date_time_str = format!("{} {}", record.trading_date, record.trading_time);
        let trading_date_time =
            NaiveDateTime::parse_from_str(&trading_date_time_str, "%d-%m-%Y %H:%M:%S%.f");
        let trading_date_time = match trading_date_time {
            Ok(trading_date_time) => trading_date_time,
            Err(e) => {
                return Err(RecordParsingError {
                    message: format!("Error parsing trading date and time: {}", e),
                });
            }
        };

        Ok(Message {
            id: record.id,
            sec_type: record.sec_type,
            last: record.last,
            trading_date_time,
        })
    }

    fn calculate_time_diff(&self, record: &Message) -> i64 {
        let current_time = Utc::now().naive_utc() + self.time_offset;
        let time_diff = record.trading_date_time.signed_duration_since(current_time);
        time_diff.num_milliseconds()
    }

    async fn block_until_trading_time(&mut self, record: &Message) {
        let time_diff_millis = self.calculate_time_diff(record);
        if time_diff_millis > 0 {
            time::sleep(Duration::from_millis(time_diff_millis as u64)).await;
        }
    }

    async fn process_file(
        &mut self,
        file_path: &str,
        tx: mpsc::Sender<Option<Message>>,
    ) -> Result<(), Box<dyn std::error::Error + Send>> {
        // Open the CSV file
        let file = File::open(&file_path);
        let file = match file {
            Ok(file) => file,
            Err(e) => {
                eprintln!("Error opening file {}: {}", file_path, e);
                return Err(Box::new(e));
            }
        };
        let mut reader = ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_reader(file);

        let headers_res = reader.headers();
        let headers = match headers_res {
            Ok(headers) => headers,
            Err(e) => {
                eprintln!("Error reading headers for file {}: {}", file_path, e);
                return Err(Box::new(e));
            }
        };
        let id_index = headers.iter().position(|h| h == "ID");
        let sec_type_index = headers.iter().position(|h| h == "SecType");
        let last_index = headers.iter().position(|h| h == "Last");
        let trading_date_index = headers.iter().position(|h| h == "Trading date");
        let trading_time_index = headers.iter().position(|h| h == "Trading time");

        // check if all the headers are present
        match (
            id_index,
            sec_type_index,
            last_index,
            trading_date_index,
            trading_time_index,
        ) {
            (
                Some(id_index),
                Some(sec_type_index),
                Some(last_index),
                Some(trading_date_index),
                Some(trading_time_index),
            ) => {
                // Step 1: Preprocess the records - skip the records that are in the past
                for result in reader.records() {
                    match result {
                        Ok(record) => {
                            let record = Record {
                                id: record[id_index].to_string(),
                                sec_type: record[sec_type_index].to_string(),
                                last: record[last_index].to_string(),
                                trading_date: record[trading_date_index].to_string(),
                                trading_time: record[trading_time_index].to_string(),
                            };
                            let processed_record = self.process_record(record);
                            let processed_record = match processed_record {
                                Ok(processed_record) => processed_record,
                                Err(_) => {
                                    // Skip the record if it cannot be processed
                                    continue;
                                }
                            };

                            // Stop preprocessing if the trading date time is more than 1 second in the future
                            if self.calculate_time_diff(&processed_record) > 0 {
                                break;
                            }
                        }
                        Err(e) => {
                            eprintln!("Error reading record from file {}: {}", file_path, e);
                        }
                    }
                }

                // Step 2: Synvhronize the processing time with given start time
                // println!("Reached trading time for file {}", file_path);
                let res = self.barrier_c.wait().await;
                if res.is_leader() {
                    println!("All files have reached trading time");
                }

                // Step 3: Process the records - send the records that are in the future
                for result in reader.records() {
                    match result {
                        Ok(record) => {
                            let record = Record {
                                id: record[id_index].to_string(),
                                sec_type: record[sec_type_index].to_string(),
                                last: record[last_index].to_string(),
                                trading_date: record[trading_date_index].to_string(),
                                trading_time: record[trading_time_index].to_string(),
                            };
                            let processed_record = self.process_record(record);
                            let processed_record = match processed_record {
                                Ok(processed_record) => processed_record,
                                Err(_) => {
                                    // Skip the record if it cannot be processed
                                    continue;
                                }
                            };

                            // Skip the record if the trading date time is in the past
                            // if self.calculate_time_diff(&processed_record) < 0 {
                            //     let res = tx.send(None).await;
                            //     if let Err(e) = res {
                            //         eprintln!("Error sending record via channel: {}", e);
                            //     }
                            //     continue;
                            // }

                            self.block_until_trading_time(&processed_record).await;
                            if let Err(e) = tx.send(Some(processed_record)).await {
                                eprintln!("Error sending record via channel: {}", e);
                            }
                        }
                        Err(e) => {
                            eprintln!("Error reading record from file {}: {}", file_path, e);
                        }
                    }
                }
            }
            _ => {
                self.barrier_c.wait().await;
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Missing one or more headers in file {}", file_path),
                )));
            }
        }

        Ok(())
    }
}

fn get_csv_files(dir: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut files_paths = Vec::new();

    // Read the directory
    for entry in read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        // Only process files with `.csv` extension
        if path.extension() == Some(std::ffi::OsStr::new("csv")) {
            if let Some(file_path) = path.to_str() {
                files_paths.push(file_path.to_string());
            }
        }
    }

    Ok(files_paths)
}

pub struct CSVSource {
    pub buffer_size: usize,
    time_offset: TimeDelta,
}

impl CSVSource {
    pub fn new(buffer_size: usize) -> CSVSource {
        CSVSource {
            buffer_size,
            time_offset: TimeDelta::zero(),
        }
    }

    pub fn csv_get_time_offset(&self) -> TimeDelta {
        self.time_offset
    }
}

#[async_trait]
impl FinTickSource for CSVSource {
    async fn subscribe(
        &mut self,
        topic: &str,
    ) -> Result<mpsc::Receiver<Option<Message>>, Box<dyn Error>> {
        let (tx, rx) = mpsc::channel(self.buffer_size);

        let target_time = NaiveDateTime::parse_from_str(topic, "%d-%m-%Y %H:%M:%S").unwrap();
        let date_str = target_time.date().format("%d-%m-%y").to_string();
        let csv_folder = format!("data/day-{}", date_str);
        let csv_files = get_csv_files(&csv_folder)?;
        let files_count = csv_files.len();
        println!("Found {} CSV files", files_count);

        let time_offset: TimeDelta = target_time.signed_duration_since(Utc::now().naive_utc());
        self.time_offset = time_offset;
        let barrier = Arc::new(Barrier::new(files_count));
        let mut tasks = Vec::new();
        for file_path in csv_files {
            let tx = tx.clone();
            let barrier_clone = barrier.clone();
            let mut worker = TradingFileProcessor::new(time_offset, barrier_clone);
            tasks.push(task::spawn(async move {
                worker.process_file(&file_path, tx).await
            }));
        }

        drop(tx);

        Ok(rx)
    }
}
