// =============================================
// Gemini AI Client
// Unified AI interface using Google Gemini.
// =============================================

import { env } from "../utils/env";

export type AIProvider = "gemini";

export interface AICompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Unified AI completion interface using Gemini.
 */
export async function getAICompletion(
  options: AICompletionOptions
): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    maxTokens = 300,
    temperature = 0.6,
  } = options;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\n${userPrompt}` },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() ?? "Summary unavailable.";
  } catch (err) {
    console.error("[ai] Gemini API error:", err);
    return "AI summary temporarily unavailable.";
  }
}
