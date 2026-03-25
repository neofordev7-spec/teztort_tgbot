const express = require("express");
const db = require("../services/db");
const { generateInsights } = require("../services/ai");

const router = express.Router();

// GET /api/analytics - Get dashboard analytics
router.get("/", async (req, res) => {
  try {
    // Total stats
    const totalProblems = await db.query("SELECT COUNT(*) FROM problems");
    const totalUsers = await db.query("SELECT COUNT(*) FROM users");
    const totalVotes = await db.query(
      "SELECT COALESCE(SUM(votes), 0) as total FROM problems"
    );

    // Category distribution
    const categories = await db.query(
      `SELECT category, COUNT(*) as count
       FROM problems
       GROUP BY category
       ORDER BY count DESC`
    );

    // Sentiment distribution
    const sentiments = await db.query(
      `SELECT sentiment, COUNT(*) as count
       FROM problems
       GROUP BY sentiment
       ORDER BY count DESC`
    );

    // Urgency distribution
    const urgencies = await db.query(
      `SELECT urgency, COUNT(*) as count
       FROM problems
       GROUP BY urgency
       ORDER BY count DESC`
    );

    // Top problems (most voted)
    const topProblems = await db.query(
      `SELECT id, title, category, votes, urgency, sentiment, created_at
       FROM problems
       ORDER BY votes DESC
       LIMIT 10`
    );

    // Recent problems
    const recentProblems = await db.query(
      `SELECT id, title, category, votes, urgency, created_at
       FROM problems
       ORDER BY created_at DESC
       LIMIT 10`
    );

    // Problems per day (last 30 days)
    const dailyTrend = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM problems
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    // Top locations
    const topLocations = await db.query(
      `SELECT location_name, COUNT(*) as count
       FROM problems
       WHERE location_name IS NOT NULL
       GROUP BY location_name
       ORDER BY count DESC
       LIMIT 10`
    );

    // Top active users
    const topUsers = await db.query(
      `SELECT telegram_id, username, first_name, problems_count, votes_count, badge
       FROM users
       ORDER BY (problems_count + votes_count) DESC
       LIMIT 10`
    );

    // Weekly top (this week's most voted)
    const weeklyTop = await db.query(
      `SELECT id, title, category, votes, urgency
       FROM problems
       WHERE created_at >= NOW() - INTERVAL '7 days'
       ORDER BY votes DESC
       LIMIT 5`
    );

    res.json({
      stats: {
        totalProblems: parseInt(totalProblems.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalVotes: parseInt(totalVotes.rows[0].total),
      },
      categories: categories.rows,
      sentiments: sentiments.rows,
      urgencies: urgencies.rows,
      topProblems: topProblems.rows,
      recentProblems: recentProblems.rows,
      dailyTrend: dailyTrend.rows,
      topLocations: topLocations.rows,
      topUsers: topUsers.rows,
      weeklyTop: weeklyTop.rows,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/analytics/insights - AI-generated insights
router.get("/insights", async (req, res) => {
  try {
    const problems = await db.query(
      `SELECT title, category, urgency, sentiment, votes
       FROM problems
       ORDER BY created_at DESC
       LIMIT 50`
    );

    if (problems.rows.length === 0) {
      return res.json({
        top_issues: [],
        recommendations: [],
        trending_categories: [],
        urgency_summary: "Hali muammolar yo'q",
        overall_sentiment: "Neutral",
      });
    }

    const insights = await generateInsights(problems.rows);
    res.json(insights);
  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/analytics/heatmap - Location heatmap data
router.get("/heatmap", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT lat, lng, COUNT(*) as intensity, category
       FROM problems
       WHERE lat IS NOT NULL AND lng IS NOT NULL
       GROUP BY lat, lng, category`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Heatmap error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
