/**
 * groq.js — Groq Whisper API helper
 * Transcribes an audio File/Blob using whisper-large-v3
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";

/**
 * @param {File|Blob} audioFile  Audio file from input or MediaRecorder
 * @param {string}    filename   Optional filename hint (e.g. "recording.webm")
 * @returns {Promise<string>}   Transcribed text
 */
export async function transcribeAudio(audioFile, filename = "audio.webm") {
  const apiKey = window.__ENV?.GROQ_API_KEY;
  if (!apiKey || apiKey === "REPLACE_ME") {
    throw new Error("GROQ_API_KEY not configured. Set it in env-config.js.");
  }

  const formData = new FormData();
  formData.append("file", audioFile, filename);
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "json");
  formData.append("language", "en");

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Do NOT set Content-Type — browser sets it with correct boundary for multipart
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error ${response.status}: ${err?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const text = data?.text?.trim();

  if (!text) throw new Error("Groq returned an empty transcription.");
  return text;
}
