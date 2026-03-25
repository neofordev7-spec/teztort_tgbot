"use client";

import { useState, useEffect, useCallback } from "react";
import { getProblems } from "@/lib/api";
import ProblemCard from "@/components/ProblemCard";
import FilterBar from "@/components/FilterBar";

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

export default function HomePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProblems({ category, sort, page, search });
      setProblems(data.problems);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch problems:", error);
    } finally {
      setLoading(false);
    }
  }, [category, sort, page, search]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CitySense
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Muammolarni xabar qiling
          </p>
        </div>
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
          CS
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Muammolarni qidirish..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
      </div>

      {/* Filters */}
      <FilterBar
        activeCategory={category}
        activeSort={sort}
        onCategoryChange={(c) => {
          setCategory(c);
          setPage(1);
        }}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
      />

      {/* Problems List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-gray-500 dark:text-gray-400">
            Hali muammolar yo&apos;q
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Birinchi bo&apos;lib muammo yuboring!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 py-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm disabled:opacity-40"
          >
            Oldingi
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm disabled:opacity-40"
          >
            Keyingi
          </button>
        </div>
      )}
    </div>
  );
}
