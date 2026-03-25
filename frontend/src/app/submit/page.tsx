"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitProblem } from "@/lib/api";
import { getTelegramWebApp } from "@/lib/telegram";

export default function SubmitPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setLocating(false);
        const webapp = getTelegramWebApp();
        webapp?.HapticFeedback.notificationOccurred("success");
      },
      () => {
        setLocating(false);
        const webapp = getTelegramWebApp();
        webapp?.showAlert("Joylashuvni aniqlab bo'lmadi");
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      if (locationName) formData.append("location_name", locationName);
      if (lat) formData.append("lat", lat);
      if (lng) formData.append("lng", lng);
      if (image) formData.append("image", image);

      await submitProblem(formData);

      const webapp = getTelegramWebApp();
      webapp?.HapticFeedback.notificationOccurred("success");

      router.push("/");
    } catch (error) {
      console.error("Submit error:", error);
      const webapp = getTelegramWebApp();
      webapp?.showAlert("Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Muammo yuborish
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          AI avtomatik tahlil qiladi
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sarlavha *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Muammo haqida qisqacha..."
            maxLength={500}
            required
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Batafsil tavsif *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Muammoni batafsil tushuntiring..."
            maxLength={5000}
            rows={5}
            required
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {description.length}/5000
          </p>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Joylashuv
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Manzil nomi (masalan: Toshkent, Chilonzor)"
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={getLocation}
              disabled={locating}
              className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium shrink-0"
            >
              {locating ? "..." : "📍 GPS"}
            </button>
          </div>
          {lat && lng && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Koordinatalar aniqlandi: {parseFloat(lat).toFixed(4)},{" "}
              {parseFloat(lng).toFixed(4)}
            </p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rasm (ixtiyoriy)
          </label>
          <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 transition-colors overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <span className="text-3xl block mb-1">📷</span>
                <span className="text-xs text-gray-500">
                  Rasm yuklash (max 5MB)
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>

        {/* AI Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm">
          <p className="text-blue-700 dark:text-blue-300 font-medium">
            🤖 AI avtomatik qo&apos;shadi:
          </p>
          <ul className="text-blue-600 dark:text-blue-400 text-xs mt-1 space-y-0.5">
            <li>• Kategoriya (transport, ta&apos;lim, sog&apos;liq...)</li>
            <li>• Sentiment tahlili (ijobiy/salbiy/neytral)</li>
            <li>• Dolzarblik darajasi (past/o&apos;rta/yuqori/kritik)</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !title.trim() || !description.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI tahlil qilmoqda...
            </span>
          ) : (
            "Muammoni yuborish"
          )}
        </button>
      </form>
    </div>
  );
}
