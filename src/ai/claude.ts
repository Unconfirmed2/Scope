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