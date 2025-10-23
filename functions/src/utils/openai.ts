import OpenAI from 'openai';
import * as functions from 'firebase-functions';

// OpenAI configuration constants
const OPENAI_TEMPERATURE = 0.3;
const OPENAI_MAX_TOKENS = 500;

// Initialize OpenAI client (lazy initialization)
let openaiClient: OpenAI | null = null;

/**
 * Get OpenAI API key from environment or Firebase config
 * @returns API key
 */
function getAPIKey(): string {
  // Try environment variable first (for local .env)
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  
  // Try Firebase config (for deployed functions)
  try {
    const config = functions.config();
    if (config.openai?.key) {
      return config.openai.key;
    }
  } catch (error) {
    // Firebase config not available in emulator without proper setup
    console.warn('Firebase config not available:', error);
  }
  
  throw new Error('OPENAI_API_KEY not found in environment variables or Firebase config');
}

/**
 * Get or create the OpenAI client instance
 * @returns OpenAI client
 * @throws Error if API key is not configured
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = getAPIKey();
    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}

/**
 * Get the configured OpenAI model
 * @returns Model name (default: gpt-4o-mini)
 */
export function getOpenAIModel(): string {
  // Try environment variable first
  if (process.env.OPENAI_MODEL) {
    return process.env.OPENAI_MODEL;
  }
  
  // Try Firebase config
  try {
    const config = functions.config();
    if (config.openai?.model) {
      return config.openai.model;
    }
  } catch (error) {
    // Firebase config not available
  }
  
  // Default to gpt-4o-mini
  return 'gpt-4o-mini';
}

/**
 * Get the configured temperature
 * @returns Temperature value (default: 0.3)
 */
export function getOpenAITemperature(): number {
  return OPENAI_TEMPERATURE;
}

/**
 * Get the configured max tokens
 * @returns Max tokens (default: 500)
 */
export function getOpenAIMaxTokens(): number {
  return OPENAI_MAX_TOKENS;
}

/**
 * Make a completion request to OpenAI
 * @param systemPrompt - System prompt for the model
 * @param userPrompt - User prompt
 * @param options - Optional overrides for model, temperature, max_tokens
 * @returns Completion text
 */
export async function createCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<{ text: string; tokensUsed: number }> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: options?.model || getOpenAIModel(),
    temperature: options?.temperature ?? OPENAI_TEMPERATURE,
    max_tokens: options?.max_tokens || OPENAI_MAX_TOKENS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = completion.choices[0]?.message?.content || '';
  const tokensUsed = completion.usage?.total_tokens || 0;

  return { text, tokensUsed };
}

