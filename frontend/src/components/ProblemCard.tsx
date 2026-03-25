"use client";

import Link from "next/link";

interface Problem {
  id: number;
  title: string;
  description: string;
  category: string;
  sentiment: string;
  urgency: string;
  votes: number;
  location_name?: string;
  created_at: string;
  username?: string;
  first_name?: string;
}

const urgencyColors: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const sentimentIcons: Record<string, string> = {
  positive: "😊",
  neutral: "😐",
  negative: "😠",
};

const categoryIcons: Record<string, string> = {
  transport: "🚌",
  education: "📚",
  health: "🏥",
  infrastructure: "🏗️",
  environment: "🌿",
  safety: "🛡️",
  social: "👥",
  economy: "💰",
  technology: "💻",
  other: "📋",
};

export default function ProblemCard({ problem }: { problem: Problem }) {
  const timeAgo = getTimeAgo(problem.created_at);

  return (
    <Link href={`/problems/${problem.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-lg">
                {categoryIcons[problem.category] || "📋"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  urgencyColors[problem.urgency] || urgencyColors.medium
                }`}
              >
                {problem.urgency}
              </span>
              <span className="text-sm">
                {sentimentIcons[problem.sentiment] || "😐"}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">
              {problem.title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">
              {problem.description}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 text-center">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-lg block">
                {problem.votes}
              </span>
              <span className="text-blue-500 dark:text-blue-400 text-[10px]">
                ovoz
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <span>👤</span>
            <span>{problem.first_name || problem.username || "Anonim"}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            {problem.location_name && (
              <span className="flex items-center gap-1">
                📍 {problem.location_name}
              </span>
            )}
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "hozirgina";
  if (diff < 3600) return `${Math.floor(diff / 60)} min oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} kun oldin`;
  return date.toLocaleDateString("uz-UZ");
}
