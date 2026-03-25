const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeProblem(title, description) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI analyst for a civic problem reporting platform in Uzbekistan.
Analyze the reported problem and return a JSON object with these fields:
- category: one of ["transport", "education", "health", "infrastructure", "environment", "safety", "social", "economy", "technology", "other"]
- sentiment: one of ["positive", "neutral", "negative"]
- urgency: one of ["low", "medium", "high", "critical"]
- summary: a brief 1-2 sentence summary of the problem in Uzbek

Respond ONLY with valid JSON, no extra text.`,
        },
        {
          role: "user",
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const text = response.choices[0].message.content.trim();
    const parsed = JSON.parse(text);

    return {
      category: parsed.category || "other",
      sentiment: parsed.sentiment || "neutral",
      urgency: parsed.urgency || "medium",
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("AI analysis error:", error.message);
    return {
      category: "other",
      sentiment: "neutral",
      urgency: "medium",
      summary: "",
    };
  }
}

async function generateInsights(problems) {
  try {
    const problemsSummary = problems
      .slice(0, 50)
      .map((p) => `- [${p.category}/${p.urgency}] ${p.title} (${p.votes} votes)`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You analyze civic problems reported by citizens in Uzbekistan.
Given a list of problems, generate insights in JSON format:
{
  "top_issues": ["issue1", "issue2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "trending_categories": ["cat1", "cat2", ...],
  "urgency_summary": "brief text",
  "overall_sentiment": "brief text"
}
Respond in Uzbek language. Only valid JSON.`,
        },
        {
          role: "user",
          content: problemsSummary,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    return JSON.parse(response.choices[0].message.content.trim());
  } catch (error) {
    console.error("Insight generation error:", error.message);
    return {
      top_issues: [],
      recommendations: [],
      trending_categories: [],
      urgency_summary: "Ma'lumot yetarli emas",
      overall_sentiment: "Neutral",
    };
  }
}

module.exports = { analyzeProblem, generateInsights };
