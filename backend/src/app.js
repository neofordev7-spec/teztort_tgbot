const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const { apiLimiter } = require("./middleware/rateLimit");

const problemsRouter = require("./routes/problems");
const voteRouter = require("./routes/vote");
const analyticsRouter = require("./routes/analytics");

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.WEBAPP_URL || "*",
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use("/api/", apiLimiter);

// Static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Routes
app.use("/api/problems", problemsRouter);
app.use("/api/vote", voteRouter);
app.use("/api/analytics", analyticsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
