"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProblem, checkVote } from "@/lib/api";
import VoteButton from "@/components/VoteButton";
import { getTelegramWebApp } from "@/lib/telegram";

interface Problem {
  id: number;
  title: string;
  description: string;
  category: string;
  sentiment: string;
  urgency: string;
  votes: number;
  lat?: number;
  lng?: number;
  location_name?: string;
  image_url?: string;
  ai_summary?: string;
  created_at: string;
  username?: string;
  first_name?: string;
  badge?: string;
}

const urgencyLabels: Record<string, { label: string; color: string }> = {
  low: { label: "Past", color: "text-green-600 bg-green-50 dark:bg-green-900/30" },
  medium: { label: "O'rta", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30" },
  high: { label: "Yuqori", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
  critical: { label: "Kritik", color: "text-red-600 bg-red-50 dark:bg-red-900/30" },
};

const sentimentLabels: Record<string, string> = {
  positive: "😊 Ijobiy",
  neutral: "😐 Neytral",
  negative: "😠 Salbiy",
};

const categoryLabels: Record<string, string> = {
  transport: "🚌 Transport",
  education: "📚 Ta'lim",
  health: "🏥 Sog'liq",
  infrastructure: "🏗️ Infratuzilma",
  environment: "🌿 Atrof-muhit",
  safety: "🛡️ Xavfsizlik",
  social: "👥 Ijtimoiy",
  economy: "💰 Iqtisod",
  technology: "💻 Texnologiya",
  other: "📋 Boshqa",
};

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    webapp?.BackButton.show();
    const handleBack = () => router.back();
    webapp?.BackButton.onClick(handleBack);
    return () => {
      webapp?.BackButton.hide();
      webapp?.BackButton.offClick(handleBack);
    };
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        const [p, v] = await Promise.all([
          getProblem(Number(params.id)),
          checkVote(Number(params.id)).catch(() => ({ voted: false })),
        ]);
        setProblem(p);
        setVoted(v.voted);
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl block mb-3">❌</span>
        <p className="text-gray-500">Muammo topilmadi</p>
      </div>
    );
  }

  const urgency = urgencyLabels[problem.urgency] || urgencyLabels.medium;

  return (
    <div className="space-y-4 pb-8">
      {/* Image */}
      {problem.image_url && (
        <div className="rounded-xl overflow-hidden -mx-4 -mt-4">
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${problem.image_url}`}
            alt={problem.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          {categoryLabels[problem.category] || problem.category}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${urgency.color}`}
        >
          {urgency.label}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {sentimentLabels[problem.sentiment] || problem.sentiment}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
        {problem.title}
      </h1>

      {/* Author & Time */}
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          👤 {problem.first_name || problem.username || "Anonim"}
          {problem.badge && problem.badge !== "newcomer" && (
            <span className="text-xs">
              {problem.badge === "expert"
                ? "🏆"
                : problem.badge === "activist"
                ? "🏅"
                : "⭐"}
            </span>
          )}
        </span>
        <span>{new Date(problem.created_at).toLocaleDateString("uz-UZ")}</span>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {problem.description}
        </p>
      </div>

      {/* AI Summary */}
      {problem.ai_summary && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
          <p className="text-purple-700 dark:text-purple-300 font-medium text-sm mb-1">
            🤖 AI xulosasi
          </p>
          <p className="text-purple-600 dark:text-purple-400 text-sm">
            {problem.ai_summary}
          </p>
        </div>
      )}

      {/* Location */}
      {problem.location_name && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <span>📍</span>
          <span>{problem.location_name}</span>
          {problem.lat && problem.lng && (
            <span className="text-xs text-gray-400 ml-auto">
              {problem.lat.toFixed(4)}, {problem.lng.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Vote */}
      <div className="flex justify-center pt-2">
        <VoteButton
          problemId={problem.id}
          initialVotes={problem.votes}
          initialVoted={voted}
        />
      </div>
    </div>
  );
}
