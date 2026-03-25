const crypto = require("crypto");

function validateTelegramData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const entries = [...params.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash !== hash) return null;

    const userStr = params.get("user");
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const initData = req.headers["x-telegram-init-data"];

  // Development mode bypass
  if (process.env.NODE_ENV === "development" && !initData) {
    req.telegramUser = {
      id: 12345,
      username: "dev_user",
      first_name: "Developer",
    };
    return next();
  }

  if (!initData) {
    return res.status(401).json({ error: "Telegram authentication required" });
  }

  const user = validateTelegramData(initData, process.env.BOT_TOKEN);
  if (!user) {
    return res.status(401).json({ error: "Invalid Telegram data" });
  }

  req.telegramUser = user;
  next();
}

module.exports = { authMiddleware, validateTelegramData };
