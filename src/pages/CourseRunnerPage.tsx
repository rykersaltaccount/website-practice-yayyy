// src/pages/CourseRunnerPage.tsx
import { useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import type { Course, Lesson } from '../types/course';
import { generateCourseLesson } from '../utils/aiProviders';
import AppContext from '../contexts/AppContext';

export default function CourseRunnerPage() {
  const { courseId, lessonId } = useParams();
  const { courses } = useContext(AppContext)!;

  // Find the course from context
  const course: Course | undefined = courses.find(c => c.id === courseId);

  // Find the lesson title from the course's modules
  let lessonTitle = 'Untitled Lesson';
  if (course && lessonId) {
    const foundLesson = course.modules
      .flatMap(m => m.lessons)
      .find(lesson => lesson.id === lessonId);
    lessonTitle = foundLesson?.title || lessonId;
  }

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!course) {
      setError('Course not found. Please go back to the course library.');
      return;
    }

    setIsLoading(true);
    setError('');
    setStage('');

    try {
      const result = await generateCourseLesson(course, lessonTitle, (msg) => {
        setStage(msg);
      });
      setLesson(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Course Runner</h1>

      <div style={{ marginBottom: '16px' }}>
        <p>
          <strong>Course:</strong> {course?.title || 'Course not found'}
        </p>
        <p>
          <strong>Lesson:</strong> {lessonTitle}
        </p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isLoading || !course}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: isLoading || !course ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Generating...' : 'Generate Lesson'}
      </button>

      {stage && (
        <p style={{ marginTop: '16px', fontStyle: 'italic', color: '#6b7280' }}>
          Status: {stage}
        </p>
      )}

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          whiteSpace: 'pre-wrap',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {lesson && (
      <div style={{ marginTop: '24px' }}>
        {lesson.overview && <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{lesson.overview}</h2>}

        {/* Lesson content */}
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{lesson.contentMarkdown}</pre>
        </div>

        {/* Concept Checks */}
        {(() => {
          const conceptChecks = lesson.conceptChecks ?? [];
          if (conceptChecks.length === 0) return null;

          return (
            <div style={{ marginBottom: '24px' }}>
              <h3>Concept Checks</h3>
              {conceptChecks.map(check => (
                <div key={check.id} style={{
                  marginBottom: '16px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}>
                  <strong>{check.question}</strong>
                  <ul>
                    {check.options.map((opt, idx) => (
                      <li key={idx} style={{
                        fontWeight: idx === check.correctIndex ? 'bold' : 'normal',
                        color: idx === check.correctIndex ? '#15803d' : 'inherit',
                      }}>
                        {opt}
                        {idx === check.correctIndex && ' ✓'}
                      </li>
                    ))}
                  </ul>
                  <p style={{ color: '#4b5563', fontSize: '14px' }}>{check.explanation}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Drills */}
        {(() => {
          const drills = lesson.drills ?? [];
          if (drills.length === 0) return null;

          return (
            <div style={{ marginBottom: '24px' }}>
              <h3>Drills</h3>
              {drills.map(drill => (
                <div key={drill.id} style={{
                  marginBottom: '16px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}>
                  <h4>{drill.title}</h4>
                  <p>{drill.instructions}</p>
                  {drill.starterCode && (
                    <pre style={{
                      backgroundColor: '#111827',
                      color: '#e5e7eb',
                      padding: '12px',
                      borderRadius: '6px',
                      overflowX: 'auto',
                    }}>
                      <code>{drill.starterCode}</code>
                    </pre>
                  )}
                  {drill.gradingTokens && drill.gradingTokens.length > 0 && (
                    <p style={{ marginTop: '8px', fontSize: '14px' }}>
                      <strong>Grading tokens:</strong> {drill.gradingTokens.join(', ')}
                    </p>
                  )}
                  {drill.hints && drill.hints.length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary>Hints</summary>
                      <ul>
                        {drill.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    )}
  </div>
  )
}