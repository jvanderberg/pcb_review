/**
 * Anthropic Claude API Client
 */

import type { ModelOption } from '../types';

export const ANTHROPIC_MODELS: ModelOption[] = [
  // Claude 4 models
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Recommended)', contextWindow: 200000 },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (Most Capable)', contextWindow: 200000 },
  // Claude 3.5 models
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast/Cheap)', contextWindow: 200000 },
  // Claude 3 models
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000 },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextWindow: 200000 },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextWindow: 200000 },
];

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicError {
  error: {
    type: string;
    message: string;
  };
}

/**
 * Call the Anthropic API with messages
 */
export async function callAnthropic(
  apiKey: string,
  model: string,
  messages: AnthropicMessage[],
  systemPrompt: string,
  onStream?: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages,
      stream: !!onStream,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json() as AnthropicError;
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  if (onStream && response.body) {
    return await streamAnthropicResponse(response.body, onStream, signal);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function streamAnthropicResponse(
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

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullContent += parsed.delta.text;
              onStream(parsed.delta.text);
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
 * Validate an Anthropic API key by making a simple request
 */
export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    // Make a minimal request to check the key
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    // 200 = valid, 401 = invalid key, other errors might be rate limits but key is valid
    return response.ok || (response.status !== 401 && response.status !== 403);
  } catch {
    return false;
  }
}
