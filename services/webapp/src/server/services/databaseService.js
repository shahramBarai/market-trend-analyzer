import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  "postgres://postgres:password@timescaledb:5432/analytics",
  {
    dialect: "postgres",
    protocol: "postgres",
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

// CREATE TABLE ema_results (
//   id SERIAL,
//   symbol TEXT NOT NULL,
//   ema38 DOUBLE PRECISION NOT NULL,
//   ema100 DOUBLE PRECISION NOT NULL,
//   trade_timestamp TIMESTAMPTZ NOT NULL,
//   PRIMARY KEY (symbol, trade_timestamp)
// );
export const EMAResults = sequelize.define(
  "ema_results",
  {
    symbol: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    ema38: {
      type: Sequelize.DOUBLE,
      allowNull: false,
    },
    ema100: {
      type: Sequelize.DOUBLE,
      allowNull: false,
    },
    trade_timestamp: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    freezeTableName: true,
  }
);

// CREATE TABLE buy_advisories (
//   id SERIAL,
//   symbol TEXT NOT NULL,
//   advice TEXT NOT NULL,
//   trade_timestamp TIMESTAMPTZ NOT NULL,
//   PRIMARY KEY (symbol, trade_timestamp)
// );
export const BuyAdvisories = sequelize.define(
  "buy_advisories",
  {
    symbol: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    advice: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    trade_timestamp: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    freezeTableName: true,
  }
);
