"use client";

interface FilterBarProps {
  activeCategory: string;
  activeSort: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
}

const categories = [
  { value: "", label: "Hammasi" },
  { value: "transport", label: "🚌 Transport" },
  { value: "education", label: "📚 Ta'lim" },
  { value: "health", label: "🏥 Sog'liq" },
  { value: "infrastructure", label: "🏗️ Infratuzilma" },
  { value: "environment", label: "🌿 Atrof-muhit" },
  { value: "safety", label: "🛡️ Xavfsizlik" },
  { value: "social", label: "👥 Ijtimoiy" },
  { value: "economy", label: "💰 Iqtisod" },
  { value: "technology", label: "💻 Texnologiya" },
];

const sortOptions = [
  { value: "newest", label: "Yangi" },
  { value: "trending", label: "Trending" },
  { value: "oldest", label: "Eski" },
];

export default function FilterBar({
  activeCategory,
  activeSort,
  onCategoryChange,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Sort tabs */}
      <div className="flex gap-2">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeSort === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.value
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700"
                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
