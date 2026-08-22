import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import AppContext from '../contexts/AppContext';
import type { Course } from '../types/course';
import { generateCourseSyllabus } from '../utils/aiProviders';

const CourseLibraryPage: React.FC = () => {
  const { courses, addCourse } = useContext(AppContext)!;
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<Course['level']>('Intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const createCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError('');
    const generated = await generateCourseSyllabus(topic.trim(), level);
    if (generated) addCourse(generated);
    else setError('Configure the Course Generation provider in AI settings, then try again.');
    if (generated) { setShowForm(false); setTopic(''); }
    setIsGenerating(false);
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
      <div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">Learning paths</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white">C++23 Courses</h1><p className="mt-1 text-xs text-[#8a8f98]">Generated systems programming curricula for deliberate practice.</p></div>
      <button type="button" onClick={() => setShowForm(true)} className="linear-btn-primary px-4 py-2 text-xs font-semibold">+ Generate course</button>
    </div>
    {courses.length === 0 ? <div className="rounded-xl border border-dashed border-white/[0.1] p-16 text-center"><p className="text-sm font-semibold text-white">No courses yet</p><p className="mt-2 text-xs text-[#8a8f98]">Generate a course from any C++23 systems topic.</p></div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{courses.map(course => <Link key={course.id} to={`/courses/${course.id}`} className="linear-card group p-5"><div className="flex items-center justify-between"><span className="rounded bg-[#10b981]/10 px-2 py-1 text-[10px] font-semibold uppercase text-[#10b981]">{course.level}</span><span className="text-[11px] text-[#8a8f98]">{course.overallProgress}%</span></div><h2 className="mt-4 text-base font-semibold text-white group-hover:text-[#10b981]">{course.title}</h2><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#8a8f98]">{course.description}</p><div className="mt-5 h-1 rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#10b981]" style={{ width: `${course.overallProgress}%` }} /></div><p className="mt-3 text-[11px] text-[#62666f]">{course.modules.length} modules · {course.modules.reduce((sum, module) => sum + module.lessons.length, 0)} lessons</p></Link>)}</div>}
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"><form onSubmit={createCourse} className="w-full max-w-md space-y-4 rounded-xl border border-white/[0.12] bg-[#0c0d12] p-6 shadow-2xl"><div className="flex items-start justify-between border-b border-white/[0.08] pb-4"><div><h2 className="text-lg font-bold text-white">Generate a course</h2><p className="mt-1 text-xs text-[#8a8f98]">The AI will first create a syllabus.</p></div><button type="button" onClick={() => setShowForm(false)} className="text-[#8a8f98] hover:text-white">✕</button></div><label className="block text-xs text-[#8a8f98]">Topic<input value={topic} onChange={event => setTopic(event.target.value)} className="linear-input mt-1 w-full px-3 py-2 text-xs" placeholder="e.g. Linux process memory and signals" required /></label><label className="block text-xs text-[#8a8f98]">Difficulty<select value={level} onChange={event => setLevel(event.target.value as Course['level'])} className="linear-input mt-1 w-full px-3 py-2 text-xs"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>{error && <p className="text-xs text-[#f43f5e]">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-white/[0.1] px-4 py-2 text-xs text-[#8a8f98]">Cancel</button><button disabled={isGenerating} className="linear-btn-primary px-4 py-2 text-xs font-semibold">{isGenerating ? 'Generating...' : 'Generate syllabus'}</button></div></form></div>}
  </div>;
};
export default CourseLibraryPage;
