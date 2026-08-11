export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

/**
 * Returns the configured Gemini model identifier.
 * Uses process.env.GEMINI_MODEL if explicitly configured, otherwise falls back to DEFAULT_GEMINI_MODEL ('gemini-3.6-flash').
 */
export function getGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL;
  if (configured && configured.trim() !== '') {
    return configured.trim();
  }
  return DEFAULT_GEMINI_MODEL;
}
