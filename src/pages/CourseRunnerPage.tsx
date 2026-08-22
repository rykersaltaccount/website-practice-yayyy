import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppContext from '../contexts/AppContext';
import type { Lesson, Drill } from '../types/course';
import { generateCourseLesson, gradeCodingExercise } from '../utils/aiProviders';

const CourseRunnerPage: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const { courses, updateCourse, addMistake, addConcept, startCoding, stopCoding } = useContext(AppContext)!;
  const course = courses.find(item => item.id === courseId);
  const sourceLesson = course?.modules.flatMap(module => module.lessons).find(lesson => lesson.id === lessonId);
  const [lesson, setLesson] = useState<Lesson | undefined>(sourceLesson);
  const [activeTab, setActiveTab] = useState<'checks' | 'drills'>('checks');
  const [checkAnswers, setCheckAnswers] = useState<Record<string, number>>({});
  const [code, setCode] = useState('');
  const [drillIndex, setDrillIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const generatedLessonKey = useRef<string | null>(null);

  useEffect(() => {
    startCoding();
    return () => stopCoding();
  }, []);

  useEffect(() => {
    const lessonKey = `${courseId || ''}:${lessonId || ''}`;
    if (!course || !sourceLesson || sourceLesson.contentMarkdown || generatedLessonKey.current === lessonKey) return;
    generatedLessonKey.current = lessonKey;
    setIsLoading(true);
    setGenerationStage('Preparing lesson generation...');
    void generateCourseLesson(course, sourceLesson.title, setGenerationStage)
      .then(generated => {
        if (!generated) throw new Error('The AI returned an incomplete lesson.');
        const hydrated = { ...sourceLesson, ...generated, id: sourceLesson.id };
        setLesson(hydrated);
        updateCourse(course.id, { modules: course.modules.map(module => ({ ...module, lessons: module.lessons.map(item => item.id === hydrated.id ? hydrated : item) })) });
      })
      .catch(error => setGenerationStage(error instanceof Error ? error.message : 'Lesson generation failed.'))
      .finally(() => setIsLoading(false));
  }, [courseId, lessonId]);

  if (!course || !lesson) return <div className="text-sm text-[#8a8f98]">Lesson not found.</div>;
  const drills = [...(lesson.drills || []), ...(lesson.capstone ? [lesson.capstone] : [])];
  const activeDrill: Drill | undefined = drills[drillIndex];
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
    try {
      const response = await fetch('/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, filename: 'course-drill.cpp' }) });
      if (response.ok) {
        const result = await response.json() as { ok?: boolean };
        compilerPassed = result.ok !== false;
      }
    } catch {
      compilerPassed = true;
    }
    const aiPassed = await gradeCodingExercise({ type: 'coding', level: 'Course drill', prompt: activeDrill.instructions, hint: '', acceptedAnswers: [], starterCode: activeDrill.starterCode, validationTokens: activeDrill.gradingTokens }, code, 'course-grading');
    const passed = compilerPassed && (aiPassed ?? (code.trim().length > 30 && activeDrill.gradingTokens.every(token => code.includes(token))));
    if (passed) { setFeedback('Drill passed.'); if (drillIndex === drills.length - 1) saveLesson({ isCompleted: true, bestScore: Math.max(lesson.bestScore, 100) }); else setDrillIndex(index => index + 1); setCode(''); }
    else { setFeedback('The solution did not pass. Review the compiler output and try again.'); addMistake({ description: `Failed course drill: ${activeDrill.title}`, example: code || 'No code submitted.', relatedConcept: '', relatedProblems: [], learningLog: 'Review the lesson and retry the drill.', reviewedRecently: false }); }
  };

  return <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-4"><div className="flex items-center justify-between"><Link to={`/courses/${course.id}`} className="text-xs text-[#8a8f98] hover:text-white">← {course.title}</Link><span className="text-[11px] text-[#10b981]">C++23 deep work session</span></div>{isLoading ? <div className="linear-card p-10 text-center"><div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#10b981]/30 border-t-[#10b981]" /><p className="text-sm text-white">Generating lesson...</p><p className="mt-2 text-xs text-[#8a8f98]">{generationStage || 'The course models are preparing your reading and exercises.'}</p><div className="mx-auto mt-5 h-1 max-w-xs overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#10b981]" /></div></div> : <div className="grid min-h-[70vh] gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]"><article className="linear-card overflow-y-auto p-6"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">Lesson</p><h1 className="mt-2 text-xl font-bold text-white">{lesson.title}</h1><p className="mt-2 text-xs text-[#8a8f98]">{lesson.overview}</p><div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-[#dedede]">{lesson.contentMarkdown || 'Lesson content is not available. Configure the Course Generation provider in AI settings.'}</div><button type="button" onClick={() => addConcept({ name: lesson.title, description: lesson.overview || lesson.title, relatedProblems: [], relatedNotes: [], notes: lesson.contentMarkdown || '' })} className="mt-6 rounded-md border border-[#c084fc]/30 px-3 py-2 text-xs text-[#d8b4fe] hover:bg-[#c084fc]/10">Save lesson to Concepts</button></article><aside className="linear-card flex flex-col p-5"><div className="flex gap-2 border-b border-white/[0.08] pb-3"><button type="button" onClick={() => setActiveTab('checks')} className={`px-2 py-1 text-xs ${activeTab === 'checks' ? 'text-white' : 'text-[#8a8f98]'}`}>Concept Checks</button><button type="button" onClick={() => setActiveTab('drills')} className={`px-2 py-1 text-xs ${activeTab === 'drills' ? 'text-white' : 'text-[#8a8f98]'}`}>C++ Drills</button></div>{activeTab === 'checks' ? <div className="space-y-5 overflow-y-auto pt-4">{(lesson.conceptChecks || []).map(check => <div key={check.id}><p className="text-xs font-semibold text-white">{check.question}</p><div className="mt-2 space-y-1">{check.options.map((option, index) => <label key={option} className="flex gap-2 rounded border border-white/[0.06] p-2 text-xs text-[#8a8f98] hover:text-white"><input type="radio" name={check.id} checked={checkAnswers[check.id] === index} onChange={() => setCheckAnswers(current => ({ ...current, [check.id]: index }))} />{option}</label>)}</div>{checkAnswers[check.id] !== undefined && <p className={`mt-2 text-[11px] ${checkAnswers[check.id] === check.correctIndex ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>{checkAnswers[check.id] === check.correctIndex ? check.explanation : 'Try again and reread the lesson section.'}</p>}</div>)}<p className="text-xs text-[#8a8f98]">{completedChecks}/{(lesson.conceptChecks || []).length} checks correct</p></div> : <div className="flex min-h-0 flex-1 flex-col pt-4">{activeDrill ? <><p className="text-[10px] uppercase tracking-wider text-[#c084fc]">Drill {drillIndex + 1} of {drills.length}</p><h2 className="mt-2 text-sm font-semibold text-white">{activeDrill.title}</h2><p className="mt-2 text-xs leading-relaxed text-[#8a8f98]">{activeDrill.instructions}</p><textarea value={code || activeDrill.starterCode} onChange={event => setCode(event.target.value)} className="linear-input mt-4 min-h-64 flex-1 resize-none p-3 font-mono text-xs" /><button type="button" onClick={() => void submitDrill()} className="linear-btn-primary mt-3 px-4 py-2 text-xs font-semibold">Run C++23 drill</button>{feedback && <p className="mt-2 text-xs text-[#f59e0b]">{feedback}</p>}</> : <p className="text-xs text-[#8a8f98]">No drills were generated for this lesson.</p>}</div>}</aside></div>}</div>;
};
export default CourseRunnerPage;
