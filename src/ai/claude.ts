import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude API client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude model configuration
export const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

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
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      ...(systemPrompt && { system: systemPrompt }),
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    
    throw new Error('Unexpected response format from Claude API');
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to generate content with Claude API');
  }
}