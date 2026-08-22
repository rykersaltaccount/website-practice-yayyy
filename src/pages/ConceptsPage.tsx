import React, { useState, useContext } from 'react';
import AppContext from '../contexts/AppContext';
import type { Concept } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { generateExercises, gradeCodingExercise } from '../utils/aiProviders';

const CONCEPT_NOTE_TEMPLATE = `What is it?

How it works:

When to use it:

Example:

Time complexity:

Space complexity:

Key takeaways:
`;

interface Exercise {
  type: 'question' | 'coding';
  level: string;
  prompt: string;
  hint: string;
  acceptedAnswers: string[];
  starterCode?: string;
  validationTokens?: string[];
}

type PracticeDifficulty = 'Easy' | 'Medium' | 'Hard';

const buildExercises = (concept: Concept, difficulty?: PracticeDifficulty): Exercise[] => {
  const name = concept.name;
  const description = concept.description || `the core idea behind ${name}`;
  const complexity = concept.timeComplexity || 'the expected time complexity';
  const exercises: Exercise[] = [
    {
      type: 'question', level: 'Foundations',
      prompt: `In one sentence, what problem does ${name} solve?`,
      hint: 'Start with the purpose, not the implementation.',
      acceptedAnswers: [name.toLowerCase(), ...description.toLowerCase().split(/\W+/).filter(word => word.length > 4).slice(0, 3)],
    },
    {
      type: 'question', level: 'Core mechanics',
      prompt: `Describe the core mechanism or invariant that makes ${name} work.`,
      hint: 'Name the state, rule, or operation that must remain true.',
      acceptedAnswers: [name.toLowerCase(), ...description.toLowerCase().split(/\W+/).filter(word => word.length > 5).slice(1, 4)],
    },
    {
      type: 'coding', level: 'Application',
      prompt: `Write a C++23 solution for an original practical scenario where ${name} is preferable to a simpler approach.`,
      hint: 'Implement the requested behavior in C++23 and explain your trade-off in a comment.',
      acceptedAnswers: [],
      starterCode: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Implement the solution in C++23.\n    return 0;\n}\n`,
      validationTokens: ['#include', 'return 0'],
    },
    {
      type: 'question', level: 'Complexity',
      prompt: `What time or space complexity should you expect when using ${name}?`,
      hint: 'Use Big-O notation when you can.',
      acceptedAnswers: [complexity.toLowerCase(), 'o(', 'complexity', 'linear', 'constant', 'log'],
    },
    {
      type: 'question', level: 'Advanced synthesis',
      prompt: `Explain one trade-off, edge case, or failure mode an expert should consider with ${name}.`,
      hint: 'A strong answer names both the risk and how you would handle it.',
      acceptedAnswers: ['trade-off', 'tradeoff', 'edge', 'case', 'failure', 'risk', 'memory', 'performance', name.toLowerCase()],
    },
  ];
  if (difficulty === 'Easy') return exercises.slice(0, 2);
  if (difficulty === 'Medium') return exercises.slice(1, 4);
  if (difficulty === 'Hard') return exercises.slice(2);
  return exercises;
};

const ConceptsPage: React.FC = () => {
  const { concepts, addConcept, updateConcept, deleteConcept, problems, notes } = useContext(AppContext)!;
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [conceptToDelete, setConceptToDelete] = useState<Concept | null>(null);
  const [testConcept, setTestConcept] = useState<Concept | null>(null);
  const [testExercises, setTestExercises] = useState<Exercise[]>([]);
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswer, setTestAnswer] = useState('');
  const [testResult, setTestResult] = useState<'idle' | 'passed' | 'failed'>('idle');
  const [practiceConcept, setPracticeConcept] = useState<Concept | null>(null);
  const [practiceDifficulty, setPracticeDifficulty] = useState<PracticeDifficulty>('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [codeAnswer, setCodeAnswer] = useState('');
  const [assessmentTask, setAssessmentTask] = useState<'practice' | 'test'>('test');

  const getRelatedProblems = (conceptId: string) => {
    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return [];
    return problems.filter(problem => concept.relatedProblems?.includes(problem.id));
  };

  const getRelatedNotes = (conceptId: string) => {
    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return [];
    return notes.filter(note => concept.relatedNotes?.includes(note.id));
  };

  const filteredConcepts = concepts.filter(concept =>
    concept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concept.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditConcept = (concept: Concept) => {
    setEditingConceptId(concept.id);
    setShowForm(true);
  };

  const selectedConcept = concepts.find(concept => concept.id === selectedConceptId);

  const startConceptTest = async (concept: Concept) => {
    setIsGenerating(true);
    setAssessmentTask('test');
    const generated = await generateExercises(concept, 'test');
    setTestConcept(concept);
    setTestExercises(generated || buildExercises(concept));
    setTestIndex(0);
    setTestAnswer('');
    setCodeAnswer(generated?.[0]?.type === 'coding' ? generated[0].starterCode || '' : '');
    setTestResult('idle');
    setIsGenerating(false);
  };

  const startPractice = async () => {
    if (!practiceConcept) return;
    setIsGenerating(true);
    setAssessmentTask('practice');
    const concept = practiceConcept;
    const generated = await generateExercises(concept, 'practice', practiceDifficulty);
    setTestConcept(concept);
    setTestExercises(generated || buildExercises(concept, practiceDifficulty));
    setTestIndex(0);
    setTestAnswer('');
    setCodeAnswer(generated?.[0]?.type === 'coding' ? generated[0].starterCode || '' : '');
    setTestResult('idle');
    setPracticeConcept(null);
    setIsGenerating(false);
  };

  const closeConceptTest = () => {
    setTestConcept(null);
    setTestAnswer('');
    setTestResult('idle');
  };

  const submitExercise = async () => {
    const exercise = testExercises[testIndex];
    const answer = (exercise.type === 'coding' ? codeAnswer : testAnswer).trim().toLowerCase();
    setIsChecking(true);
    const aiGrade = exercise.type === 'coding' ? await gradeCodingExercise(exercise, codeAnswer, assessmentTask) : null;
    const passed = exercise.type === 'coding'
      ? (aiGrade ?? (codeAnswer.trim().length >= 30 && (exercise.validationTokens || []).every(token => codeAnswer.toLowerCase().includes(token.toLowerCase()))))
      : answer.length >= 12 && exercise.acceptedAnswers.some(keyword => answer.includes(keyword));
    setIsChecking(false);
    if (!passed || !testConcept) {
      if (testConcept) {
        updateConcept(testConcept.id, {
          mastery: {
            mastered: false,
            bestScore: Math.max(testConcept.mastery?.bestScore || 0, testIndex),
            attempts: (testConcept.mastery?.attempts || 0) + 1,
          },
        });
      }
      setTestResult('failed');
      return;
    }
    if (testIndex === testExercises.length - 1) {
      updateConcept(testConcept.id, {
        mastery: { mastered: true, masteredAt: new Date().toISOString(), bestScore: testExercises.length, attempts: (testConcept.mastery?.attempts || 0) + 1 },
      });
      setTestResult('passed');
      return;
    }
    setTestIndex(index => index + 1);
    setTestAnswer('');
    setCodeAnswer('');
  };

  const handleSaveConceptDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConcept) return;

    const form = new FormData(event.currentTarget);
    updateConcept(selectedConcept.id, {
      notes: String(form.get('notes') || ''),
    });
    setSelectedConceptId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Programming Concepts</h1>
          <p className="text-xs text-[#8a8f98] mt-1">Core paradigms, data structures, and mental models</p>
        </div>
        <button
          onClick={() => {
            setEditingConceptId(null);
            setShowForm(true);
          }}
          className="linear-btn-primary px-4 py-2 text-xs font-semibold"
        >
          + New Concept
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search concepts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="linear-input w-full py-2 pl-9 pr-3 text-xs"
        />
        <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#62666f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      {/* Concepts Grid */}
      {filteredConcepts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConcepts.map(concept => {
            const relProblems = getRelatedProblems(concept.id);
            const relNotes = getRelatedNotes(concept.id);

            return (
              <div
                key={concept.id}
                onClick={() => setSelectedConceptId(concept.id)}
                className="linear-card group p-5 flex flex-col justify-between cursor-pointer select-none"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c084fc]">
                      Concept
                    </span>
                    {concept.timeComplexity && (
                      <span className="font-mono text-[10px] text-[#8a8f98] bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {concept.timeComplexity}
                      </span>
                    )}
                    {concept.mastery?.mastered && <span className="rounded bg-[#10b981]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#10b981]">MASTERED</span>}
                  </div>

                  <h3 className="text-sm font-semibold text-white group-hover:text-[#c084fc] transition-colors leading-snug">
                    {concept.name}
                  </h3>

                  <p className="text-xs text-[#8a8f98] line-clamp-3 leading-relaxed">
                    {concept.description}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-white/[0.05] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-[#62666f]">
                    <span>{relProblems.length} problems</span>
                    <span>•</span>
                    <span>{relNotes.length} notes</span>
                  </div>

                  <span className="text-[11px] text-[#c084fc] font-medium group-hover:underline">
                    View Notes →
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); startConceptTest(concept); }}
                  className="mt-3 w-full rounded-md border border-[#c084fc]/30 bg-[#c084fc]/10 px-3 py-2 text-[11px] font-semibold text-[#d8b4fe] hover:bg-[#c084fc]/20"
                >
                  {concept.mastery?.mastered ? 'Retake mastery test' : 'Start progressive test'}
                </button>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); setPracticeConcept(concept); }}
                  className="mt-2 w-full rounded-md border border-[#06b6d4]/30 px-3 py-2 text-[11px] font-semibold text-[#67e8f9] hover:bg-[#06b6d4]/10"
                >
                  Practice this concept
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center text-xs text-[#8a8f98]">
          <p>No concepts found matching your search.</p>
        </div>
      )}

      {/* Concept Note Editor / Viewer Modal */}
      {selectedConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="my-4 flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#0c0d12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0e1015] px-5 py-3">
              <div>
                <h2 className="font-mono text-xs font-semibold text-white">{selectedConcept.name}.md</h2>
                <p className="text-[10px] text-[#8a8f98]">Structured concept documentation and complexities</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConceptId(null)}
                className="text-[#8a8f98] hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConceptDetails} className="flex min-h-0 flex-1 flex-col">
              <textarea
                id="concept-notes"
                name="notes"
                defaultValue={selectedConcept.notes || CONCEPT_NOTE_TEMPLATE}
                spellCheck
                className="min-h-0 flex-1 resize-none border-0 bg-[#08090a] p-6 font-mono text-xs leading-relaxed text-[#dedede] outline-none placeholder:text-[#62666f]"
                aria-label={`${selectedConcept.name} notes`}
              />

              <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0e1015] px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = selectedConcept;
                      setSelectedConceptId(null);
                      handleEditConcept(toEdit);
                    }}
                    className="rounded-md border border-white/[0.1] px-3.5 py-1.5 text-xs text-[#8a8f98] hover:text-white"
                  >
                    Edit metadata
                  </button>
                  <button
                    type="button"
                    onClick={() => setConceptToDelete(selectedConcept)}
                    className="rounded-md border border-[#f43f5e]/30 px-3.5 py-1.5 text-xs text-[#f43f5e] hover:bg-[#f43f5e]/10"
                  >
                    Delete
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedConceptId(null)}
                    className="rounded-md border border-white/[0.1] px-3.5 py-1.5 text-xs text-[#8a8f98] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="linear-btn-primary px-4 py-1.5 text-xs font-semibold">
                    Save Notes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {conceptToDelete && (
        <ConfirmDialog
          title="Delete concept?"
          message={`This will permanently delete “${conceptToDelete.name}”.`}
          onCancel={() => setConceptToDelete(null)}
          onConfirm={() => {
            deleteConcept(conceptToDelete.id);
            setConceptToDelete(null);
            setSelectedConceptId(null);
          }}
        />
      )}

      {testConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-xl border border-white/[0.12] bg-[#0c0d12] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c084fc]">Progressive assessment</p>
                <h2 className="mt-1 text-lg font-bold text-white">{testConcept.name} mastery test</h2>
                <p className="mt-1 text-xs text-[#8a8f98]">C++23 basics to advanced synthesis · pass every exercise to master it</p>
              </div>
              <button type="button" onClick={closeConceptTest} className="text-[#8a8f98] hover:text-white" aria-label="Close test">✕</button>
            </div>

            {testResult === 'passed' ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10b981]/15 text-2xl text-[#10b981]">✓</div>
                <h3 className="mt-4 text-xl font-bold text-white">Concept mastered</h3>
                <p className="mt-2 text-sm text-[#8a8f98]">You completed all {testExercises.length} exercises without failing.</p>
                <button type="button" onClick={closeConceptTest} className="linear-btn-primary mt-6 px-4 py-2 text-xs font-semibold">Done</button>
              </div>
            ) : testResult === 'failed' ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f43f5e]/15 text-2xl text-[#f43f5e]">!</div>
                <h3 className="mt-4 text-xl font-bold text-white">Test not passed</h3>
                <p className="mt-2 text-sm text-[#8a8f98]">A mastery test requires every answer to pass. Review the concept and try again.</p>
                <div className="mt-6 flex justify-center gap-2">
                  <button type="button" onClick={closeConceptTest} className="rounded-md border border-white/[0.1] px-4 py-2 text-xs text-[#8a8f98] hover:text-white">Close</button>
                  <button type="button" onClick={() => startConceptTest(testConcept)} className="linear-btn-primary px-4 py-2 text-xs font-semibold">Try again</button>
                </div>
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); submitExercise(); }} className="space-y-5 pt-5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-white">Exercise {testIndex + 1} of {testExercises.length}</span>
                  <span className="text-[#c084fc]">{testExercises[testIndex].level}</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#c084fc] transition-all" style={{ width: `${((testIndex + 1) / testExercises.length) * 100}%` }} /></div>
                <div>
                  <span className="mb-2 inline-flex rounded bg-[#06b6d4]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#67e8f9]">{testExercises[testIndex].type === 'coding' ? 'Coding exercise' : 'Concept question'}</span>
                  <h3 className="text-base font-semibold leading-relaxed text-white">{testExercises[testIndex].prompt}</h3>
                  <p className="mt-2 text-xs text-[#8a8f98]">Hint: {testExercises[testIndex].hint}</p>
                </div>
                {testExercises[testIndex].type === 'coding' ? (
                  <div>
                    <p className="mb-2 text-[11px] text-[#8a8f98]">Complete the starter code using C++23. Your solution is evaluated for behavior by the configured AI grader.</p>
                    <textarea value={codeAnswer} onChange={event => setCodeAnswer(event.target.value)} rows={10} autoFocus className="linear-input w-full resize-y p-3 font-mono text-xs leading-relaxed" placeholder="Write your C++23 solution..." required />
                  </div>
                ) : <textarea value={testAnswer} onChange={event => setTestAnswer(event.target.value)} rows={5} autoFocus className="linear-input w-full resize-none p-3 text-sm leading-relaxed" placeholder="Write your answer..." required />}
                <div className="flex justify-end"><button type="submit" disabled={isGenerating || isChecking} className="linear-btn-primary px-4 py-2 text-xs font-semibold">{isGenerating || isChecking ? 'Checking...' : testIndex === testExercises.length - 1 ? 'Finish test' : 'Check answer'}</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {practiceConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0c0d12] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#06b6d4]">Practice mode</p>
                <h2 className="mt-1 text-lg font-bold text-white">{practiceConcept.name}</h2>
                <p className="mt-1 text-xs text-[#8a8f98]">Choose a difficulty and work through targeted exercises.</p>
              </div>
              <button type="button" onClick={() => setPracticeConcept(null)} className="text-[#8a8f98] hover:text-white" aria-label="Close practice setup">✕</button>
            </div>
            <div className="space-y-2 pt-5">
              {(['Easy', 'Medium', 'Hard'] as PracticeDifficulty[]).map(difficulty => (
                <label key={difficulty} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${practiceDifficulty === difficulty ? 'border-[#06b6d4] bg-[#06b6d4]/10' : 'border-white/[0.08] hover:border-white/[0.18]'}`}>
                  <span><span className="block text-xs font-semibold text-white">{difficulty}</span><span className="mt-1 block text-[11px] text-[#8a8f98]">{difficulty === 'Easy' ? 'Definitions and core purpose' : difficulty === 'Medium' ? 'Mechanics and complexity' : 'Applications and trade-offs'}</span></span>
                  <input type="radio" name="practiceDifficulty" value={difficulty} checked={practiceDifficulty === difficulty} onChange={() => setPracticeDifficulty(difficulty)} className="accent-[#06b6d4]" />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPracticeConcept(null)} className="rounded-md border border-white/[0.1] px-4 py-2 text-xs text-[#8a8f98] hover:text-white">Cancel</button>
              <button type="button" onClick={startPractice} className="linear-btn-primary px-4 py-2 text-xs font-semibold">Start practice</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Concept Info Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">
                {editingConceptId ? 'Edit Concept' : 'Add New Concept'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-[#8a8f98] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const relatedNotesField = form.elements.namedItem('relatedNotes') as HTMLInputElement | null;
                const existingConcept = editingConceptId
                  ? concepts.find(concept => concept.id === editingConceptId)
                  : undefined;
                const conceptData = {
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
                  timeComplexity: (form.elements.namedItem('timeComplexity') as HTMLInputElement).value,
                  spaceComplexity: (form.elements.namedItem('spaceComplexity') as HTMLInputElement).value,
                  relatedProblems: ((form.elements.namedItem('relatedProblems') as HTMLInputElement).value)
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id.length > 0),
                  relatedNotes: relatedNotesField
                    ? relatedNotesField.value.split(',').map(id => id.trim()).filter(id => id.length > 0)
                    : existingConcept?.relatedNotes || [],
                };

                if (editingConceptId) {
                  updateConcept(editingConceptId, conceptData);
                } else {
                  addConcept(conceptData);
                }
                setShowForm(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Concept Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.name || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Overview Description</label>
                <textarea
                  name="description"
                  defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.description || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Time Complexity</label>
                  <input
                    type="text"
                    name="timeComplexity"
                    defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.timeComplexity || '' : ''}
                    placeholder="e.g., O(N log N)"
                    className="linear-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Space Complexity</label>
                  <input
                    type="text"
                    name="spaceComplexity"
                    defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.spaceComplexity || '' : ''}
                    placeholder="e.g., O(1)"
                    className="linear-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Related Problem IDs (comma-separated)</label>
                <input
                  type="text"
                  name="relatedProblems"
                  defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.relatedProblems.join(', ') || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  placeholder="eng-2703, eng-828"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-white/[0.1] px-4 py-2 text-xs text-[#8a8f98] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary px-4 py-2 text-xs font-semibold"
                >
                  {editingConceptId ? 'Update Concept' : 'Save Concept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptsPage;