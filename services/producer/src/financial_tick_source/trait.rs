use async_trait::async_trait;
use std::error::Error;
use tokio::sync::mpsc;

mod trading {
    include!(concat!(env!("OUT_DIR"), "/finance.trading.analysis.rs"));
}
pub use trading::FinancialTick;

#[async_trait]
pub trait FinTickSource {
    async fn subscribe(
        &mut self,
        topic: &str,
    ) -> Result<mpsc::Receiver<Option<FinancialTick>>, Box<dyn Error>>;
}
