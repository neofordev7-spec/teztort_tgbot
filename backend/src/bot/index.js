require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const db = require("../services/db");

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL || "https://signalai.example.com";

// /start command
bot.start(async (ctx) => {
  const user = ctx.from;

  // Upsert user
  try {
    await db.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username = COALESCE($2, users.username),
         first_name = COALESCE($3, users.first_name)`,
      [user.id, user.username, user.first_name, user.last_name || null]
    );
  } catch (err) {
    console.error("User upsert error:", err);
  }

  await ctx.reply(
    `Assalomu alaykum, ${user.first_name}! 👋\n\n` +
      `🔍 *SignalAI* — muammolarni hal qilish platformasi\n\n` +
      `Bu platforma orqali siz:\n` +
      `📝 Shahar muammolarini xabar qilishingiz\n` +
      `🗳 Boshqalar muammosiga ovoz berishingiz\n` +
      `📊 Analitika va insightlar olishingiz mumkin\n\n` +
      `Boshlash uchun quyidagi tugmani bosing:`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🚀 Ilovani ochish", WEBAPP_URL)],
        [
          Markup.button.webApp(
            "📝 Muammo yuborish",
            `${WEBAPP_URL}/submit`
          ),
        ],
        [
          Markup.button.webApp(
            "📊 Dashboard",
            `${WEBAPP_URL}/dashboard`
          ),
        ],
      ]),
    }
  );
});

// /help command
bot.help((ctx) => {
  ctx.reply(
    `📖 *SignalAI Yordam*\n\n` +
      `🔹 /start — Ilovani boshlash\n` +
      `🔹 /stats — O'z statistikangiz\n` +
      `🔹 /top — Eng ko'p ovoz olgan muammolar\n` +
      `🔹 /help — Yordam\n\n` +
      `Muammo yuborish uchun ilovani oching.`,
    { parse_mode: "Markdown" }
  );
});

// /stats command
bot.command("stats", async (ctx) => {
  try {
    const result = await db.query(
      "SELECT problems_count, votes_count, badge FROM users WHERE telegram_id = $1",
      [ctx.from.id]
    );

    if (result.rows.length === 0) {
      return ctx.reply("Siz hali ro'yxatdan o'tmagansiz. /start buyrug'ini bosing.");
    }

    const u = result.rows[0];
    const badgeEmoji = {
      newcomer: "🆕",
      contributor: "⭐",
      activist: "🏅",
      expert: "🏆",
    };

    ctx.reply(
      `📊 *Sizning statistikangiz:*\n\n` +
        `📝 Yuborilgan muammolar: ${u.problems_count}\n` +
        `🗳 Berilgan ovozlar: ${u.votes_count}\n` +
        `${badgeEmoji[u.badge] || "🆕"} Badge: ${u.badge}\n`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Stats error:", err);
    ctx.reply("Xatolik yuz berdi.");
  }
});

// /top command
bot.command("top", async (ctx) => {
  try {
    const result = await db.query(
      `SELECT title, votes, category, urgency
       FROM problems
       ORDER BY votes DESC
       LIMIT 5`
    );

    if (result.rows.length === 0) {
      return ctx.reply("Hali muammolar yuborilmagan.");
    }

    const urgencyEmoji = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" };

    let msg = "🏆 *Top 5 muammolar:*\n\n";
    result.rows.forEach((p, i) => {
      msg += `${i + 1}. ${urgencyEmoji[p.urgency] || "⚪"} *${p.title}*\n`;
      msg += `   📂 ${p.category} | 🗳 ${p.votes} ovoz\n\n`;
    });

    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Top error:", err);
    ctx.reply("Xatolik yuz berdi.");
  }
});

// Launch bot
bot
  .launch()
  .then(() => console.log("SignalAI Bot started"))
  .catch((err) => console.error("Bot launch error:", err));

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
