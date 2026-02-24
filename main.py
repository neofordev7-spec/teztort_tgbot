"""
Universal Media Downloader Telegram Bot
Arxitektura: "Storage Channel Cache" — SQLite + yt-dlp + ffmpeg
"""

import asyncio
import logging
import os
import re
import sqlite3
import uuid

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart
from aiogram.types import FSInputFile
import yt_dlp

# ---------------------------------------------------------------------------
# SOZLAMALAR (Yangi token bilan)
# ---------------------------------------------------------------------------
# Railway Variables dan o'qiydi, yo'q bo'lsa yangi tokenni ishlatadi
BOT_TOKEN = os.getenv("BOT_TOKEN", "8728845267:AAHDjPUSLXnr0F4DXkJum9Ld6SlTWIfvuBQ")
CHANNEL_ID = int(os.getenv("CHANNEL_ID", "-1003740714437"))

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

SUPPORTED_URL_PATTERN = re.compile(
    r"https?://"
    r"("
    r"(www\.)?(instagram\.com|tiktok\.com|youtube\.com|youtu\.be"
    r"|facebook\.com|fb\.watch|pinterest\.com|pin\.it"
    r"|twitter\.com|x\.com|vimeo\.com|dailymotion\.com"
    r"|reddit\.com|snapchat\.com|likee\.video)"
    r"|vm\.tiktok\.com"
    r")"
    r"/\S+",
    re.IGNORECASE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ---------------------------------------------------------------------------
# SQLite KESH BAZASI
# ---------------------------------------------------------------------------
DB_PATH = "cache.db"

def _init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS media_cache (
            url            TEXT PRIMARY KEY,
            video_file_id  TEXT,
            audio_file_id  TEXT
        )
    """)
    conn.commit()
    return conn

db = _init_db()

def cache_get(url: str) -> tuple[str, str] | None:
    row = db.execute("SELECT video_file_id, audio_file_id FROM media_cache WHERE url = ?", (url,)).fetchone()
    return row if row else None

def cache_set(url: str, video_file_id: str, audio_file_id: str) -> None:
    db.execute("INSERT OR REPLACE INTO media_cache (url, video_file_id, audio_file_id) VALUES (?, ?, ?)",
               (url, video_file_id, audio_file_id))
    db.commit()

# ---------------------------------------------------------------------------
# YUKLASH FUNKSIYALARI (yt-dlp) - YouTube 403 xatosi to'g'rilangan
# ---------------------------------------------------------------------------
def _download_video_sync(url: str, output_path: str) -> bool:
    opts = {
        "format": "best[filesize<50M]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
        "max_filesize": MAX_FILE_SIZE,
        "socket_timeout": 30,
        "retries": 5,
        "geo_bypass": True,
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}}, # YouTube bypass
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    return os.path.exists(output_path)

def _extract_audio_sync(url: str, output_path: str) -> bool:
    base, _ = os.path.splitext(output_path)
    opts = {
        "format": "bestaudio/best",
        "outtmpl": base,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 30,
        "retries": 5,
        "geo_bypass": True,
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}}, # YouTube bypass
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    actual = base + ".mp3"
    if actual != output_path and os.path.exists(actual):
        os.rename(actual, output_path)
    return os.path.exists(output_path)

def extract_url(text: str) -> str | None:
    match = SUPPORTED_URL_PATTERN.search(text)
    return match.group(0) if match else None

def normalize_url(url: str) -> str:
    return url.split("?")[0].rstrip("/")

# ---------------------------------------------------------------------------
# BOT HANDLERLARI
# ---------------------------------------------------------------------------
@dp.message(CommandStart())
async def cmd_start(message: types.Message) -> None:
    await message.answer(
        "Assalomu aleykum! 👋\n\n"
        "Media yuklash uchun havolani yuboring\n"
        "(Instagram, TikTok, YouTube, Facebook, Pinterest...).\n\n"
        "Bot video va musiqani yuklab beradi!"
    )

@dp.message(F.text)
async def handle_url(message: types.Message) -> None:
    url = extract_url(message.text)
    if url is None:
        await message.answer("Iltimos, to'g'ri havola yuboring.")
        return

    normalized = normalize_url(url)
    cached = cache_get(normalized)
    
    if cached:
        video_fid, audio_fid = cached
        try:
            await bot.send_video(chat_id=message.chat.id, video=video_fid, caption="✅ @TezTortBot orqali yuklab olindi")
            await bot.send_audio(chat_id=message.chat.id, audio=audio_fid)
            logger.info("Cache hit: %s", normalized)
            return
        except Exception:
            logger.warning("Cache file_id ishlamadi, qayta yuklanadi: %s", normalized)

    wait_msg = await message.answer("⏳ Video va musiqa yuklanmoqda...")
    uid = uuid.uuid4().hex
    video_path = f"{uid}_video.mp4"
    audio_path = f"{uid}_audio.mp3"

    try:
        video_ok, audio_ok = await asyncio.gather(
            asyncio.to_thread(_download_video_sync, url, video_path),
            asyncio.to_thread(_extract_audio_sync, url, audio_path),
        )

        if not video_ok:
            await message.answer("❌ Videoni yuklab bo'lmadi. Profil yopiq yoki hajm katta.")
            return
        if not audio_ok:
            await message.answer("❌ Musiqani ajratib bo'lmadi.")
            return

        if os.path.getsize(video_path) > MAX_FILE_SIZE:
            await message.answer("❌ Video hajmi 50 MB dan oshadi.")
            return

        video_msg = await bot.send_video(chat_id=CHANNEL_ID, video=FSInputFile(video_path), caption=f"🔗 {normalized}")
        audio_msg = await bot.send_audio(chat_id=CHANNEL_ID, audio=FSInputFile(audio_path), caption=f"🔗 {normalized}")

        cache_set(normalized, video_msg.video.file_id, audio_msg.audio.file_id)

        await bot.send_video(chat_id=message.chat.id, video=video_msg.video.file_id, caption="✅ @TezTortBot orqali yuklab olindi")
        await bot.send_audio(chat_id=message.chat.id, audio=audio_msg.audio.file_id)
        logger.info("Yangi media keshlandi: %s", normalized)

    except yt_dlp.utils.DownloadError as e:
        logger.error("yt-dlp xatolik: %s", e)
        await message.answer("❌ Videoni yuklab bo'lmadi. Havola noto'g'ri yoki cheklangan.")
    except Exception as e:
        logger.error("Kutilmagan xatolik: %s", e)
        await message.answer("❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.")
    finally:
        for path in (video_path, audio_path):
            if os.path.exists(path):
                os.remove(path)
        try:
            await wait_msg.delete()
        except Exception:
            pass

# ---------------------------------------------------------------------------
# ISHGA TUSHIRISH
# ---------------------------------------------------------------------------
async def main() -> None:
    logger.info("Bot ishga tushmoqda...")
    await bot.delete_webhook(drop_pending_updates=True)
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()

if __name__ == "__main__":
    asyncio.run(main())
