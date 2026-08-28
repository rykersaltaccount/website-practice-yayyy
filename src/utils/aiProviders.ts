import type { Course, Lesson } from '../types/course';
import { jsonrepair } from 'jsonrepair';

export type AiTask =
  | 'helper'
  | 'course'
  | 'course-syllabus'
  | 'course-lesson'
<<<<<<< HEAD
  | 'course-reading';
=======
  | 'course-reading'
  | 'course-grading'
  | 'practice'
  | 'test';
>>>>>>> 0fa5c90f337b6469c930b28d7d9fa92dec14b899

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
  hiddenTests?: string[];
}

const defaults: Record<AiProvider, Omit<AiConfig, 'apiKey'>> = {
  nim: { provider: 'nim', endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions', model: 'meta/llama-3.1-8b-instruct' },
  ollama: { provider: 'ollama', endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3.2' },
  chatgpt: { provider: 'chatgpt', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  gemini: { provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-2.0-flash' },
  grok: { provider: 'grok', endpoint: 'https://api.x.ai/v1/chat/completions', model: 'grok-4.1-mini' },
  custom: { provider: 'custom', endpoint: '', model: '' },
};

const courseModels: Partial<Record<AiTask, AiConfig>> = {
  'course-syllabus': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'meta/llama-3.1-8b-instruct' },
  'course-reading':  { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'meta/llama-3.1-8b-instruct' },
  'course-lesson':   { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'qwen/qwen2.5-coder-32b-instruct' },
};

const oldCourseModels = new Set(['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1']);

const storageKey = 'codevault-ai-configs';

const readConfigs = (): Partial<Record<AiTask, AiConfig>> => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return saved && typeof saved === 'object' ? (saved as Partial<Record<AiTask, AiConfig>>) : {};
  } catch {
    return {};
  }
};

export const getAiConfig = (task: AiTask): AiConfig => {
  const saved = readConfigs();
  const config = saved[task];
  if (config) {
    if (task in courseModels && config.provider === 'nim' && oldCourseModels.has(config.model)) {
      return { ...courseModels[task]!, apiKey: config.apiKey || '' };
    }
    return { ...config, apiKey: config.apiKey || '' };
  }

  if (task in courseModels && courseModels[task]) return { ...courseModels[task]! };

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

export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

export const testAiConfig = async (config: AiConfig): Promise<AiConnectionTestResult> => {
  const startedAt = performance.now();
  if (!config.endpoint.trim() || !config.model.trim() || (!config.apiKey.trim() && config.provider !== 'ollama')) {
    return { ok: false, message: 'Endpoint, model, and API key are required.', latencyMs: 0 };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = config.endpoint.trim();
  let body: Record<string, unknown>;
  if (config.provider === 'gemini') {
    url = `${url}/${config.model.trim()}:generateContent?key=${encodeURIComponent(config.apiKey.trim())}`;
    body = { contents: [{ parts: [{ text: 'Reply with exactly OK.' }] }], generationConfig: { maxOutputTokens: 1 } };
  } else {
    if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    body = {
      model: config.provider === 'nim' ? 'meta/llama-3.1-8b-instruct' : config.model.trim(),
      temperature: 0,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Reply with exactly OK.' }],
    };
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: url, headers, body }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - startedAt);
    if (!response.ok) {
      const responseText = await response.text();
      let detail = responseText;
      try {
        const parsed = JSON.parse(responseText) as { error?: string };
        detail = parsed.error || responseText;
      } catch {
        // Keep plain-text provider and proxy errors readable.
      }
      return { ok: false, message: `HTTP ${response.status}${detail ? `: ${detail}` : ''}`, latencyMs };
    }
    return { ok: true, message: `Connection verified in ${latencyMs} ms.`, latencyMs };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    return {
      ok: false,
      message:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Timed out after 30 seconds.'
          : 'Proxy or network request failed.',
      latencyMs,
    };
  }
};

const extractJson = (text: string): unknown => {
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstObject = cleaned.indexOf('{');
  const lastObject = cleaned.lastIndexOf('}');
  if (firstObject >= 0 && lastObject > firstObject) {
    cleaned = cleaned.slice(firstObject, lastObject + 1);
  }

  let originalError: unknown;

  // Attempt 1: Direct standard parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    originalError = e;
  }

  // Attempt 2: Standard jsonrepair
  try {
    return JSON.parse(jsonrepair(cleaned));
  } catch {}

  // Attempt 3: Sanitize raw control characters and unescaped line breaks before repair
  try {
    const sanitized = cleaned
      .replace(/[\r\n]+/g, '\\n')
      .replace(/\t/g, '\\t');
    return JSON.parse(jsonrepair(sanitized));
  } catch (error) {
    const finalError = error instanceof Error ? error : (originalError instanceof Error ? originalError : new Error('Invalid JSON structure.'));
    throw finalError;
  }
};

type GenerationProgress = (message: string) => void;

/* ------------------------------------------------------------------ */
/*  Request options + retry plumbing (declared BEFORE first use)       */
/* ------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

interface RequestOpts {
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  modelOverride?: string;
}

const RETRYABLE = ['timed out', 'HTTP 408', 'HTTP 429', 'HTTP 500', 'HTTP 502', 'HTTP 503', 'HTTP 504', 'proxy is unavailable'];
const isRetryable = (error: unknown) =>
  RETRYABLE.some(hint => (error instanceof Error ? error.message : String(error)).includes(hint));

export const getWebContext = async (query: string): Promise<string> => {
  try {
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return '';
    const data = (await response.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
    return (data.results || [])
      .map(result => `- ${result.title || 'Source'} (${result.url || 'unknown URL'}): ${(result.content || '').slice(0, 500)}`)
      .join('\n');
  } catch {
    return '';
  }
};

const requestJson = async (
  task: AiTask,
  instruction: string,
  opts: RequestOpts = {},
  onProgress?: GenerationProgress,
): Promise<unknown | null> => {
  const { temperature = 0.3, timeoutMs = 100_000, maxTokens = 4096, modelOverride } = opts;

  const config = getAiConfig(task);
  const model = modelOverride || config.model;
  onProgress?.(`Preparing ${task} provider...`);
  if (!config.endpoint.trim() || !model.trim() || (!config.apiKey.trim() && config.provider !== 'ollama')) {
    throw new Error(`The ${task} profile is missing an endpoint, model, or API key.`);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = config.endpoint;
  let body: string;

  if (config.provider === 'gemini') {
    url = `${config.endpoint}/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    body = JSON.stringify({
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    });
  } else {
    if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    body = JSON.stringify({
      model,
      ...(config.provider === 'ollama' ? { format: 'json' } : {}),
      ...(config.provider === 'nim' ? { response_format: { type: 'json_object' } } : {}),
      temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise C++23 systems programming course author. Return one valid JSON object only, with no markdown fences or commentary.',
        },
        { role: 'user', content: instruction },
      ],
    });
  }

  try {
    onProgress?.(`Sending request to ${model}...`);
    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: url, headers, body: JSON.parse(body) }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
<<<<<<< HEAD
    } catch (error) {
      throw new Error('The AI request timed out after 120 seconds or the CodeVault AI proxy is unavailable. Check NIM status, confirm the model name and API key, then retry.');
=======
    } catch {
      throw new Error(
        `The AI request timed out after ${Math.round(timeoutMs / 1000)} seconds or the CodeVault AI proxy is unavailable. Check NIM status, confirm the model name and API key, then retry.`
      );
>>>>>>> 0fa5c90f337b6469c930b28d7d9fa92dec14b899
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 240);
      throw new Error(`${config.provider} returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    onProgress?.('Response received. Parsing structured output...');
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      config.provider === 'gemini'
        ? data.candidates?.[0]?.content?.parts?.[0]?.text
        : data.choices?.[0]?.message?.content;

    return text ? extractJson(text) : null;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(`Could not reach ${config.provider}. Check the endpoint and browser network access.`);
  }
};

const requestJsonWithRetry = async (
  task: AiTask,
  instruction: string,
  opts: RequestOpts & { attempts?: number } = {},
  onProgress?: GenerationProgress,
): Promise<unknown | null> => {
  const { attempts = 3, ...rest } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      // Last resort: fall back to the fast 8B model so NIM congestion can't kill the run
      const useFastFallback =
        attempt === attempts - 1 &&
        task.startsWith('course') &&
        getAiConfig(task).provider === 'nim';
      return await requestJson(task, instruction, {
        ...rest,
        modelOverride: useFastFallback ? 'meta/llama-3.1-8b-instruct' : rest.modelOverride,
      }, onProgress);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !isRetryable(error)) throw error;
      const backoff = 2500 * 2 ** attempt + Math.random() * 1000;
      onProgress?.(`Attempt ${attempt + 1} failed — retrying in ${Math.round(backoff / 1000)}s…`);
      await sleep(backoff);
    }
  }
  throw lastError;
};

/* ------------------------------------------------------------------ */
/*  Shared prompt fragments                                            */
/* ------------------------------------------------------------------ */

const jsonFormattingRules = `
CRITICAL JSON FORMATTING REQUIREMENTS:
- Return ONLY valid raw JSON with double-quoted keys.
- Do NOT wrap the response in markdown code fences.
- Properly escape all double quotes inside code snippets (e.g., \"Hello World\").
- Prefer single quotes inside C++ code examples; otherwise strictly escape double quotes.
- Do NOT include raw line breaks inside JSON strings; use \\n instead.`;

/* ------------------------------------------------------------------ */
/*  Syllabus                                                           */
/* ------------------------------------------------------------------ */

export const generateCourseSyllabus = async (
  topic: string,
  level: Course['level'],
  onProgress?: GenerationProgress
): Promise<Course | null> => {
  const trackGuidance =
    level === 'Beginner'
      ? 'Build from arrays and hashing fundamentals through collision handling, complexity analysis, implementation trade-offs, debugging, and progressively harder interview-style problems. End at a level suitable for passing general software engineering interviews focused on hash maps.'
      : 'Focus on technical and production-level material: cache behavior, allocator and ownership choices, hash quality, adversarial inputs, concurrency, rehashing, load factors, custom hashers, memory layout, and performance measurement.';

  const webContext = await getWebContext(`${topic} C++23 systems programming interview concepts`);
  const syllabusPrompt = `Create a structured C++23 systems programming course about "${topic}" for the ${level} track. ${trackGuidance} Use the web research below only to improve factual accuracy; do not copy source text and do not include citations in the JSON.\nWeb research:\n${
    webContext || 'No web research was available.'
  }\nReturn only JSON matching {"title":"...","description":"...","modules":[{"id":"...","title":"...","description":"...","lessons":[{"id":"...","title":"...","isCompleted":false,"bestScore":0}]}]}. Create 3-5 modules with 2-4 lessons each. Make the sequence cumulative and practical. Make objectives concrete enough for later deep lesson writers. Do not use a marketing tone.`;

  const result = (await requestJsonWithRetry('course-syllabus', syllabusPrompt, { temperature: 0.2 }, onProgress)) as Omit<
    Course,
    'id' | 'createdAt' | 'overallProgress'
  > | null;

  if (!result?.title || !Array.isArray(result.modules)) return null;
  return { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString(), overallProgress: 0 };
};

/* ------------------------------------------------------------------ */
/*  Lesson generation                                                  */
/* ------------------------------------------------------------------ */

export const generateCourseLesson = async (
  course: Course,
  lessonTitle: string,
  onProgress?: GenerationProgress
): Promise<Lesson | null> => {
<<<<<<< HEAD
  const prompt = `Generate an exceptional, highly engaging lesson on "${lessonTitle}" for the course "${course.title}" (${course.level} level).

PEDAGOGICAL & WRITING STYLE (freeCodeCamp interactive tutorial style):
- Write in a warm, conversational, encouraging mentor voice that talks directly to the learner ("you").
- Break down complex C++23 mechanics into bite-sized, digestible steps. Never dump a wall of dense academic text.
- For every code concept introduced, immediately show a clean code example, then walk through it line-by-line using phrases like "Notice how...", "Behind the scenes...", or "When this runs...".
- Use clear markdown formatting, bullet points, bold text for key terms, and markdown blockquotes or code blocks to make the reading experience immersive and scannable.
- Include ASCII memory diagrams or visual flow explanations where helpful for understanding pointers, references, memory layouts, or object lifetimes.

Return ONLY valid JSON matching this schema:
{
  "overview": "1-2 sentence engaging overview",
  "contentMarkdown": "Comprehensive, interactive tutorial (600-900 words) written in the freeCodeCamp pedagogical style described above, covering modern C++23 features, memory model, and best practices.",
  "conceptChecks": [
    {
      "id": "cc-1",
      "question": "Clear conceptual question testing a core misconception or rule...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Clear explanation of why this option is correct and why others fail."
    }
  ],
  "drills": [
    {
      "id": "drill-1",
      "title": "Drill title",
      "instructions": "Clear, practical task instructions...",
      "starterCode": "Complete, compilable C++23 starter program with necessary includes, class/struct definitions, TODO comments inside function/method bodies, and a clean main() function that demonstrates how to invoke the API with sample inputs without solving the core logic.",
      "solution": "// Complete reference solution implementation",
      "hints": ["Targeted hint 1"],
      "gradingTokens": ["distinctiveToken1", "distinctiveToken2"],
      "hiddenTests": ["Edge case test requirement 1", "Performance/correctness test requirement 2"]
    }
  ],
  "capstone": {
    "id": "capstone-1",
    "title": "Capstone title",
    "instructions": "Comprehensive task instructions bringing module concepts together...",
    "starterCode": "Complete, compilable C++23 starter program with necessary includes, class/struct definitions, TODO comments inside function/method bodies, and a clean main() function demonstrating usage.",
    "solution": "// Complete reference solution implementation",
    "hints": ["Hint 1"],
    "gradingTokens": ["token1"],
    "hiddenTests": ["Comprehensive test case 1", "Comprehensive test case 2"]
  }
}

CRITICAL RULES FOR DRILLS & CAPSTONE:
- Every drill and the capstone must have starterCode that is a complete, compilable C++23 program.
- The starterCode is a learner skeleton, not an answer: method/function bodies must contain only TODO comments and minimal compile-safe placeholders, with no completed algorithm or solution logic.
- Author a useful main() function with a small visible example call to the unfinished API, but do not solve the exercise in main().
- Do not put hidden test cases in starterCode; hiddenTests are private grading cases. Return only the JSON object.`;

=======
>>>>>>> 0fa5c90f337b6469c930b28d7d9fa92dec14b899
  const webContext = await getWebContext(`${lessonTitle} C++23 technical implementation details`);
  const contextBlock = webContext ? `\n\nUse this optional web research for factual accuracy only:\n${webContext}` : '';

  const readingPrompt = `Generate an engaging lesson tutorial on "${lessonTitle}" for "${course.title}" (${course.level} level).
PEDAGOGICAL STYLE: Warm, direct, freeCodeCamp style with markdown and code walk-throughs.
HARD LIMIT: 350-450 words, at most 2 short C++ code examples.

Schema:
{ "overview": "1-2 sentence overview", "contentMarkdown": "350-450 word Markdown tutorial." }
${jsonFormattingRules}${contextBlock}`;

  const interactivePrompt = `Generate C++23 exercises for "${lessonTitle}" in "${course.title}".
HARD LIMIT: exactly 3 conceptChecks, exactly 2 drills. Omit "capstone" entirely.

Schema:
{
  "conceptChecks": [{ "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." }],
  "drills": [{ "title": "...", "instructions": "...", "starterCode": "...", "solution": "//...", "hints": ["..."], "gradingTokens": ["..."], "hiddenTests": [] }]
}
${jsonFormattingRules}${contextBlock}`;

  onProgress?.('Generating reading and exercises in parallel...');

  const [reading, interactive] = await Promise.all([
    requestJsonWithRetry('course-reading', readingPrompt,
      { temperature: 0.1, timeoutMs: 110_000, maxTokens: 1600, attempts: 2 }, onProgress)
      .catch(e => { console.error('[course-reading]', e); return null; }),
    requestJsonWithRetry('course-lesson', interactivePrompt,
      { temperature: 0.1, timeoutMs: 110_000, maxTokens: 2800, attempts: 2 }, onProgress)
      .catch(e => { console.error('[course-lesson]', e); return null; }),
  ]) as [any, any];

  if (!reading?.contentMarkdown && !interactive?.drills) {
    throw new Error('Both generation passes failed. Check NIM status/quota and try again.');
  }

  return {
    id: crypto.randomUUID(),
    title: lessonTitle,
    isCompleted: false,
    bestScore: 0,
    overview: reading?.overview || '',
    contentMarkdown: reading?.contentMarkdown || '_Reading failed to generate — press regenerate._',
    conceptChecks: (interactive?.conceptChecks || []).map((c: any) => ({ ...c, id: crypto.randomUUID() })),
    drills: (interactive?.drills || []).map((d: any) => ({ ...d, id: crypto.randomUUID() })),
    capstone: interactive?.capstone ? { ...interactive.capstone, id: crypto.randomUUID() } : undefined,
  };
};

<<<<<<< HEAD
export const generateDrillTestHarness = async (drill: Pick<Drill, 'title' | 'instructions' | 'starterCode' | 'solution' | 'hiddenTests'>): Promise<string | null> => {
  // This function depends on 'course-grading' task which has been removed
  // Returning null as the function is no longer supported
  return null;
=======
/* ------------------------------------------------------------------ */
/*  Grading                                                            */
/* ------------------------------------------------------------------ */

export const gradeCodingExercise = async (
  exercise: GeneratedExercise,
  answer: string,
  task: AiTask = 'course-grading'
): Promise<{ passed: boolean; feedback: string } | null> => {
  const config = getAiConfig(task);
  if (!config.endpoint.trim() || !config.model.trim() || (!config.apiKey.trim() && config.provider !== 'ollama')) {
    return null;
  }

  const instruction = `Grade this ORIGINAL C++23 coding exercise. Return only JSON with two fields: "passed" (boolean) and "feedback" (string).

  If the solution is CORRECT:
  - Set "passed": true
  - Provide encouraging feedback that confirms what was done well and suggests next steps or related concepts to explore

  If the solution is INCORRECT:
  - Set "passed": false
  - Provide SPECIFIC, STEP-BY-STEP guidance on exactly what needs to be fixed
  - Include the EXACT architecture or code structure that should be implemented
  - Mention specific lines or sections that need modification
  - Reference the exercise requirements: ${exercise.prompt}
  - Consider the rubric tokens: ${(exercise.validationTokens || []).join(', ')}
  - Do NOT reveal hidden tests, but DO explain what concepts or techniques are missing
  - Format feedback as clear, numbered steps when multiple issues exist

  Exercise: ${exercise.prompt}
  Submitted C++23 code:\n${answer}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = config.endpoint;
  let body: string;

  if (config.provider === 'gemini') {
    url = `${config.endpoint}/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    body = JSON.stringify({
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });
  } else {
    if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    body = JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict code exercise grader. When code is incorrect, provide EXACT, SPECIFIC guidance on what to fix including precise architectural guidance, line-by-line corrections, and clear next steps. When code is correct, provide encouraging confirmation.',
        },
        { role: 'user', content: instruction },
      ],
    });
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: url, headers, body: JSON.parse(body) }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text =
      config.provider === 'gemini'
        ? data.candidates?.[0]?.content?.parts?.[0]?.text
        : data.choices?.[0]?.message?.content;

    if (!text) return null;

    const result = extractJson(text) as { passed?: boolean; feedback?: string };
    const passed = Boolean(result.passed);
    const feedback =
      result.feedback ??
      (passed
        ? 'Great job! Your solution passes all tests.'
        : 'Your solution needs improvement. Please review the exercise requirements carefully and ensure your implementation matches all specified criteria.');

    return { passed, feedback };
  } catch {
    return null;
  }
>>>>>>> 0fa5c90f337b6469c930b28d7d9fa92dec14b899
};