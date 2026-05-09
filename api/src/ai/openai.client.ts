// =============================================
// Gemini AI Client Wrapper
// Unified AI interface for portfolio summaries
// and chat interactions.
// =============================================

import { env } from "../utils/env";

export interface AICompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Call Gemini API for text generation.
 * Uses REST API (no SDK needed for simplicity).
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[gemini] API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() ?? "Summary unavailable.";
  } catch (err) {
    console.error("[gemini] Completion error:", err);
    return "AI summary temporarily unavailable.";
  }
}
