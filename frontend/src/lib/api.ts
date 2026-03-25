const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function getInitData(): string {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initData;
  }
  return "";
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "x-telegram-init-data": getInitData(),
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return res.json();
}

export async function getProblems(params?: {
  category?: string;
  sort?: string;
  page?: number;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.sort) query.set("sort", params.sort);
  if (params?.page) query.set("page", String(params.page));
  if (params?.search) query.set("search", params.search);

  return request(`/problems?${query.toString()}`);
}

export async function getProblem(id: number) {
  return request(`/problems/${id}`);
}

export async function submitProblem(data: FormData) {
  return request("/problems", {
    method: "POST",
    body: data,
  });
}

export async function vote(problemId: number) {
  return request("/vote", {
    method: "POST",
    body: JSON.stringify({ problem_id: problemId }),
  });
}

export async function checkVote(problemId: number) {
  return request(`/vote/check/${problemId}`);
}

export async function getAnalytics() {
  return request("/analytics");
}

export async function getInsights() {
  return request("/analytics/insights");
}

export async function getHeatmapData() {
  return request("/analytics/heatmap");
}
