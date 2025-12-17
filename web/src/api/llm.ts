/**
 * Unified LLM Interface
 * Provides a common interface for calling different LLM providers
 */

import type { Provider, ModelOption } from '../types';
import { callOpenAI, validateOpenAIKey, OPENAI_MODELS, type OpenAIMessage } from './openai';
import { callAnthropic, validateAnthropicKey, ANTHROPIC_MODELS, type AnthropicMessage } from './anthropic';

export interface LLMConfig {
  provider: Provider;
  model: string;
  apiKey: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Get available models for a provider
 */
export function getModelsForProvider(provider: Provider): ModelOption[] {
  switch (provider) {
    case 'openai':
      return OPENAI_MODELS;
    case 'anthropic':
      return ANTHROPIC_MODELS;
    default:
      return [];
  }
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o';
    case 'anthropic':
      return 'claude-sonnet-4-20250514';
    default:
      return '';
  }
}

/**
 * Validate an API key for a provider
 */
export async function validateApiKey(provider: Provider, apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  switch (provider) {
    case 'openai':
      return validateOpenAIKey(apiKey);
    case 'anthropic':
      return validateAnthropicKey(apiKey);
    default:
      return false;
  }
}

/**
 * Validate API key and model together by making a minimal API call
 */
export async function validateApiKeyAndModel(
  provider: Provider,
  apiKey: string,
  model: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }
  if (!model || model.trim().length === 0) {
    return { valid: false, error: 'Model is required' };
  }

  try {
    // Make a minimal API call to validate both key and model
    const config: LLMConfig = { provider, apiKey, model };
    await callLLM(config, 'You are a helpful assistant.', 'Reply with just the word "OK".', undefined);
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Parse common error messages for better UX
    if (message.includes('does not exist') || message.includes('not found')) {
      return { valid: false, error: `Model "${model}" not available` };
    }
    if (message.includes('Invalid API') || message.includes('Incorrect API') || message.includes('invalid_api_key')) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (message.includes('quota') || message.includes('rate limit')) {
      return { valid: false, error: 'Rate limit or quota exceeded' };
    }

    return { valid: false, error: message };
  }
}

/**
 * Call an LLM with a system prompt and user prompt
 */
export async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string,
  onStream?: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const { provider, model, apiKey } = config;

  switch (provider) {
    case 'openai': {
      const messages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      return callOpenAI(apiKey, model, messages, onStream, signal);
    }

    case 'anthropic': {
      const messages: AnthropicMessage[] = [
        { role: 'user', content: userPrompt },
      ];
      return callAnthropic(apiKey, model, messages, systemPrompt, onStream, signal);
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Call an LLM with a full message history (for chat)
 */
export async function callLLMWithHistory(
  config: LLMConfig,
  systemPrompt: string,
  messages: Message[],
  onStream?: (chunk: string) => void
): Promise<string> {
  const { provider, model, apiKey } = config;

  switch (provider) {
    case 'openai': {
      const openAIMessages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];
      return callOpenAI(apiKey, model, openAIMessages, onStream);
    }

    case 'anthropic': {
      // Anthropic requires alternating user/assistant messages
      // and system is separate
      const anthropicMessages: AnthropicMessage[] = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Ensure first message is from user
      if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
        anthropicMessages.unshift({ role: 'user', content: 'Continue.' });
      }

      return callAnthropic(apiKey, model, anthropicMessages, systemPrompt, onStream);
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Estimate token count for a string (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}
