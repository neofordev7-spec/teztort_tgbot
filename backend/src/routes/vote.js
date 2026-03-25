const express = require("express");
const validator = require("validator");
const db = require("../services/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// POST /api/vote - Vote for a problem
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { problem_id } = req.body;
    const userId = req.telegramUser.id;

    if (!problem_id || !validator.isInt(String(problem_id))) {
      return res.status(400).json({ error: "Valid problem_id is required" });
    }

    // Check if problem exists
    const problem = await db.query("SELECT id FROM problems WHERE id = $1", [
      problem_id,
    ]);
    if (problem.rows.length === 0) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Check for duplicate vote
    const existing = await db.query(
      "SELECT id FROM votes WHERE user_id = $1 AND problem_id = $2",
      [userId, problem_id]
    );

    if (existing.rows.length > 0) {
      // Remove vote (toggle)
      await db.query(
        "DELETE FROM votes WHERE user_id = $1 AND problem_id = $2",
        [userId, problem_id]
      );
      await db.query(
        "UPDATE problems SET votes = GREATEST(votes - 1, 0) WHERE id = $1",
        [problem_id]
      );
      await db.query(
        "UPDATE users SET votes_count = GREATEST(votes_count - 1, 0) WHERE telegram_id = $1",
        [userId]
      );

      const updated = await db.query(
        "SELECT votes FROM problems WHERE id = $1",
        [problem_id]
      );
      return res.json({ voted: false, votes: updated.rows[0].votes });
    }

    // Add vote
    await db.query(
      "INSERT INTO votes (user_id, problem_id) VALUES ($1, $2)",
      [userId, problem_id]
    );
    await db.query("UPDATE problems SET votes = votes + 1 WHERE id = $1", [
      problem_id,
    ]);
    await db.query(
      "UPDATE users SET votes_count = votes_count + 1 WHERE telegram_id = $1",
      [userId]
    );

    // Update badge
    const userResult = await db.query(
      "SELECT votes_count, problems_count FROM users WHERE telegram_id = $1",
      [userId]
    );
    const u = userResult.rows[0];
    const total = u.votes_count + u.problems_count;
    let badge = "newcomer";
    if (total >= 50) badge = "expert";
    else if (total >= 20) badge = "activist";
    else if (total >= 5) badge = "contributor";

    await db.query("UPDATE users SET badge = $1 WHERE telegram_id = $2", [
      badge,
      userId,
    ]);

    const updated = await db.query(
      "SELECT votes FROM problems WHERE id = $1",
      [problem_id]
    );
    res.json({ voted: true, votes: updated.rows[0].votes, badge });
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/vote/check/:problemId - Check if user voted
router.get("/check/:problemId", authMiddleware, async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.telegramUser.id;

    const result = await db.query(
      "SELECT id FROM votes WHERE user_id = $1 AND problem_id = $2",
      [userId, problemId]
    );

    res.json({ voted: result.rows.length > 0 });
  } catch (error) {
    console.error("Check vote error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
