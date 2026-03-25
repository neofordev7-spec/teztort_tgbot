const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const validator = require("validator");
const db = require("../services/db");
const { analyzeProblem } = require("../services/ai");
const { authMiddleware } = require("../middleware/auth");
const { submitLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// File upload config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

// POST /api/problems - Submit a new problem
router.post(
  "/",
  authMiddleware,
  submitLimiter,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description, lat, lng, location_name } = req.body;
      const user = req.telegramUser;

      // Validation
      if (!title || !description) {
        return res
          .status(400)
          .json({ error: "Title and description are required" });
      }
      if (title.length > 500) {
        return res.status(400).json({ error: "Title too long (max 500)" });
      }
      if (description.length > 5000) {
        return res
          .status(400)
          .json({ error: "Description too long (max 5000)" });
      }

      const sanitizedTitle = validator.escape(title.trim());
      const sanitizedDesc = description.trim();

      // Ensure user exists
      await db.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (telegram_id) DO UPDATE SET
           username = COALESCE($2, users.username),
           first_name = COALESCE($3, users.first_name)`,
        [user.id, user.username, user.first_name, user.last_name || null]
      );

      // AI analysis
      const aiResult = await analyzeProblem(sanitizedTitle, sanitizedDesc);

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const result = await db.query(
        `INSERT INTO problems (user_id, title, description, category, sentiment, urgency, lat, lng, location_name, image_url, ai_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          user.id,
          sanitizedTitle,
          sanitizedDesc,
          aiResult.category,
          aiResult.sentiment,
          aiResult.urgency,
          lat ? parseFloat(lat) : null,
          lng ? parseFloat(lng) : null,
          location_name || null,
          imageUrl,
          aiResult.summary,
        ]
      );

      // Update user problems count
      await db.query(
        "UPDATE users SET problems_count = problems_count + 1 WHERE telegram_id = $1",
        [user.id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create problem error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/problems - List problems with filters
router.get("/", async (req, res) => {
  try {
    const {
      category,
      urgency,
      sentiment,
      sort = "newest",
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (category) {
      conditions.push(`p.category = $${paramIdx++}`);
      params.push(category);
    }
    if (urgency) {
      conditions.push(`p.urgency = $${paramIdx++}`);
      params.push(urgency);
    }
    if (sentiment) {
      conditions.push(`p.sentiment = $${paramIdx++}`);
      params.push(sentiment);
    }
    if (search) {
      conditions.push(
        `(p.title ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderBy;
    switch (sort) {
      case "trending":
        orderBy = "p.votes DESC, p.created_at DESC";
        break;
      case "oldest":
        orderBy = "p.created_at ASC";
        break;
      default:
        orderBy = "p.created_at DESC";
    }

    params.push(parseInt(limit), offset);

    const result = await db.query(
      `SELECT p.*, u.username, u.first_name
       FROM problems p
       LEFT JOIN users u ON p.user_id = u.telegram_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM problems p ${where}`,
      params.slice(0, -2)
    );

    res.json({
      problems: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
    });
  } catch (error) {
    console.error("List problems error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/problems/:id - Get problem detail
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!validator.isInt(id)) {
      return res.status(400).json({ error: "Invalid problem ID" });
    }

    const result = await db.query(
      `SELECT p.*, u.username, u.first_name, u.badge
       FROM problems p
       LEFT JOIN users u ON p.user_id = u.telegram_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Problem not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get problem error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
