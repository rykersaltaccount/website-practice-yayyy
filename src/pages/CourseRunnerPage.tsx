// utils/aiProviders.ts

import type { Course} from '../types/course';

export type GenerationStageUpdater = (stage: string) => void;

/* ------------------------------------------------------------------ */
/*  Robust JSON extraction                                             */
/* ------------------------------------------------------------------ */

const extractJson = <T,>(rawText: string): T => {
  if (!rawText || !rawText.trim()) {
    throw new Error('The AI returned an empty response.');
  }

  // 1. Try the whole string as-is
  try {
    return JSON.parse(rawText.trim()) as T;
  } catch {
    /* fall through */
  }

  // 2. Strip markdown fences ```json ... ``` / ```JSON ... ``` / ``` ... ```
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      /* fall through */
    }
  }

  // 3. Grab the outermost { ... } block (handles prose preambles like
  //    "Here is your lesson:\n\n{...}")
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const candidate = rawText.slice(start, end + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      // Give a useful error message that includes what went wrong positionally
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Model returned malformed JSON (${message}). ` +
        `First 200 characters of response: ${candidate.slice(0, 200)}`
      );
    }
  }

  throw new Error(
    'Model did not return JSON at all. First 200 characters of response: ' +
    rawText.slice(0, 200)
  );
};

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

export interface GeneratedLesson {
  overview?: string;
  contentMarkdown?: string;
  conceptChecks?: Array<{
    id?: string;
    question?: string;
    options?: string[];
    correctIndex?: number;
    explanation?: string;
  }>;
  drills?: Array<{
    id?: string;
    title?: string;
    instructions?: string;
    starterCode?: string;
    gradingTokens?: string[];
    hints?: string[];
    hiddenTests?: string[];
  }>;
}

const validateGeneratedLesson = (parsed: unknown): GeneratedLesson => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI response was not a JSON object.');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.contentMarkdown !== 'string' || !obj.contentMarkdown.trim()) {
    throw new Error('The AI response was missing lesson content (contentMarkdown).');
  }
  if (!Array.isArray(obj.conceptChecks) && obj.conceptChecks != null) {
    throw new Error('conceptChecks was present but not an array.');
  }
  if (!Array.isArray(obj.drills) && obj.drills != null) {
    throw new Error('drills was present but not an array.');
  }

  return obj as GeneratedLesson;
};

/* ------------------------------------------------------------------ */
/*  Prompt                                                             */
/* ------------------------------------------------------------------ */

const buildLessonPrompt = (course: Course, lessonTitle: string): string => `
You are generating a single C++23 lesson for the course "${course.title}".

The lesson is titled "${lessonTitle}".

Respond with ONLY a single valid JSON object matching this exact shape.
Do NOT use markdown code fences. Do NOT write any commentary before or after the JSON.

{
  "overview": "one-sentence summary of the lesson",
  "contentMarkdown": "the full lesson body written in GitHub-flavored Markdown",
  "conceptChecks": [
    {
      "id": "check-1",
      "question": "a multiple choice question",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "why that answer is correct"
    }
  ],
  "drills": [
    {
      "id": "drill-1",
      "title": "short drill name",
      "instructions": "markdown instructions for the coding exercise",
      "starterCode": "#include <iostream>\\n\\nint main() {\\n  // TODO\\n}\\n",
      "gradingTokens": ["token1", "token2"],
      "hints": ["hint one", "hint two"],
      "hiddenTests": []
    }
  ]
}

Rules:
- contentMarkdown must be substantial teaching material with headers, examples in \`\`\`cpp blocks, and explanations.
- starterCode must be a compilable C++ skeleton with TODO comments.
- Include at least 3 concept checks and at least 1 drill.
- Escape all newlines inside JSON strings properly (use \\n).
`;

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export const generateCourseLesson = async (
  course: Course,
  lessonTitle: string,
  onStage: GenerationStageUpdater,
): Promise<GeneratedLesson | null> => {
  onStage('Building prompt...');

  const apiKey = localStorage.getItem('codevault_openai_api_key') || '';
  const model = localStorage.getItem('codevault_course_model') || 'gpt-4o';

  if (!apiKey) {
    throw new Error('No Course Generation provider configured. Add your API key in AI settings.');
  }

  onStage('Requesting lesson from the model...');
  let rawResponse = '';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildLessonPrompt(course, lessonTitle) }],
        temperature: 0.7,
        // Hard-enforces JSON output when supported — eliminates fence/prose issues
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Provider request failed with status ${response.status}.`);
    }



    const data = await response.json();
    rawResponse = data.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    if (error instanceof Error && error.message.includes('Provider request failed')) throw error;
    throw new Error('Network error while contacting the course generation provider.');
  }

  onStage('Parsing the model response...');
  console.log('[generateCourseLesson] RAW MODEL OUTPUT:', rawResponse);

  let parsed: GeneratedLesson;
  try {
    parsed = validateGeneratedLesson(extractJson<GeneratedLesson>(rawResponse));
  } catch (error) {
    // Re-throw so the caller's catch shows a precise message
    throw error instanceof Error ? error : new Error(String(error));
  }

  // Normalize ids in case the model omitted them
  parsed.conceptChecks = (parsed.conceptChecks || []).map((check, index) => ({
    ...check,
    id: check.id || `generated-check-${index + 1}`,
    question: check.question || '',
    options: check.options || [],
    correctIndex: typeof check.correctIndex === 'number' ? check.correctIndex : 0,
    explanation: check.explanation || '',
  }));
  parsed.drills = (parsed.drills || []).map((drill, index) => ({
    ...drill,
    id: drill.id || `generated-drill-${index + 1}`,
    title: drill.title || `Drill ${index + 1}`,
    instructions: drill.instructions || '',
    gradingTokens: drill.gradingTokens || [],
    hints: drill.hints || [],
    hiddenTests: drill.hiddenTests || [],
  }));

  onStage('Lesson ready.');
  return parsed;
};
