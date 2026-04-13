/**
 * gemini.js — Groq API helper (retained filename for compatibility)
 * Sends report text → structured JSON extraction of
 * { location, needType, urgencyScore, populationAffected }
 *
 * NOTE: Rewritten to use Groq API with Llama 3 as requested.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * @param {string} reportText  Raw field-worker report text
 * @returns {Promise<{location:string, needType:string, urgencyScore:number, populationAffected:number}>}
 */
export async function extractReportData(reportText) {
  const apiKey = window.__ENV?.GROQ_API_KEY;
  if (!apiKey || apiKey === "REPLACE_ME") {
    throw new Error("GROQ_API_KEY not configured. Set it in env-config.js.");
  }

  const prompt = `
You are a humanitarian crisis data extractor. Analyze the following field report and extract structured information.

Field Report:
"${reportText}"

Return ONLY a valid JSON object (no markdown, no explanation) with exactly these fields:
{
  "location": "<city, region, or place mentioned>",
  "needType": "<primary need: Food | Water | Medical | Shelter | Evacuation | Other>",
  "urgencyScore": <integer 1-10, 10 being most critical>,
  "populationAffected": <estimated number of people affected as integer>
}

Rules:
- If location is unclear, infer from context or use "Unknown"
- urgencyScore must be an integer between 1 and 10
- populationAffected must be an integer (estimate if not explicit)
- needType must be one of: Food, Water, Medical, Shelter, Evacuation, Other
`.trim();

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      top_p: 0.8,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq API error ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content ?? "";

  // Strip possible markdown code fences
  const jsonText = rawText.replace(/```(?:json)?/gi, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Could not parse Groq response as JSON: ${rawText}`);
  }

  // Normalise
  return {
    location: String(parsed.location || "Unknown"),
    needType: String(parsed.needType || "Other"),
    urgencyScore: Math.min(10, Math.max(1, parseInt(parsed.urgencyScore) || 5)),
    populationAffected: Math.max(0, parseInt(parsed.populationAffected) || 0),
  };
}
