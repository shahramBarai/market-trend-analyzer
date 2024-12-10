CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE ema_results (
  id SERIAL,
  symbol TEXT NOT NULL,
  ema38 DOUBLE PRECISION NOT NULL,
  ema100 DOUBLE PRECISION NOT NULL,
  trade_timestamp TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (symbol, trade_timestamp)
);
SELECT create_hypertable('ema_results', 'trade_timestamp');

CREATE TABLE buy_advisories (
  id SERIAL,
  symbol TEXT NOT NULL,
  advice TEXT NOT NULL,
  trade_timestamp TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (symbol, trade_timestamp)
);
CREATE UNIQUE INDEX buy_advisories_symbol_trade_timestamp_idx
ON buy_advisories (symbol, trade_timestamp);
SELECT create_hypertable('buy_advisories', 'trade_timestamp');