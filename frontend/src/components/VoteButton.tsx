"use client";

import { useState } from "react";
import { vote } from "@/lib/api";
import { getTelegramWebApp } from "@/lib/telegram";

interface VoteButtonProps {
  problemId: number;
  initialVotes: number;
  initialVoted: boolean;
}

export default function VoteButton({
  problemId,
  initialVotes,
  initialVoted,
}: VoteButtonProps) {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(initialVoted);
  const [loading, setLoading] = useState(false);

  const handleVote = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await vote(problemId);
      setVotes(result.votes);
      setVoted(result.voted);

      const webapp = getTelegramWebApp();
      webapp?.HapticFeedback.impactOccurred("medium");
    } catch (error) {
      console.error("Vote error:", error);
      const webapp = getTelegramWebApp();
      webapp?.HapticFeedback.notificationOccurred("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 ${
        voted
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
      } ${loading ? "opacity-60" : ""}`}
    >
      <span className="text-xl">{voted ? "👍" : "🗳️"}</span>
      <span>{votes}</span>
      <span className="text-sm">{voted ? "Ovoz berildi" : "Ovoz berish"}</span>
    </button>
  );
}
