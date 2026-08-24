import type { Concept } from '../types';
import type { Course, Drill, Lesson } from '../types/course';
import { jsonrepair } from 'jsonrepair';

export type AiTask =
  | 'helper'
  | 'course'
  | 'course-syllabus'
  | 'course-lesson'
  | 'course-reading'
  | 'course-grading'
  | 'practice'
  | 'test';

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
  'course-syllabus': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'meta/llama-3.3-70b-instruct' },
  'course-lesson': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'meta/llama-3.3-70b-instruct' },
  'course-reading': { provider: 'nim', apiKey: '', endpoint: defaults.nim.endpoint, model: 'meta/llama-3.3-70b-instruct' },
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
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const candidates = [cleaned];
  const firstObject = cleaned.indexOf('{');
  const lastObject = cleaned.lastIndexOf('}');
  if (firstObject >= 0 && lastObject > firstObject) candidates.push(cleaned.slice(firstObject, lastObject + 1));

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(jsonrepair(candidate));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI returned invalid JSON.');
};

const uniqueConceptChecks = (checks: Lesson['conceptChecks']): Lesson['conceptChecks'] => {
  if (!checks) return checks;
  const seen = new Set<string>();
  return checks.filter(check => {
    const key = check.question.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

type GenerationProgress = (message: string) => void;

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
  temperature = 0.3,
  onProgress?: GenerationProgress
): Promise<unknown | null> => {
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
    body = JSON.stringify({
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: { temperature, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    });
  } else {
    if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    body = JSON.stringify({
      model: config.model,
      ...(config.provider === 'ollama' ? { format: 'json' } : {}),
      ...(config.provider === 'nim' ? { response_format: { type: 'json_object' } } : {}),
      temperature,
      max_tokens: 4096,
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
      throw new Error(
        'The AI request timed out after 120 seconds or the CodeVault AI proxy is unavailable. Check NIM status, confirm the model name and API key, then retry.'
      );
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

  const result = (await requestJson('course-syllabus', syllabusPrompt, 0.2, onProgress)) as Omit<
    Course,
    'id' | 'createdAt' | 'overallProgress'
  > | null;

  if (!result?.title || !Array.isArray(result.modules)) return null;
  return { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString(), overallProgress: 0 };
};

export const generateCourseLesson = async (
  course: Course,
  lessonTitle: string,
  onProgress?: GenerationProgress
): Promise<Lesson | null> => {
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

  const webContext = await getWebContext(`${lessonTitle} C++23 technical implementation details`);
  const researchPrompt = `${prompt}\n\nUse this optional web research for factual accuracy only; do not copy it or include citations:\n${
    webContext || 'No web research was available.'
  }`;

  let result: Partial<Lesson> | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (attempt > 0) onProgress?.('The first lesson response was incomplete. Requesting a complete replacement...');
      const instruction =
        attempt === 0
          ? researchPrompt
          : `${researchPrompt}\n\nIMPORTANT REPAIR REQUEST: The previous response was incomplete or malformed. Generate the ENTIRE lesson again from the beginning. Do not omit overview, contentMarkdown, conceptChecks, drills, or capstone. Every drill and capstone must include complete starterCode, solution, hints, gradingTokens, and hiddenTests. Return one complete JSON object only.`;

      const candidate = (await requestJson('course-lesson', instruction, 0.2, onProgress)) as Partial<Lesson> | null;
      if (
        candidate?.contentMarkdown &&
        Array.isArray(candidate.conceptChecks) &&
        Array.isArray(candidate.drills) &&
        candidate.drills.length > 0 &&
        candidate.capstone
      ) {
        result = candidate;
        break;
      }
      lastError = new Error('The AI returned an incomplete lesson.');
    } catch (error) {
      lastError = error;
    }
  }

  if (!result) {
    if (lastError instanceof Error) throw lastError;
    return null;
  }

  return {
    id: crypto.randomUUID(),
    title: lessonTitle,
    isCompleted: false,
    bestScore: 0,
    overview: result.overview || '',
    contentMarkdown: result.contentMarkdown || 'Content unavailable.',
    conceptChecks: uniqueConceptChecks(result.conceptChecks || []),
    drills: result.drills || [],
    capstone: result.capstone,
  };
};

export const generateDrillTestHarness = async (
  drill: Pick<Drill, 'title' | 'instructions' | 'starterCode' | 'solution' | 'hiddenTests'>
): Promise<string | null> => {
  const prompt = `Create a robust, production-grade C++23 test harness for this coding drill.
Title: ${drill.title}
Requirements: ${drill.instructions}
Starter context: ${drill.starterCode}
Reference solution (use only to design rigorous tests): ${drill.solution}
Private test ideas: ${(drill.hiddenTests || []).join(' | ')}

Return ONLY valid JSON in this exact shape: {"mainCode":"..."}.
mainCode must be a complete int main() function containing exactly 10 independent, thorough test cases covering edge cases, standard use cases, performance constraints, and error handling. Label each test clearly with a comment exactly like // TEST 1 through // TEST 10. Use assert statements or explicit validation checks with descriptive failure messages, and return a non-zero exit code if any test fails. The harness must call the learner's implemented functions/classes cleanly.`;

  try {
    const result = (await requestJson('course-grading', prompt, 0)) as { mainCode?: string } | null;
    const testLabels = result?.mainCode?.match(/\/\/\s*TEST\s+(?:[1-9]|10)\b/gi) || [];
    return result?.mainCode && /\bmain\s*\(/.test(result.mainCode) && testLabels.length === 10 ? result.mainCode : null;
  } catch {
    return null;
  }
};

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
};