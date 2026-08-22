import type { Concept } from '../types';
import type { Course, Lesson } from '../types/course';

export type AiTask = 'practice' | 'test' | 'helper' | 'course' | 'course-syllabus' | 'course-lesson' | 'course-reading' | 'course-grading';
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

const courseModels: Record<Extract<AiTask, `course-${string}`>, AiConfig> = {
  'course-syllabus': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'meta/llama-3.3-70b-instruct' },
  'course-lesson': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'deepseek-ai/deepseek-r1' },
  'course-reading': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'nvidia/nemotron-3-nano-30b-a3b' },
  'course-grading': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'meta/llama-3.3-70b-instruct' },
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

  if (task in courseModels) return { ...courseModels[task as keyof typeof courseModels] };

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

export const generateExercises = async (
  conceptsInput: Concept | Concept[],
  task: 'practice' | 'test',
  difficulty?: string,
  mode: 'combined' | 'isolated' = 'combined',
): Promise<GeneratedExercise[] | null> => {
  const concepts = Array.isArray(conceptsInput) ? conceptsInput.slice(0, 3) : [conceptsInput];
  const conceptSummary = concepts.map(concept => `- ${concept.name}: ${concept.description}. Time complexity: ${concept.timeComplexity || 'unknown'}`).join('\n');
  const conceptNames = concepts.map(concept => concept.name).join(' + ');
  const config = getAiConfig(task);
  if (!config.apiKey.trim() && config.provider !== 'ollama') return null;
  if (!config.endpoint.trim() || !config.model.trim()) return null;

  const instruction = `Generate exactly ${task === 'test' ? 5 : 3} ORIGINAL programming exercises for ${conceptNames}. ${mode === 'combined' && concepts.length > 1 ? `Combine the concepts in every exercise where practical. Force the learner to recognize which concept applies first, how the concepts interact, and the trade-offs between them.` : 'Keep the exercises isolated to the individual concept and do not require knowledge of the other concepts.'} ${difficulty ? `Difficulty: ${difficulty}.` : 'Progress from foundational to advanced.'} Concept context:\n${conceptSummary}\nMix conceptual questions and C++ coding problems; at least one exercise must have type "coding". Every coding task must require a self-contained C++23 solution with a clear function or main-program requirement, starterCode, and validationTokens containing 2-5 distinctive implementation tokens. Do not reproduce, paraphrase, or reference any known LeetCode, HackerRank, Codewars, interview, textbook, or common online exercise. Invent a novel scenario specific to this concept combination. Return ONLY valid JSON: {"exercises":[{"type":"question|coding","level":"...","prompt":"...","hint":"...","acceptedAnswers":["keyword1"],"starterCode":"...","validationTokens":["functionName","distinctiveToken"]}]}. For coding items, acceptedAnswers may be empty.`;
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
    let response: Response;
    try {
      response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: url, headers, body: JSON.parse(body) }),
      });
    } catch {
      throw new Error('Could not reach the CodeVault AI proxy. Start npm run dev:compiler locally or redeploy Vercel so /api/ai is available.');
    }
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

type GenerationProgress = (message: string) => void;

const requestJson = async (task: AiTask, instruction: string, temperature = 0.3, onProgress?: GenerationProgress): Promise<unknown | null> => {
  const config = getAiConfig(task);
  onProgress?.(`Preparing ${task} provider...`);
  if (!config.endpoint.trim() || !config.model.trim() || (!config.apiKey.trim() && config.provider !== 'ollama')) {
    throw new Error(`The ${task} profile is missing an endpoint, model, or API key.`);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = config.endpoint;
  let body: string;
  if (config.provider === 'gemini') {
    url = `${config.endpoint}/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    body = JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature, responseMimeType: 'application/json' } });
  } else {
    if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    body = JSON.stringify({ model: config.model, temperature, messages: [{ role: 'system', content: 'You are a precise C++23 systems programming course author.' }, { role: 'user', content: instruction }] });
  }
  try {
    onProgress?.(`Sending request to ${config.model}...`);
    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 120000);
      response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: url, headers, body: JSON.parse(body) }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
    } catch {
      throw new Error('The AI request timed out after 30 seconds or the CodeVault AI proxy is unavailable. Check NIM status, confirm the model name and API key, then retry.');
    }
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 240);
      throw new Error(`${config.provider} returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    onProgress?.('Response received. Parsing structured output...');
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = config.provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.[0]?.text : data.choices?.[0]?.message?.content;
    return text ? extractJson(text) : null;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(`Could not reach ${config.provider}. Check the endpoint and browser network access.`);
  }
};

export const generateCourseSyllabus = async (topic: string, level: Course['level'], onProgress?: GenerationProgress): Promise<Course | null> => {
  const result = await requestJson('course-syllabus', `Create a structured C++23 systems programming course about "${topic}" for ${level} learners. Return only JSON matching {"title":"...","description":"...","modules":[{"id":"...","title":"...","description":"...","lessons":[{"id":"...","title":"...","isCompleted":false,"bestScore":0}]}]}. Create 3-5 modules with 2-4 lessons each. Make the sequence cumulative and practical. Make objectives concrete enough for a later deep lesson writer. Do not use a marketing tone.`, 0.2, onProgress) as Omit<Course, 'id' | 'createdAt' | 'overallProgress'> | null;
  if (!result?.title || !Array.isArray(result.modules)) return null;
  return { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString(), overallProgress: 0 };
};

export const generateCourseLesson = async (course: Course, lessonTitle: string, onProgress?: GenerationProgress): Promise<Lesson | null> => {
  const result = await requestJson('course-lesson', `SYSTEM ROLE:
You are a principal systems software engineer and expert C++23 educator creating rigorous, interactive course material for focused deep work. Generate a complete lesson for the course context below. Reason privately about correctness, standards, memory behavior, and edge cases, but never reveal chain-of-thought or hidden reasoning.

CONTENT REQUIREMENTS:
1. Write contentMarkdown as a zero-fluff, technically accurate 1,000-1,500 word guide. Use modern C++23 features only when relevant, such as std::expected, explicit object parameters (deducing this), monadic operations, std::print, concepts, or std::generator. Do not force features that do not serve the lesson.
2. Explain low-level behavior where relevant: object lifetime, stack/heap boundaries, pointer/reference lifetimes, value categories (xvalue, prvalue), move semantics, allocation, cache locality, and compiler/assembly implications. Avoid unverifiable claims.
3. Include at least one readable ASCII diagram for a memory layout, control flow, ownership relationship, or state transition. Include compilable C++23 code examples without third-party dependencies.
4. Include 3-4 conceptual multiple-choice checks. Each must test a distinct mental model, value category, memory rule, or code-output prediction. Provide four options, a zero-based correctIndex, and a useful explanation.
5. Include 3-4 progressive ORIGINAL C++23 coding drills, from focused fundamentals to applied systems reasoning. Do not reproduce, paraphrase, or reference any known LeetCode, HackerRank, Codewars, interview, textbook, or common online exercise. Invent scenarios specific to this lesson. Each drill must include valid minimal starterCode, a complete reference solution, 2-4 progressive hints, and 2-5 gradingTokens.
6. Include one original non-trivial C++23 capstone that combines the lesson topics into a small systems task. It must include starterCode, a complete solution, hints, and gradingTokens.

OUTPUT CONTRACT:
Return raw valid JSON only. Do not use Markdown fences, comments outside JSON, or trailing commas. Escape every quote and newline correctly. Return exactly this shape:
{"overview":"1-2 sentence summary","contentMarkdown":"...","conceptChecks":[{"id":"cc-1","question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}],"drills":[{"id":"drill-1","title":"...","instructions":"...","starterCode":"...","solution":"...","hints":["..."],"gradingTokens":["..."]}],"capstone":{"id":"capstone-1","title":"...","instructions":"...","starterCode":"...","solution":"...","hints":["..."],"gradingTokens":["..."]}}

LESSON CONTEXT:
- Course: ${course.title}
- Target level: ${course.level}
- Lesson: ${lessonTitle}
- Course description: ${course.description}

Every code sample, starter, and solution must compile under C++23 standard parameters with no third-party dependencies.`, 0.35, onProgress) as Partial<Lesson> | null;
  if (!result || !Array.isArray(result.drills)) return null;
  onProgress?.('Lesson structure complete. Generating long-form reading...');
  const reading = await requestJson('course-reading', `Write only the contentMarkdown field for the C++23 lesson "${lessonTitle}" in the course "${course.title}". Produce a 1,000-1,500 word, zero-fluff technical reading. Explain modern C++23 behavior, memory/lifetime/layout mechanics, cache locality, allocation, value categories, move semantics, and compiler implications only where relevant. Include compilable code examples and at least one readable ASCII diagram. Do not copy or paraphrase known online material. Return only JSON: {"contentMarkdown":"..."}. Do not reveal chain-of-thought.`, 0.3, onProgress) as { contentMarkdown?: string } | null;
  return { id: '', title: lessonTitle, isCompleted: false, bestScore: 0, ...result, contentMarkdown: reading?.contentMarkdown || result.contentMarkdown || '' };
};

export const gradeCodingExercise = async (exercise: GeneratedExercise, answer: string, task: 'practice' | 'test' | 'course-grading'): Promise<boolean | null> => {
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
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: url, headers, body: JSON.parse(body) }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = config.provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.[0]?.text : data.choices?.[0]?.message?.content;
    if (!text) return null;
    return Boolean((extractJson(text) as { passed?: boolean }).passed);
  } catch {
    return null;
  }
};
