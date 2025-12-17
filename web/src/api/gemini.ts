/**
 * Google Gemini API Client
 */

import type { ModelOption } from '../types';

export const GEMINI_MODELS: ModelOption[] = [
  // Gemini 2.0 models
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)', contextWindow: 1000000 },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite (Fast)', contextWindow: 1000000 },
  // Gemini 1.5 models
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (High Capability)', contextWindow: 2000000 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000 },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B (Cheapest)', contextWindow: 1000000 },
];

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Call the Gemini API with messages
 */
export async function callGemini(
  apiKey: string,
  model: string,
  messages: GeminiMessage[],
  systemPrompt: string,
  onStream?: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const endpoint = onStream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: messages,
      systemInstruction: systemPrompt ? {
        parts: [{ text: systemPrompt }],
      } : undefined,
      generationConfig: {
        maxOutputTokens: 8192,
      },
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json() as GeminiError;
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  if (onStream && response.body) {
    return await streamGeminiResponse(response.body, onStream, signal);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function streamGeminiResponse(
  body: ReadableStream<Uint8Array>,
  onStream: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        throw new DOMException('Aborted', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullContent += text;
              onStream(text);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw err;
  }

  return fullContent;
}

/**
 * Validate a Gemini API key by making a simple request
 */
export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  try {
    // Make a minimal request to check the key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    // 200 = valid, 400/403 = invalid key, other errors might be rate limits but key is valid
    return response.ok || (response.status !== 400 && response.status !== 403);
  } catch {
    return false;
  }
}
