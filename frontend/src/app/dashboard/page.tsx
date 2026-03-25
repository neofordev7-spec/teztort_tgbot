"use client";

import { useState, useEffect } from "react";
import { getAnalytics, getInsights } from "@/lib/api";

interface Analytics {
  stats: { totalProblems: number; totalUsers: number; totalVotes: number };
  categories: { category: string; count: string }[];
  sentiments: { sentiment: string; count: string }[];
  urgencies: { urgency: string; count: string }[];
  topProblems: {
    id: number;
    title: string;
    category: string;
    votes: number;
    urgency: string;
  }[];
  weeklyTop: {
    id: number;
    title: string;
    votes: number;
    urgency: string;
  }[];
  dailyTrend: { date: string; count: string }[];
  topUsers: {
    username: string;
    first_name: string;
    problems_count: number;
    votes_count: number;
    badge: string;
  }[];
}

interface Insights {
  top_issues: string[];
  recommendations: string[];
  trending_categories: string[];
  urgency_summary: string;
  overall_sentiment: string;
}

const urgencyEmoji: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

const badgeEmoji: Record<string, string> = {
  newcomer: "🆕",
  contributor: "⭐",
  activist: "🏅",
  expert: "🏆",
};

const categoryEmoji: Record<string, string> = {
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

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "insights">("stats");

  useEffect(() => {
    async function load() {
      try {
        const [a, i] = await Promise.all([
          getAnalytics(),
          getInsights().catch(() => null),
        ]);
        setAnalytics(a);
        setInsights(i);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl block mb-3">📊</span>
        <p className="text-gray-500">Ma&apos;lumot yuklanmadi</p>
      </div>
    );
  }

  const maxCategoryCount = Math.max(
    ...analytics.categories.map((c) => parseInt(c.count)),
    1
  );

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        📊 Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon="📝"
          value={analytics.stats.totalProblems}
          label="Muammolar"
        />
        <StatCard
          icon="👥"
          value={analytics.stats.totalUsers}
          label="Foydalanuvchilar"
        />
        <StatCard
          icon="🗳"
          value={analytics.stats.totalVotes}
          label="Ovozlar"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "stats"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          }`}
        >
          Statistika
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "insights"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          }`}
        >
          AI Insights
        </button>
      </div>

      {activeTab === "stats" ? (
        <>
          {/* Category Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Kategoriyalar
            </h3>
            <div className="space-y-2">
              {analytics.categories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="w-6 text-center">
                    {categoryEmoji[cat.category] || "📋"}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate">
                    {cat.category}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{
                        width: `${(parseInt(cat.count) / maxCategoryCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency & Sentiment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                Dolzarblik
              </h3>
              {analytics.urgencies.map((u) => (
                <div
                  key={u.urgency}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-xs">
                    {urgencyEmoji[u.urgency]} {u.urgency}
                  </span>
                  <span className="text-xs font-bold">{u.count}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                Sentiment
              </h3>
              {analytics.sentiments.map((s) => (
                <div
                  key={s.sentiment}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-xs">
                    {s.sentiment === "positive"
                      ? "😊"
                      : s.sentiment === "negative"
                      ? "😠"
                      : "😐"}{" "}
                    {s.sentiment}
                  </span>
                  <span className="text-xs font-bold">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Top */}
          {analytics.weeklyTop.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                🔥 Haftalik top muammolar
              </h3>
              <div className="space-y-2">
                {analytics.weeklyTop.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-400 w-6">
                      {i + 1}
                    </span>
                    <span className="text-sm flex-1 truncate text-gray-700 dark:text-gray-300">
                      {urgencyEmoji[p.urgency]} {p.title}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      {p.votes} 🗳
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Users */}
          {analytics.topUsers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                🏆 Eng faol foydalanuvchilar
              </h3>
              <div className="space-y-2">
                {analytics.topUsers.map((u, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-400 w-6">
                      {i + 1}
                    </span>
                    <span className="text-sm flex-1 text-gray-700 dark:text-gray-300">
                      {badgeEmoji[u.badge] || "🆕"}{" "}
                      {u.first_name || u.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {u.problems_count} muammo, {u.votes_count} ovoz
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* AI Insights Tab */
        <div className="space-y-4">
          {insights ? (
            <>
              {insights.top_issues.length > 0 && (
                <InsightCard
                  title="🔝 Asosiy muammolar"
                  items={insights.top_issues}
                />
              )}
              {insights.recommendations.length > 0 && (
                <InsightCard
                  title="💡 Tavsiyalar"
                  items={insights.recommendations}
                />
              )}
              {insights.trending_categories.length > 0 && (
                <InsightCard
                  title="📈 Trend kategoriyalar"
                  items={insights.trending_categories}
                />
              )}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📊 Umumiy tahlil
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Dolzarblik:</strong> {insights.urgency_summary}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Kayfiyat:</strong> {insights.overall_sentiment}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <span className="text-4xl block mb-3">🤖</span>
              <p className="text-gray-500 text-sm">
                AI insightlar hozircha mavjud emas
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
      <span className="text-xl block">{icon}</span>
      <span className="text-xl font-bold text-gray-900 dark:text-white block">
        {value}
      </span>
      <span className="text-[10px] text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
          >
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
