// AI assistance for tasks, powered by the user's own Gemini API key.
//
// Design note: this extension ships NO API key. Bundling one would hand the
// developer's billed credentials to every installer, since anyone can unzip a
// CRX and read the bundle. Instead the user supplies their own key in
// Settings, and it is stored in chrome.storage.local (device-local, never
// synced, never committed).

import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from './storageService';

const MODEL = 'gemini-2.0-flash';

/** Thrown when the user has not configured a key yet. */
export class AiNotConfiguredError extends Error {
  constructor() {
    super('Add your Gemini API key in Settings to use AI features.');
    this.name = 'AiNotConfiguredError';
  }
}

/** Thrown when the key exists but Google rejected the request. */
export class AiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRequestError';
  }
}

// Cache the client so we don't rebuild it on every keystroke, but rebuild it
// as soon as the stored key changes.
let cached: { key: string; client: GoogleGenAI } | null = null;

const getClient = async (): Promise<GoogleGenAI> => {
  const key = await getGeminiApiKey();
  if (!key) throw new AiNotConfiguredError();

  if (cached && cached.key === key) return cached.client;

  try {
    const client = new GoogleGenAI({ apiKey: key });
    cached = { key, client };
    return client;
  } catch (e) {
    throw new AiRequestError('Could not initialize the Gemini client.');
  }
};

/** Clears the memoized client. Call after the user changes their key. */
export const resetAiClient = (): void => {
  cached = null;
};

/** True when a key is stored, without making a network call. */
export const isAiConfigured = async (): Promise<boolean> => {
  return Boolean(await getGeminiApiKey());
};

const toFriendlyError = (error: unknown): AiRequestError => {
  const raw = error instanceof Error ? error.message : String(error);

  if (/API[_ ]?key not valid|API_KEY_INVALID|invalid.*api key/i.test(raw)) {
    return new AiRequestError('That API key was rejected. Check it in Settings.');
  }
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(raw)) {
    return new AiRequestError('Gemini rate limit reached. Try again in a minute.');
  }
  if (/PERMISSION_DENIED|403/i.test(raw)) {
    return new AiRequestError('This key lacks permission for the Gemini API.');
  }
  if (/fetch|network|Failed to fetch/i.test(raw)) {
    return new AiRequestError('Could not reach Gemini. Check your connection.');
  }
  return new AiRequestError('AI request failed. Please try again.');
};

const generate = async (prompt: string): Promise<string> => {
  const client = await getClient();
  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return response.text?.trim() || '';
  } catch (error) {
    throw toFriendlyError(error);
  }
};

/**
 * Validates a key by making one cheap real request.
 * Returns a result object rather than throwing so the Settings UI can render
 * the failure inline.
 */
export const verifyApiKey = async (
  key: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, error: 'Enter a key first.' };

  try {
    const client = new GoogleGenAI({ apiKey: trimmed });
    await client.models.generateContent({ model: MODEL, contents: 'Reply with OK.' });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toFriendlyError(error).message };
  }
};

/** Rewrites a rough task title into something concise and actionable. */
export const enhanceTaskDescription = async (rawInput: string): Promise<string> => {
  const input = rawInput.trim();
  if (!input) return rawInput;

  const text = await generate(
    `Rewrite this raw task note as a concise, actionable task title.
Rules: under 8 words, no quotes, no trailing period, keep any proper nouns.
Return only the title.

Note: "${input}"`
  );

  // Never let a bad response destroy what the user typed.
  return text ? text.replace(/^["']|["']$/g, '') : rawInput;
};

/** Suggests up to 3 short sub-steps for a task. */
export const suggestSubtasks = async (taskTitle: string): Promise<string[]> => {
  const title = taskTitle.trim();
  if (!title) return [];

  const text = await generate(
    `Break the task "${title}" into at most 3 short, concrete sub-steps.
Return one step per line, no numbering, no bullets, no extra commentary.`
  );

  return text
    .split('\n')
    .map(line => line.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
};

/** Suggests a priority for a task based on its content and due date. */
export const analyzeTaskPriority = async (task: {
  title?: string;
  dueDate?: string | null;
  notes?: string | null;
  subtasks?: unknown[];
}): Promise<'High' | 'Medium' | 'Low'> => {
  const text = await generate(
    `Classify this task's priority as exactly one word: High, Medium, or Low.

Title: ${task.title || 'Untitled'}
Due: ${task.dueDate || 'no due date'}
Notes: ${task.notes || 'none'}
Sub-steps: ${task.subtasks?.length || 0}

Answer with one word only.`
  );

  const normalized = text.toLowerCase();
  if (normalized.startsWith('high')) return 'High';
  if (normalized.startsWith('low')) return 'Low';
  return 'Medium';
};
