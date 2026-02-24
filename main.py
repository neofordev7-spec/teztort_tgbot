import asyncio
import os
import logging
import uuid
import sqlite3
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart
from aiogram.types import FSInputFile
import yt_dlp

# --- SOZLAMALAR ---
BOT_TOKEN = "8261776746:AAG2neZFTJ0NS_F23m8h16bMK3JviFvA2aQ"
CHANNEL_ID = -1003553912000  # Kesh kanali ID raqami (minus bilan)

# Logging
logging.basicConfig(level=logging.INFO)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- BAZA (SQLite) ---
conn = sqlite3.connect('video_cache.db', check_same_thread=False)
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS videos (
        link TEXT PRIMARY KEY,
        file_id TEXT
    )
''')
conn.commit()

def add_to_db(link, file_id):
    try:
        cursor.execute("INSERT OR REPLACE INTO videos (link, file_id) VALUES (?, ?)", (link, file_id))
        conn.commit()
    except:
        pass

def get_from_db(link):
    cursor.execute("SELECT file_id FROM videos WHERE link = ?", (link,))
    res = cursor.fetchone()
    return res[0] if res else None

def clean_url(url):
    return url.split('?')[0]  # Linkni tozalash

# --- ASOSIY MANTIQ ---

@dp.message(CommandStart())
async def start(message: types.Message):
    await message.answer("Salom! Instagram link yuboring.")

@dp.message(F.text.contains("instagram.com"))
async def handle_instagram(message: types.Message):
    original_url = message.text.strip()
    clean_link = clean_url(original_url)

    # 1. BAZADAN TEKSHIRISH
    cached_id = get_from_db(clean_link)
    if cached_id:
        try:
            await bot.send_video(message.chat.id, video=cached_id, caption="⚡️ Tezkor yuklash (Cache)")
            return
        except Exception:
            # Agar eski file_id ishlamasa, qayta yuklaymiz
            pass

    wait_msg = await message.answer("⏳ Video yuklanmoqda... (Serverga)")

    # Har bir foydalanuvchi uchun unikal fayl nomi
    unique_name = f"video_{uuid.uuid4()}.mp4"

    try:
        # 2. DISKKA YUKLASH (Asinxron tarzda)
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(None, download_video_sync, original_url, unique_name)

        if not success:
            await message.answer("❌ Videoni yuklab bo'lmadi yoki profil yopiq.")
            await wait_msg.delete()
            return

        # 3. KANALGA YUKLASH (Cache yaratish)
        video_file = FSInputFile(unique_name)
        sent_msg = await bot.send_video(chat_id=CHANNEL_ID, video=video_file, caption=f"Source: {clean_link}")
        new_file_id = sent_msg.video.file_id

        # 4. BAZAGA SAQLASH
        add_to_db(clean_link, new_file_id)

        # 5. FOYDALANUVCHIGA YUBORISH
        await bot.send_video(chat_id=message.chat.id, video=new_file_id, caption="✅ Yuklab olindi")
        await wait_msg.delete()

    except Exception as e:
        await message.answer(f"Xatolik: {e}")

    finally:
        # 6. ENG MUHIMI: FAYLNI O'CHIRISH
        # Xatolik bo'lsa ham, bo'lmasa ham fayl o'chadi. Disk to'lmaydi.
        if os.path.exists(unique_name):
            os.remove(unique_name)

# Sinxron funksiya (yt-dlp uchun)
def download_video_sync(url, filename):
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'outtmpl': filename,
        'quiet': True,
        'max_filesize': 50 * 1024 * 1024, # 50MB dan kattasini yuklamasin (xavfsizlik uchun)
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return True
    except Exception as e:
        print(f"Download Error: {e}")
        return False

# --- ISHGA TUSHIRISH ---
async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())