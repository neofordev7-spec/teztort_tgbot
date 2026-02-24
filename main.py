"""
Universal Media Downloader Telegram Bot
Platforms: Instagram, TikTok, YouTube, Facebook, Pinterest va boshqalar.
Texnologiyalar: aiogram 3.x, yt-dlp, SQLite, ffmpeg.

Arxitektura: "Storage Channel Cache" — har bir yuklangan media
maxfiy kanalga yuklanadi va file_id SQLite bazada saqlanadi.
Keyingi so'rovlarda file_id orqali darhol yuboriladi (kesh).
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
# SOZLAMALAR
# ---------------------------------------------------------------------------
BOT_TOKEN = "8261776746:AAG2neZFTJ0NS_F23m8h16bMK3JviFvA2aQ"
CHANNEL_ID = -1003740714437  # Maxfiy kesh kanali

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB — Telegram bot API limiti

# Qo'llab-quvvatlanadigan platformalar uchun URL pattern
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ---------------------------------------------------------------------------
# SQLite KESH BAZASI
# ---------------------------------------------------------------------------
DB_PATH = "cache.db"


def _init_db() -> sqlite3.Connection:
    """Bazani yaratish va media_cache jadvalini tayyorlash."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS media_cache (
            url            TEXT PRIMARY KEY,
            video_file_id  TEXT,
            audio_file_id  TEXT
        )
        """
    )
    conn.commit()
    return conn


db = _init_db()


def cache_get(url: str) -> tuple[str, str] | None:
    """Keshdan video va audio file_id larini olish."""
    row = db.execute(
        "SELECT video_file_id, audio_file_id FROM media_cache WHERE url = ?",
        (url,),
    ).fetchone()
    return row if row else None


def cache_set(url: str, video_file_id: str, audio_file_id: str) -> None:
    """Keshga yangi yozuv qo'shish yoki mavjudini yangilash."""
    db.execute(
        "INSERT OR REPLACE INTO media_cache (url, video_file_id, audio_file_id) "
        "VALUES (?, ?, ?)",
        (url, video_file_id, audio_file_id),
    )
    db.commit()


# ---------------------------------------------------------------------------
# yt-dlp YUKLASH FUNKSIYALARI (sinxron — executor orqali chaqiriladi)
# ---------------------------------------------------------------------------


def _download_video_sync(url: str, output_path: str) -> bool:
    """Videoni .mp4 formatida diskka yuklash (sinxron)."""
    opts = {
        "format": "best[ext=mp4][filesize<50M]/best[ext=mp4]/best[filesize<50M]/best",
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
        "max_filesize": MAX_FILE_SIZE,
        "socket_timeout": 30,
        "retries": 3,
        # Geo-restriction aylanib o'tish
        "geo_bypass": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    return os.path.exists(output_path)


def _extract_audio_sync(url: str, output_path: str) -> bool:
    """URL dan audioni .mp3 formatida ajratib olish (sinxron, ffmpeg kerak)."""
    # output_path ning kengaytmasiz ko'rinishi kerak — yt-dlp o'zi qo'shadi
    base, _ = os.path.splitext(output_path)
    opts = {
        "format": "bestaudio/best",
        "outtmpl": base,  # yt-dlp postprocessor .mp3 qo'shadi
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 30,
        "retries": 3,
        "geo_bypass": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    # yt-dlp natija faylni base + ".mp3" deb nomlaydi
    actual = base + ".mp3"
    # Agar kutilgan nom bilan farq qilsa, nomini to'g'rilaymiz
    if actual != output_path and os.path.exists(actual):
        os.rename(actual, output_path)
    return os.path.exists(output_path)


# ---------------------------------------------------------------------------
# YORDAMCHI FUNKSIYALAR
# ---------------------------------------------------------------------------


def extract_url(text: str) -> str | None:
    """Xabar matnidan birinchi mos URL ni ajratib olish."""
    match = SUPPORTED_URL_PATTERN.search(text)
    return match.group(0) if match else None


def normalize_url(url: str) -> str:
    """URL ni normallashtirish — query parametrlarini olib tashlash."""
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
    """Foydalanuvchi yuborgan URL ni qayta ishlash."""
    url = extract_url(message.text)
    if url is None:
        await message.answer(
            "Iltimos, to'g'ri havola yuboring.\n"
            "Qo'llab-quvvatlanadigan platformalar: "
            "Instagram, TikTok, YouTube, Facebook, Pinterest."
        )
        return

    normalized = normalize_url(url)

    # --- KESH TEKSHIRISH ---
    cached = cache_get(normalized)
    if cached:
        video_fid, audio_fid = cached
        try:
            await bot.send_video(
                chat_id=message.chat.id,
                video=video_fid,
                caption="✅ @teztort_bot orqali yuklab olindi",
            )
            await bot.send_audio(
                chat_id=message.chat.id,
                audio=audio_fid,
            )
            logger.info("Cache hit: %s", normalized)
            return
        except Exception:
            # Agar file_id eskirgan bo'lsa, qayta yuklaymiz
            logger.warning("Cache file_id ishlamadi, qayta yuklanadi: %s", normalized)

    # --- KESH MISS: YUKLASH ---
    wait_msg = await message.answer("⏳ Video va musiqa yuklanmoqda...")

    uid = uuid.uuid4().hex
    video_path = f"{uid}_video.mp4"
    audio_path = f"{uid}_audio.mp3"

    try:
        # 1) Video va audio ni parallel yuklash (executor orqali)
        video_ok, audio_ok = await asyncio.gather(
            asyncio.to_thread(_download_video_sync, url, video_path),
            asyncio.to_thread(_extract_audio_sync, url, audio_path),
        )

        if not video_ok:
            await message.answer(
                "❌ Videoni yuklab bo'lmadi.\n"
                "Sabablari: profil yopiq, havola noto'g'ri yoki video juda katta."
            )
            return

        if not audio_ok:
            await message.answer(
                "❌ Musiqani ajratib bo'lmadi. "
                "Server ffmpeg bilan bog'liq muammo bo'lishi mumkin."
            )
            return

        # Fayl hajmini tekshirish
        if os.path.getsize(video_path) > MAX_FILE_SIZE:
            await message.answer(
                "❌ Video hajmi 50 MB dan oshadi. "
                "Telegram bot orqali yuborib bo'lmaydi."
            )
            return

        # 2) Maxfiy kanalga yuklash
        video_msg = await bot.send_video(
            chat_id=CHANNEL_ID,
            video=FSInputFile(video_path),
            caption=f"🔗 {normalized}",
        )
        audio_msg = await bot.send_audio(
            chat_id=CHANNEL_ID,
            audio=FSInputFile(audio_path),
            caption=f"🔗 {normalized}",
        )

        video_file_id = video_msg.video.file_id
        audio_file_id = audio_msg.audio.file_id

        # 3) Keshga saqlash
        cache_set(normalized, video_file_id, audio_file_id)

        # 4) Foydalanuvchiga yuborish
        await bot.send_video(
            chat_id=message.chat.id,
            video=video_file_id,
            caption="✅ @teztort_bot orqali yuklab olindi",
        )
        await bot.send_audio(
            chat_id=message.chat.id,
            audio=audio_file_id,
        )

        logger.info("Yangi media yuklandi va keshlandi: %s", normalized)

    except yt_dlp.utils.DownloadError as e:
        logger.error("yt-dlp xatolik: %s", e)
        await message.answer(
            "❌ Videoni yuklab bo'lmadi.\n"
            "Sabablari: profil yopiq, havola noto'g'ri yoki "
            "platforma tomonidan cheklangan."
        )
    except Exception as e:
        logger.error("Kutilmagan xatolik: %s", e)
        await message.answer(
            "❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
        )
    finally:
        # 5) Lokal fayllarni ALBATTA o'chirish — disk to'lishining oldini olish
        for path in (video_path, audio_path):
            try:
                if os.path.exists(path):
                    os.remove(path)
                    logger.info("Lokal fayl o'chirildi: %s", path)
            except OSError as e:
                logger.error("Faylni o'chirib bo'lmadi %s: %s", path, e)

        # Kutish xabarini o'chirish
        try:
            await wait_msg.delete()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# ISHGA TUSHIRISH
# ---------------------------------------------------------------------------


async def main() -> None:
    logger.info("Bot ishga tushmoqda...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
