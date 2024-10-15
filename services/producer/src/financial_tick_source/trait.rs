use async_trait::async_trait;
use chrono::NaiveDateTime;
use std::error::Error;
use tokio::sync::mpsc;

#[derive(Debug, Clone)]
pub struct Message {
    pub id: String,
    pub sec_type: String,
    pub last: String,
    pub trading_date_time: NaiveDateTime,
}

#[async_trait]
pub trait FinTickSource {
    async fn subscribe(&mut self, topic: &str) -> Result<mpsc::Receiver<Option<Message>>, Box<dyn Error>>;
}
