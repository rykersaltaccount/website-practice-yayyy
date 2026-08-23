import React, { useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppContext from '../contexts/AppContext';

const CourseOverviewPage: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, deleteCourse } = useContext(AppContext)!;
  const course = courses.find(item => item.id === courseId);

  if (!course) return <div className="text-sm text-[#8a8f98]">Course not found.</div>;

  const handleDelete = () => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    deleteCourse(course.id);
    navigate('/courses');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/courses" className="text-xs text-[#8a8f98] hover:text-white">← Course library</Link>
      <header className="border-b border-white/[0.08] pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#10b981]/10 px-2 py-1 text-[10px] font-semibold uppercase text-[#10b981]">{course.level}</span>
            <span className="text-[11px] text-[#8a8f98]">{course.overallProgress}% complete</span>
          </div>
          <button type="button" onClick={handleDelete} className="rounded-md border border-[#f43f5e]/30 px-3 py-1.5 text-xs text-[#fda4af] hover:bg-[#f43f5e]/10">Delete course</button>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-white">{course.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8a8f98]">{course.description}</p>
      </header>
      <div className="space-y-4">
        {course.modules.map((module, moduleIndex) => (
          <section key={module.id} className="linear-card p-5">
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs text-[#10b981]">{String(moduleIndex + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-white">{module.title}</h2>
                <p className="mt-1 text-xs text-[#8a8f98]">{module.description}</p>
                <div className="mt-4 divide-y divide-white/[0.06]">
                  {module.lessons.map(lesson => (
                    <Link key={lesson.id} to={`/courses/${course.id}/lessons/${lesson.id}`} className="flex items-center justify-between py-3 text-xs hover:text-white">
                      <span className={lesson.isCompleted ? 'text-[#10b981]' : 'text-[#dedede]'}>{lesson.isCompleted ? '✓ ' : ''}{lesson.title}</span>
                      <span className="text-[10px] text-[#62666f]">{lesson.contentMarkdown ? 'Ready' : 'Generate lesson →'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default CourseOverviewPage;
