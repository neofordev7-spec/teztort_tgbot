require("dotenv").config();

const fs = require("fs");
const path = require("path");
const app = require("./app");
const db = require("./services/db");

const PORT = process.env.PORT || 3001;

async function initDatabase() {
  const initSql = fs.readFileSync(
    path.join(__dirname, "db/init.sql"),
    "utf-8"
  );
  await db.query(initSql);
  console.log("Database tables initialized");
}

async function start() {
  try {
    // Test database connection
    await db.query("SELECT NOW()");
    console.log("Database connected successfully");

    // Auto-create tables if not exist
    await initDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SignalAI Backend running on port ${PORT}`);
    });

    // Start Telegram bot if BOT_TOKEN is set
    if (process.env.BOT_TOKEN) {
      try {
        require("./bot/index");
      } catch (err) {
        console.error("Bot start failed (non-fatal):", err.message);
      }
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
