import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude API client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude model configuration
export const CLAUDE_MODEL = 'claude-4-sonnet-20250514';

// Helper function for generating content with Claude
export async function generateContent(
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 4000
): Promise<string> {
  try {
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

    // Concatenate any text parts; ignore non-text blocks like tool_use/images
    const text = message.content
      .filter((block: any) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text)
      .join('\n')
      .trim();

    if (text.length > 0) return text;

    throw new Error('Unexpected response format from Claude API (no text content)');
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to generate content with Claude API');
  }
}

// Cache-aware helper: allow composing system/user content blocks and optionally enabling Anthropic prompt caching.
// Usage: pass long, stable blocks (e.g., system spec, large JSON context) as cacheable.
// Note: Actual cache effectiveness requires Anthropic prompt-caching beta to be enabled for the key/account.
export type CacheableTextBlock = { text: string; cache?: boolean };

export async function generateContentBlocks(
  params: {
    user: CacheableTextBlock[];
    system?: string | CacheableTextBlock[];
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const { user, system, maxTokens = 4000, temperature = 0.6 } = params;

  // Gate attaching cache_control so we don't risk API errors if beta isn't active
  const enableCache = process.env.ANTHROPIC_PROMPT_CACHING === '1';

  // Map to Anthropic content blocks, attaching cache_control when requested and enabled
  const mapBlock = (b: CacheableTextBlock): any => ({
    type: 'text',
    text: b.text,
    ...(enableCache && b.cache ? { cache_control: { type: 'ephemeral' } } : {}),
  });

  const systemPayload: any = Array.isArray(system)
    ? system.map(mapBlock)
    : system
      ? system
      : undefined;

  const userPayload: any = user.map(mapBlock);

  try {
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
    } as any);

    // Optional: log cache usage hints if present in response (best-effort)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m: any = message as any;
      const usage = m?.usage;
      if (usage && (usage.cache_creation_tokens || usage.cache_read_tokens)) {
        console.debug('Anthropic cache usage', {
          cache_creation_tokens: usage.cache_creation_tokens,
          cache_read_tokens: usage.cache_read_tokens,
        });
      }
    } catch {}

    const text = message.content
      .filter((block: any) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text)
      .join('\n')
      .trim();

    if (text.length > 0) return text;

    throw new Error('Unexpected response format from Claude API (no text content)');
  } catch (error) {
    console.error('Error calling Claude API (blocks):', error);
    throw new Error('Failed to generate content with Claude API');
  }
}