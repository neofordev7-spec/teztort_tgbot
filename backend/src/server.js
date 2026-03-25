require("dotenv").config();

const app = require("./app");
const db = require("./services/db");

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Test database connection
    await db.query("SELECT NOW()");
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`SignalAI Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
