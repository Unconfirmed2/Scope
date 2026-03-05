import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, TextBlock, Message } from '@anthropic-ai/sdk/resources/messages';

// Validate API key at module load
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set. AI features will fail at runtime.');
}

// Initialize Claude API client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude model configuration
export const CLAUDE_MODEL = 'claude-4-sonnet-20250514';

// Max input length to prevent abuse (characters)
const MAX_INPUT_LENGTH = 50_000;

// Type guard for text blocks
function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === 'text';
}

// Retry helper with exponential backoff for transient API errors
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return error.status === 429 || error.status === 500 || error.status === 503 || error.status === 529;
  }
  if (error instanceof Error && error.message.includes('fetch failed')) {
    return true; // Network error
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`Claude API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Validate input length
function validateInputLength(text: string, label: string): void {
  if (text.length > MAX_INPUT_LENGTH) {
    throw new Error(`${label} exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`);
  }
}

// Helper function for generating content with Claude
export async function generateContent(
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 4000
): Promise<string> {
  validateInputLength(prompt, 'Prompt');
  if (systemPrompt) validateInputLength(systemPrompt, 'System prompt');

  return withRetry(async () => {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      ...(systemPrompt && { system: systemPrompt }),
    });

    const text = message.content
      .filter(isTextBlock)
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (text.length > 0) return text;

    throw new Error('Unexpected response format from Claude API (no text content)');
  });
}

// Cache-aware helper: allow composing system/user content blocks and optionally enabling Anthropic prompt caching.
export type CacheableTextBlock = { text: string; cache?: boolean };

type CacheControlBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };

export async function generateContentBlocks(
  params: {
    user: CacheableTextBlock[];
    system?: string | CacheableTextBlock[];
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const { user, system, maxTokens = 4000, temperature = 0.6 } = params;

  // Validate total input size
  const totalUserText = user.map(b => b.text).join('');
  validateInputLength(totalUserText, 'User input');

  // Gate attaching cache_control so we don't risk API errors if beta isn't active
  const enableCache = process.env.ANTHROPIC_PROMPT_CACHING === '1';

  // Map to Anthropic content blocks, attaching cache_control when requested and enabled
  const mapBlock = (b: CacheableTextBlock): CacheControlBlock => ({
    type: 'text',
    text: b.text,
    ...(enableCache && b.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
  });

  const systemPayload: string | CacheControlBlock[] | undefined = Array.isArray(system)
    ? system.map(mapBlock)
    : system
      ? system
      : undefined;

  const userPayload: CacheControlBlock[] = user.map(mapBlock);

  return withRetry(async () => {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: userPayload,
        },
      ],
      ...(systemPayload !== undefined ? { system: systemPayload } : {}),
    } as Parameters<typeof anthropic.messages.create>[0]) as Message;

    // Optional: log cache usage hints if present in response (best-effort)
    try {
      const usage = message.usage as unknown as Record<string, unknown>;
      if (usage && (usage.cache_creation_tokens || usage.cache_read_tokens)) {
        console.debug('Anthropic cache usage', {
          cache_creation_tokens: usage.cache_creation_tokens,
          cache_read_tokens: usage.cache_read_tokens,
        });
      }
    } catch { /* best-effort logging */ }

    const text = message.content
      .filter(isTextBlock)
      .map((block: TextBlock) => block.text)
      .join('\n')
      .trim();

    if (text.length > 0) return text;

    throw new Error('Unexpected response format from Claude API (no text content)');
  });
}
