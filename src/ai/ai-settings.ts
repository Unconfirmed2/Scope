/** Available Claude models and AI generation settings */

export type ClaudeModel = {
  id: string;
  label: string;
  description: string;
};

export const CLAUDE_MODELS: ClaudeModel[] = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Best balance of speed and intelligence' },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', description: 'Most capable, slower and more expensive' },
  { id: 'claude-haiku-4-20250506', label: 'Claude Haiku 4', description: 'Fastest and most affordable' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Previous generation, well-tested' },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', description: 'Previous generation, fast' },
];

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_TOKENS = 4000;

export type AiSettings = {
  model: string;
  temperature: number;
  maxTokens: number;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  model: DEFAULT_MODEL,
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
};

const AI_SETTINGS_KEY = 'scope-ai-settings';

export function loadAiSettings(): AiSettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      model: typeof parsed.model === 'string' ? parsed.model : DEFAULT_MODEL,
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_TEMPERATURE,
      maxTokens: typeof parsed.maxTokens === 'number' ? parsed.maxTokens : DEFAULT_MAX_TOKENS,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}
