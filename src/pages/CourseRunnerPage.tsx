import React, { useContext, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Link, useParams } from 'react-router-dom';
import AppContext from '../contexts/AppContext';
import type { Lesson, Drill } from '../types/course';
import { generateCourseLesson, generateDrillTestHarness, gradeCodingExercise } from '../utils/aiProviders';
import { CppPredictiveEditor } from '../components/CppPredictiveEditor';

const normalizeLesson = (lesson: Lesson): Lesson => {
  const seen = new Set<string>();
  return {
    ...lesson,
    conceptChecks: (lesson.conceptChecks || []).filter(check => {
      const key = check.question.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    drills: (lesson.drills || []).map(drill => ({
      ...drill,
      gradingTokens: drill.gradingTokens || [],
      hints: drill.hints || [],
      hiddenTests: drill.hiddenTests || [],
    })),
  };
};

const getStarterCode = (drill: Drill): string => {
  const starterCode = drill.starterCode?.trim() || '';
  const looksLikeSkeleton = /TODO|IMPLEMENT|YOUR CODE/i.test(starterCode)
    && !/for\s*\(|while\s*\(|std::(sort|unordered_map|map|vector)|\bnew\s+|return\s+(?!0\s*;|nullptr\s*;|false\s*;)[^;]+;/.test(starterCode);
  if (starterCode && looksLikeSkeleton && /#include|\b(class|struct|int\s+main|void\s+\w+|auto\s+\w+)\b/.test(starterCode)) {
    return /\bmain\s*\(/.test(starterCode) ? drill.starterCode : `${drill.starterCode.trim()}\n\nint main() {\n    return 0;\n}\n`;
  }
  return `#include <iostream>
#include <string>
#include <vector>

// ${drill.title}
// TODO: Implement the required behavior described above.

int main() {
  return 0;
}
`;
};

const removeMainFunction = (source: string): string => {
  if (!source) return '';
  const mainStart = source.search(/\b(?:int|auto)\s+main\s*\([^)]*\)\s*\{/);
  if (mainStart < 0) return source;
  const bodyStart = source.indexOf('{', mainStart);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return `${source.slice(0, mainStart)}${source.slice(index + 1)}`.trim();
    }
  }
  return source;
};

const composeProtectedSource = (drill: Drill, source: string): string => {
  if (!drill.protectedMain) return source || '';
  return `${removeMainFunction(source || '')}\n\n${drill.protectedMain.trim()}\n`;
};

const LessonMarkdown: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight]}
    components={{
      h1: ({ children }) => <h2 className="mt-6 text-lg font-bold text-white first:mt-0">{children}</h2>,
      h2: ({ children }) => <h3 className="mt-6 text-base font-semibold text-white first:mt-0">{children}</h3>,
      h3: ({ children }) => <h4 className="mt-5 text-sm font-semibold text-[#d8b4fe] first:mt-0">{children}</h4>,
      p: ({ children }) => <p className="mt-3 text-sm leading-7 text-[#dedede] first:mt-0">{children}</p>,
      ul: ({ children }) => <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[#dedede]">{children}</ul>,
      ol: ({ children }) => <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[#dedede]">{children}</ol>,
      li: ({ children }) => <li>{children}</li>,
      blockquote: ({ children }) => <blockquote className="mt-4 border-l-2 border-[#10b981]/60 pl-4 text-sm italic text-[#a7f3d0]">{children}</blockquote>,
      code: ({ className, children, ...props }) => {
        const isBlock = Boolean(className);
        return isBlock ? <code className={className} {...props}>{children}</code> : <code className="rounded bg-[#242832] px-1.5 py-0.5 font-mono text-[0.85em] text-[#a7f3d0]" {...props}>{children}</code>;
      },
      pre: ({ children }) => <pre className="mt-4 overflow-x-auto rounded-lg border border-white/[0.1] bg-[#090b0f] p-4 text-xs leading-6 shadow-inner">{children}</pre>,
      hr: () => <hr className="my-6 border-white/[0.1]" />,
      a: ({ children, href }) => <a href={href} className="text-[#6ee7b7] underline decoration-[#10b981]/40 underline-offset-2 hover:text-white">{children}</a>,
    }}
  >
    {content || ''}
  </ReactMarkdown>
);

const CourseRunnerPage: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const { courses, updateCourse, addMistake, addConcept, startCoding, stopCoding } = useContext(AppContext)!;
  const course = courses.find(item => item.id === courseId);
  const sourceLesson = course?.modules.flatMap(module => module.lessons).find(lesson => lesson.id === lessonId);
  const [lesson, setLesson] = useState<Lesson | undefined>(() => sourceLesson ? normalizeLesson(sourceLesson) : undefined);
  const [activeTab, setActiveTab] = useState<'checks' | 'drills'>('checks');
  const [checkAnswers, setCheckAnswers] = useState<Record<string, number>>({});
  const [code, setCode] = useState('');
  const [drillIndex, setDrillIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [completionNotice, setCompletionNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationError, setGenerationError] = useState('');
  const [harnessLoading, setHarnessLoading] = useState(false);
  const generatedLessonKey = useRef<string | null>(null);
  const drillEditorRef = useRef<HTMLDivElement>(null);
  const drills = [...(lesson?.drills || []), ...(lesson?.capstone ? [lesson.capstone] : [])];
  const activeDrill: Drill | undefined = drills[drillIndex];

  useEffect(() => {
    startCoding();
    return () => stopCoding();
  }, []);

  useEffect(() => {
    const editor = drillEditorRef.current?.querySelector('textarea');
    if (!editor) return;
    editor.style.height = 'auto';
    editor.style.height = `${Math.min(Math.max(editor.scrollHeight, 192), 420)}px`;
  }, [code, drillIndex, lesson?.drills, lesson?.capstone]);

  useEffect(() => {
    setCode(activeDrill ? composeProtectedSource(activeDrill, getStarterCode(activeDrill)) : '');
  }, [activeDrill?.id]);

  useEffect(() => {
    if (!activeDrill || activeDrill.protectedMain || harnessLoading) return;
    setHarnessLoading(true);
    void generateDrillTestHarness(activeDrill)
      .then(protectedMain => {
        if (!protectedMain) return;
        const updatedDrill = { ...activeDrill, protectedMain };
        setLesson(current => current ? { ...current, drills: current.drills?.map(drill => drill.id === updatedDrill.id ? updatedDrill : drill), capstone: current.capstone?.id === updatedDrill.id ? { ...current.capstone, ...updatedDrill } : current.capstone } : current);
        setCode(composeProtectedSource(updatedDrill, getStarterCode(updatedDrill)));
        updateCourse(course?.id || '', { modules: course?.modules.map(module => ({ ...module, lessons: module.lessons.map(item => item.id === lesson?.id ? { ...item, drills: item.drills?.map(drill => drill.id === updatedDrill.id ? updatedDrill : drill), capstone: item.capstone?.id === updatedDrill.id ? { ...item.capstone, ...updatedDrill } : item.capstone } : item) })) || [] });
      })
      .finally(() => setHarnessLoading(false));
  }, [activeDrill?.id, activeDrill?.protectedMain]);

  useEffect(() => {
    const lessonKey = `${courseId || ''}:${lessonId || ''}`;
    if (!course || !sourceLesson || sourceLesson.contentMarkdown || generatedLessonKey.current === lessonKey) return;
    generatedLessonKey.current = lessonKey;
    setIsLoading(true);
    setGenerationError('');
    setGenerationStage('Preparing lesson generation...');
    void generateCourseLesson(course, sourceLesson.title, setGenerationStage)
      .then(generated => {
        if (!generated) throw new Error('The AI returned an incomplete lesson.');
        const hydrated = normalizeLesson({ ...sourceLesson, ...generated, id: sourceLesson.id });
        setLesson(hydrated);
        updateCourse(course.id, { modules: course.modules.map(module => ({ ...module, lessons: module.lessons.map(item => item.id === hydrated.id ? hydrated : item) })) });
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Lesson generation failed.';
        setGenerationStage(message);
        setGenerationError(message);
      })
      .finally(() => setIsLoading(false));
  }, [courseId, lessonId]);

  useEffect(() => {
    if (!sourceLesson?.contentMarkdown) return;
    const normalized = normalizeLesson(sourceLesson);
    if (normalized.conceptChecks?.length === sourceLesson.conceptChecks?.length) return;
    setLesson(normalized);
    updateCourse(course?.id || '', { modules: course?.modules.map(module => ({ ...module, lessons: module.lessons.map(item => item.id === normalized.id ? normalized : item) })) || [] });
  }, [courseId, lessonId]);

  if (!course || !lesson) return <div className="text-sm text-[#8a8f98]">Lesson not found.</div>;
  const completedChecks = (lesson.conceptChecks || []).filter(check => checkAnswers[check.id] === check.correctIndex).length;

  const saveLesson = (updates: Partial<Lesson>) => {
    const nextLesson = { ...lesson, ...updates };
    setLesson(nextLesson);
    updateCourse(course.id, { overallProgress: Math.round(((course.modules.flatMap(module => module.lessons).filter(item => item.id === nextLesson.id || item.isCompleted).length) / course.modules.reduce((sum, module) => sum + module.lessons.length, 0)) * 100), modules: course.modules.map(module => ({ ...module, lessons: module.lessons.map(item => item.id === nextLesson.id ? nextLesson : item) })) });
  };

  const submitDrill = async () => {
    if (!activeDrill) return;
      setFeedback('Compiling and checking...');
      let compilerPassed = true;
      let compilerOutput = '';
      try {
        const response = await fetch('/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: composeProtectedSource(activeDrill, code), filename: 'course-drill.cpp' }) });
        if (response.ok) {
          const result = await response.json() as { ok?: boolean; output?: string };
          compilerPassed = result.ok !== false;
          compilerOutput = result.output || '';
        } else {
          compilerPassed = false;
          compilerOutput = (await response.text()).slice(0, 2000);
        }
      } catch (error) {
        compilerPassed = false;
        compilerOutput = error instanceof Error ? error.message : 'Compiler service unavailable.';
      }
      if (!compilerPassed) {
        setFeedback(`Compilation failed:\n${compilerOutput || 'The compiler rejected the submission.'}`);
        return;
      }
      const aiPassed = await gradeCodingExercise({ type: 'coding', level: 'Course drill', prompt: activeDrill.instructions, hint: '', acceptedAnswers: [], starterCode: getStarterCode(activeDrill), validationTokens: activeDrill.gradingTokens, hiddenTests: activeDrill.hiddenTests }, composeProtectedSource(activeDrill, code), 'course-grading');
      const passed = compilerPassed && (aiPassed ?? (code.trim().length > 30 && activeDrill.gradingTokens.every(token => code.includes(token))));
      if (passed) {
        const finishedMessage = `Drill ${drillIndex + 1} Finished.`;
        setFeedback(finishedMessage);
        setCompletionNotice(finishedMessage);
        if (drillIndex === drills.length - 1) saveLesson({ isCompleted: true, bestScore: Math.max(lesson.bestScore, 100) });
        else setDrillIndex(index => index + 1);
        setCode('');
      } else {
        setFeedback(aiPassed === null ? 'The solution compiled, but AI grading was unavailable. Check the grading provider and try again.' : 'The solution compiled but did not pass the hidden tests. Review the requirements and try again.');
        addMistake({ description: `Failed course drill: ${activeDrill.title}`, example: code || 'No code submitted.', relatedConcept: '', relatedProblems: [], learningLog: 'Review the lesson and retry the drill.', reviewedRecently: false });
      }
    };

    return (
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link to={`/courses/${course.id}`} className="text-xs text-[#8a8f98] hover:text-white">← {course.title}</Link>
          <span className="text-[11px] text-[#10b981]">C++23 deep work session</span>
        </div>
        {isLoading ? (
          <div className="linear-card p-10 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#10b981]/30 border-t-[#10b981]" />
            <p className="text-sm text-white">Generating lesson...</p>
            <p className="mt-2 text-xs text-[#8a8f98]">{generationStage || 'The course models are preparing your reading and exercises.'}</p>
            <div className="mx-auto mt-5 h-1 max-w-xs overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#10b981]" /></div>
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
            <article className="linear-card overflow-y-auto p-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">Lesson</p>
              <h1 className="mt-2 text-xl font-bold text-white">{lesson.title}</h1>
              <p className="mt-2 text-xs text-[#8a8f98]">{lesson.overview}</p>
              {generationError && <p className="mt-4 rounded-md border border-[#f43f5e]/30 bg-[#f43f5e]/10 p-3 text-xs leading-relaxed text-[#fda4af]">Lesson generation failed: {generationError}</p>}
              {lesson.contentMarkdown ? <div className="mt-6"><LessonMarkdown content={lesson.contentMarkdown} /></div> : <p className="mt-6 text-sm text-[#dedede]">Lesson content is not available. Configure the Course Generation provider in AI settings.</p>}
              <button type="button" onClick={() => addConcept({ name: lesson.title, description: lesson.overview || lesson.title, relatedProblems: [], relatedNotes: [], notes: lesson.contentMarkdown || '' })} className="mt-6 rounded-md border border-[#c084fc]/30 px-3 py-2 text-xs text-[#d8b4fe] hover:bg-[#c084fc]/10">Save lesson to Concepts</button>
            </article>
            <aside className="linear-card flex flex-col p-5">
              <div className="flex gap-2 border-b border-white/[0.08] pb-3">
                <button type="button" onClick={() => setActiveTab('checks')} className={`px-2 py-1 text-xs ${activeTab === 'checks' ? 'font-semibold text-white' : 'text-[#8a8f98]'}`}>Concept Checks</button>
                <button type="button" onClick={() => setActiveTab('drills')} className={`px-2 py-1 text-xs ${activeTab === 'drills' ? 'font-semibold text-white' : 'text-[#8a8f98]'}`}>C++ Drills</button>
              </div>
                {activeTab === 'checks' ? (
    <div className="mt-4 space-y-4">
      <p className="text-xs text-[#8a8f98]">
        {completedChecks}/{(lesson.conceptChecks || []).length} checks correct
      </p>
      {(lesson.conceptChecks || []).map(check => (
        <div key={check.id} className="rounded-lg border border-white/[0.08] p-4">
          <p className="text-sm font-semibold text-white">{check.question}</p>
          <div className="mt-3 grid gap-2">
            {check.options.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => setCheckAnswers(current => ({ ...current, [check.id]: index }))}
                className={`rounded-md border px-3 py-2 text-left text-xs ${
                  checkAnswers[check.id] === index
                    ? index === check.correctIndex
                      ? 'border-[#10b981]/50 bg-[#10b981]/10 text-[#6ee7b7]'
                      : 'border-[#f43f5e]/50 bg-[#f43f5e]/10 text-[#fda4af]'
                    : 'border-white/[0.1] text-[#b7bbc3] hover:bg-white/[0.04]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {checkAnswers[check.id] !== undefined && (
            <p className="mt-3 text-xs text-[#8a8f98]">{check.explanation}</p>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-4 flex flex-col">
      {activeDrill ? (
        <>
          <p className="text-xs font-semibold text-white">{activeDrill.title}</p>
          <div className="mt-3 text-xs leading-6 text-[#b7bbc3]">
            <LessonMarkdown content={activeDrill.instructions} />
          </div>
          {completionNotice && (
            <p className="mt-3 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-2 text-xs font-semibold text-[#6ee7b7]">
              {completionNotice}
            </p>
          )}
          {harnessLoading && (
            <p className="mt-3 text-xs text-[#8a8f98]">Preparing private tests...</p>
          )}
          <div ref={drillEditorRef} className="mt-4">
            <CppPredictiveEditor
              id={`${activeDrill.id}-code`}
              value={removeMainFunction(code)}
              onChange={value => setCode(composeProtectedSource(activeDrill, value))}
              minHeight={210}
              maxHeight={440}
              aria-label={`${activeDrill.title} editable C++ implementation`}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-[#62666f]">
              AI tests are protected and run separately.
            </span>
            <button
              type="button"
              onClick={() => void submitDrill()}
              disabled={harnessLoading}
              className="linear-btn-primary ml-auto px-4 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-50"
            >
              {harnessLoading ? 'Preparing tests...' : 'Run and grade drill'}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-xs text-[#8a8f98]">
            {feedback}
          </p>
          {activeDrill.protectedMain && (
            <textarea
              value={activeDrill.protectedMain}
              readOnly
              className="sr-only"
              aria-label="Protected AI test harness"
            />
          )}
        </>
      ) : (
        <p className="text-xs text-[#8a8f98]">No drills available yet.</p>
      )}
    </div>
  )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default CourseRunnerPage;
