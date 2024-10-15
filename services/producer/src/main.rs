use chrono::{NaiveDateTime, TimeDelta, Utc};
use csv::ReaderBuilder;
use std::error::Error;
use std::fs::{read_dir, File};
use tokio::io::AsyncWriteExt;
use tokio::task;
use tokio::time::{self, Duration};

struct Record {
    id: String,
    sec_type: String,
    last: String,
    trading_date: String,
    trading_time: String,
}


#[derive(Debug)]
struct ProcessedRecord {
    id: String,
    sec_type: String,
    last: String,
    trading_date_time: NaiveDateTime
}

struct RecordParsingError {
    message: String,
}

// Define a struct to hold the state for each worker
struct WorkerState {
    time_offset: TimeDelta,
}

impl WorkerState {
    fn new(time_offset: TimeDelta) -> WorkerState {
        WorkerState { time_offset }
    }

    fn process_record(&self, record: Record) -> Result<ProcessedRecord, RecordParsingError> {
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

        Ok(ProcessedRecord {
            id: record.id,
            sec_type: record.sec_type,
            last: record.last,
            trading_date_time,
        })
    }

    async fn block_until_trading_time(
        &self,
        record: &ProcessedRecord,
    ) -> bool {
        let current_time = Utc::now().naive_utc() + self.time_offset;
        let time_diff = record.trading_date_time.signed_duration_since(current_time);
        let time_diff_micros = time_diff.num_microseconds().unwrap_or(time_diff.num_milliseconds() * 1000);

        if time_diff_micros < 0 {
            // skip the record
            return false;
        } else {
            let sleep_duration_micros = time_diff
                .num_microseconds()
                .unwrap_or(time_diff.num_milliseconds() * 1000);
            time::sleep(Duration::from_micros(sleep_duration_micros as u64)).await;
            return true;
        }
    }

    fn finalize(self) {
        // println!(
        //     "Finalizing worker for ID {}: processed {} records",
        //     self.file_path, self.record_count
        // );
    }
}

// Process a single file associated with a given ID
async fn process_file(
    file_path: &str,
    time_offset: TimeDelta,
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
            let state = WorkerState::new(time_offset);
            let mut stdout = tokio::io::stdout();

            // Iterate over the records
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
                        let processed_record = state.process_record(record);
                        let processed_record = match processed_record {
                            Ok(processed_record) => processed_record,
                            Err(e) => {
                                // Skip the record if it cannot be processed
                                continue;
                            }
                        };
                        let blocked = state.block_until_trading_time(&processed_record).await;
                        if blocked {
                            let record_str = format!(
                                "{:?}\n",
                                processed_record
                            );
                            let res = stdout.write_all(record_str.as_bytes()).await;
                            if let Err(e) = res {
                                eprintln!("Error writing record to stdout: {}", e);
                            }
                        } else {
                            // Record was skipped
                        }
                    }
                    Err(e) => {
                        eprintln!("Error reading record from file {}: {}", file_path, e);
                    }
                }
            }

            state.finalize();
        }
        _ => {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Missing one or more headers in file {}", file_path),
            )));
        }
    }

    Ok(())
}

// Function to get the list of IDs from the files in the `data` folder
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

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // List of IDs (or file names) to process
    let csv_files = get_csv_files("data/day-08-11-21")?;

    // Offset current time to 00:00:00 08-11-2021
    let current_time = Utc::now().naive_utc();
    let target_time =
        NaiveDateTime::parse_from_str("08-11-2021 17:00:00", "%d-%m-%Y %H:%M:%S").unwrap();
    let time_offset: TimeDelta = target_time.signed_duration_since(current_time);

    println!("Time offset: {:?}", time_offset);

    // Spawn a task for each file
    let mut tasks = Vec::new();
    for file_path in csv_files {
        tasks.push(task::spawn(async move {
            process_file(&file_path, time_offset).await
        }));
    }

    // Wait for all tasks to complete
    for task in tasks {
        let res = task.await?;
        if let Err(e) = res {
            eprintln!("Error processing file: {}", e);
        }
    }

    Ok(())
}
