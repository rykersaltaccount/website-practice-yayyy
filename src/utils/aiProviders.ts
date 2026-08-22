import type { Concept } from '../types';

export type AiTask = 'practice' | 'test' | 'helper';
export type AiProvider = 'nim' | 'ollama' | 'chatgpt' | 'gemini' | 'grok' | 'custom';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  endpoint: string;
  model: string;
}

export interface GeneratedExercise {
  type: 'question' | 'coding';
  level: string;
  prompt: string;
  hint: string;
  acceptedAnswers: string[];
  starterCode?: string;
  validationTokens?: string[];
}

const defaults: Record<AiProvider, Omit<AiConfig, 'apiKey'>> = {
  nim: { provider: 'nim', endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions', model: 'meta/llama-3.1-8b-instruct' },
  ollama: { provider: 'ollama', endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3.2' },
  chatgpt: { provider: 'chatgpt', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  gemini: { provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-2.0-flash' },
  grok: { provider: 'grok', endpoint: 'https://api.x.ai/v1/chat/completions', model: 'grok-4.1-mini' },
  custom: { provider: 'custom', endpoint: '', model: '' },
};

const storageKey = 'codevault-ai-configs';

const readConfigs = (): Partial<Record<AiTask, AiConfig>> => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return saved && typeof saved === 'object' ? saved as Partial<Record<AiTask, AiConfig>> : {};
  } catch {
    return {};
  }
};

export const getAiConfig = (task: AiTask): AiConfig => {
  const saved = readConfigs();
  const config = saved[task];
  if (config) return { ...config, apiKey: config.apiKey || '' };

  // Migrate settings saved by the original AI Helper panel.
  if (task === 'helper') {
    const legacyKey = localStorage.getItem('codevault-ai-key');
    const legacyEndpoint = localStorage.getItem('codevault-ai-endpoint');
    const legacyModel = localStorage.getItem('codevault-ai-model');
    const legacyProvider = localStorage.getItem('codevault-ai-provider') as AiProvider | null;
    if (legacyKey || legacyEndpoint || legacyModel || legacyProvider) {
      return {
        provider: legacyProvider && legacyProvider in defaults ? legacyProvider : 'chatgpt',
        apiKey: legacyKey || '',
        endpoint: legacyEndpoint || defaults.chatgpt.endpoint,
        model: legacyModel || defaults.chatgpt.model,
      };
    }
  }
  return { ...defaults.chatgpt, apiKey: '' };
};

export const saveAiConfig = (task: AiTask, config: AiConfig) => {
  const saved = readConfigs();
  localStorage.setItem(storageKey, JSON.stringify({ ...saved, [task]: { ...config, apiKey: config.apiKey.trim() } }));
  window.dispatchEvent(new CustomEvent('ai-settings-updated'));
};

export const providerDefaults = defaults;

const extractJson = (text: string): unknown => {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
};

export const generateExercises = async (concept: Concept, task: 'practice' | 'test', difficulty?: string): Promise<GeneratedExercise[] | null> => {
  const config = getAiConfig(task);
  if (!config.apiKey.trim() && config.provider !== 'ollama') return null;
  if (!config.endpoint.trim() || !config.model.trim()) return null;

  const instruction = `Generate exactly ${task === 'test' ? 5 : 3} ORIGINAL programming exercises for the concept "${concept.name}". ${difficulty ? `Difficulty: ${difficulty}.` : 'Progress from foundational to advanced.'} Use this concept context: ${concept.description}. Time complexity: ${concept.timeComplexity || 'unknown'}. Mix conceptual questions and C++ coding problems; at least one exercise must have type "coding". Every coding task must require a self-contained C++23 solution with a clear function or main-program requirement, starterCode, and validationTokens containing 2-5 distinctive implementation tokens. Do not reproduce, paraphrase, or reference any known LeetCode, HackerRank, Codewars, interview, textbook, or common online exercise. Invent a novel scenario specific to this concept. Return ONLY valid JSON: {"exercises":[{"type":"question|coding","level":"...","prompt":"...","hint":"...","acceptedAnswers":["keyword1"],"starterCode":"...","validationTokens":["functionName","distinctiveToken"]}]}. For coding items, acceptedAnswers may be empty.`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = config.endpoint;
  let body: string;

  if (config.provider === 'gemini') {
    url = `${config.endpoint}/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    body = JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } });
  } else {
    if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    body = JSON.stringify({ model: config.model, temperature: 0.3, messages: [{ role: 'system', content: 'You generate rigorous programming assessments.' }, { role: 'user', content: instruction }] });
  }

  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = config.provider === 'gemini'
      ? data.candidates?.[0]?.content?.parts?.[0]?.text
      : data.choices?.[0]?.message?.content;
    if (!text) throw new Error('AI provider returned no exercise content');
    const parsed = extractJson(text) as { exercises?: GeneratedExercise[] };
    return parsed.exercises?.filter(exercise => exercise.prompt && (exercise.type === 'coding' || exercise.acceptedAnswers?.length)) || null;
  } catch (error) {
    console.warn('AI exercise generation failed; using local exercises.', error);
    return null;
  }
};

export const gradeCodingExercise = async (exercise: GeneratedExercise, answer: string, task: 'practice' | 'test'): Promise<boolean | null> => {
  const config = getAiConfig(task);
  if (!config.endpoint.trim() || !config.model.trim() || (!config.apiKey.trim() && config.provider !== 'ollama')) return null;
  const instruction = `Grade this ORIGINAL C++23 coding exercise. Return only JSON {"passed":true} or {"passed":false}. The answer must be a correct compilable C++23 implementation of the requested behavior, not merely contain keywords. Exercise: ${exercise.prompt}. Rubric tokens: ${(exercise.validationTokens || []).join(', ')}. Submitted C++23 code:\n${answer}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = config.endpoint;
  let body: string;
  if (config.provider === 'gemini') {
    url = `${config.endpoint}/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    body = JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } });
  } else {
    if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    body = JSON.stringify({ model: config.model, temperature: 0, messages: [{ role: 'system', content: 'You are a strict code exercise grader. Accept only correct implementations.' }, { role: 'user', content: instruction }] });
  }
  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    if (!response.ok) return null;
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = config.provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.[0]?.text : data.choices?.[0]?.message?.content;
    if (!text) return null;
    return Boolean((extractJson(text) as { passed?: boolean }).passed);
  } catch {
    return null;
  }
};
