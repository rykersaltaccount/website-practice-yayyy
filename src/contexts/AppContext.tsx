import { createContext, useState, useEffect } from 'react';
import type { Problem, Note, Concept, Mistake } from '../types';
import type { ReactNode } from 'react';

interface AppContextType {
  problems: Problem[];
  notes: Note[];
  concepts: Concept[];
  mistakes: Mistake[];

  // Problems
  addProblem: (problem: Omit<Problem, 'id'>) => void;
  loadDemoProblems: () => void;
  clearDemoProblems: () => void;
  updateProblem: (id: string, problem: Partial<Problem>) => void;
  deleteProblem: (id: string) => void;

  // Notes
  addNote: (note: Omit<Note, 'id'>) => void;
  updateNote: (id: string, note: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Concepts
  addConcept: (concept: Omit<Concept, 'id'>) => void;
  updateConcept: (id: string, concept: Partial<Concept>) => void;
  deleteConcept: (id: string) => void;

  // Mistakes
  addMistake: (mistake: Omit<Mistake, 'id'>) => void;
  updateMistake: (id: string, mistake: Partial<Mistake>) => void;
  deleteMistake: (id: string) => void;
  toggleReviewed: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [problems, setProblems] = useState<Problem[]>(() => {
    const saved = localStorage.getItem('codevault-problems');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved problems', e);
      }
    }
    return [];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('codevault-notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved notes', e);
      }
    }
    return [];
  });

  const [concepts, setConcepts] = useState<Concept[]>(() => {
    const saved = localStorage.getItem('codevault-concepts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved concepts', e);
      }
    }
    return [];
  });

  const [mistakes, setMistakes] = useState<Mistake[]>(() => {
    const saved = localStorage.getItem('codevault-mistakes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved mistakes', e);
      }
    }
    return [];
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('codevault-problems', JSON.stringify(problems));
    } catch (error) {
      console.error('Unable to save problems to localStorage:', error);
    }
  }, [problems]);

  useEffect(() => {
    try {
      localStorage.setItem('codevault-notes', JSON.stringify(notes));
    } catch (error) {
      console.error('Unable to save notes to localStorage:', error);
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem('codevault-concepts', JSON.stringify(concepts));
    } catch (error) {
      console.error('Unable to save concepts to localStorage:', error);
    }
  }, [concepts]);

  useEffect(() => {
    try {
      localStorage.setItem('codevault-mistakes', JSON.stringify(mistakes));
    } catch (error) {
      console.error('Unable to save mistakes to localStorage:', error);
    }
  }, [mistakes]);

  // Problem functions
  const addProblem = (problem: Omit<Problem, 'id'>) => {
    const keyNumber = problems.length + 100;
    const newProblem: Problem = {
      ...problem,
      id: crypto.randomUUID(),
      issueKey: problem.issueKey || `ENG-${keyNumber}`,
      status: problem.status || 'Todo',
      priority: problem.priority || 'Medium',
      assignee: problem.assignee || { name: 'you', role: 'Engineer' },
      gitBranch: problem.gitBranch || `${61000 + Math.floor(Math.random() * 1000)}`,
      starred: problem.starred ?? false,
      dateSolved: problem.dateSolved || new Date().toISOString(),
    };
    setProblems(prev => [newProblem, ...prev]);
  };

  const loadDemoProblems = () => {
    const demoProblems: Problem[] = Array.from({ length: 50 }, (_, index) => {
      const problemNumber = index + 1;
      const difficulty: Problem['difficulty'] =
        problemNumber % 3 === 0 ? 'Hard' : problemNumber % 2 === 0 ? 'Medium' : 'Easy';
      const status: Problem['status'] =
        problemNumber % 4 === 0 ? 'Done' : problemNumber % 3 === 0 ? 'In Progress' : 'Todo';
      const priority: Problem['priority'] =
        problemNumber % 4 === 0 ? 'Urgent' : problemNumber % 2 === 0 ? 'High' : 'Medium';
      const assignees = ['jori', 'lena', 'didier', 'andreas', 'you'];

      return {
        id: crypto.randomUUID(),
        issueKey: `ENG-${1000 + problemNumber}`,
        title: `[Demo] Problem ${problemNumber}: ${problemNumber % 2 === 0 ? 'Optimize graph traversal algorithm' : 'Implement LRU cache eviction policy'}`,
        difficulty,
        status,
        priority,
        assignee: { name: assignees[problemNumber % assignees.length] },
        gitBranch: `${61000 + problemNumber}`,
        starred: problemNumber % 5 === 0,
        leetCodeUrl: `https://leetcode.com/problems/demo-problem-${problemNumber}/`,
        topics: [problemNumber % 2 === 0 ? 'Dynamic Programming' : 'Hash Table', difficulty],
        dateSolved: new Date(Date.now() - problemNumber * 86400000).toISOString(),
        initialApproach: 'Brute force iteration over all possible state permutations.',
        finalApproach: 'Optimized memoization table with sliding window pointers.',
        solution: 'function solve() { return true; }',
        mistakes: ['Off by one error on edge boundary'],
        whatILearned: 'Memoization reduces O(2^N) branch factor to O(N).',
        reflection: {
          whatWasDifficult: 'Edge case handling on empty constraints.',
          whatInitiallyThought: 'Greedy choice would work.',
          whatMadeItClick: 'Counterexample proved optimal substructure requires DP.',
          conceptLearned: 'Dynamic Programming',
          mistakeToAvoid: 'Assuming greedy strategy without formal proof.',
          confidence: 4,
        },
      };
    });

    setProblems(prev => [
      ...prev.filter(problem => !problem.title.startsWith('[Demo]')),
      ...demoProblems,
    ]);
  };

  const clearDemoProblems = () => {
    setProblems(prev => prev.filter(problem => !problem.title.startsWith('[Demo]')));
  };

  const updateProblem = (id: string, updates: Partial<Problem>) => {
    setProblems(prev =>
      prev.map(problem =>
        problem.id === id ? { ...problem, ...updates } : problem
      )
    );
  };

  const deleteProblem = (id: string) => {
    setProblems(prev => prev.filter(problem => problem.id !== id));
  };

  // Note functions
  const addNote = (note: Omit<Note, 'id'>) => {
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  // Concept functions
  const addConcept = (concept: Omit<Concept, 'id'>) => {
    const newConcept: Concept = {
      ...concept,
      id: crypto.randomUUID(),
    };
    setConcepts(prev => [newConcept, ...prev]);
  };

  const updateConcept = (id: string, updates: Partial<Concept>) => {
    setConcepts(prev =>
      prev.map(concept =>
        concept.id === id ? { ...concept, ...updates } : concept
      )
    );
  };

  const deleteConcept = (id: string) => {
    setConcepts(prev => prev.filter(concept => concept.id !== id));
  };

  // Mistake functions
  const addMistake = (mistake: Omit<Mistake, 'id'>) => {
    const newMistake: Mistake = {
      ...mistake,
      id: crypto.randomUUID(),
      reviewedRecently: false,
    };
    setMistakes(prev => [newMistake, ...prev]);
  };

  const updateMistake = (id: string, updates: Partial<Mistake>) => {
    setMistakes(prev =>
      prev.map(mistake =>
        mistake.id === id ? { ...mistake, ...updates } : mistake
      )
    );
  };

  const deleteMistake = (id: string) => {
    setMistakes(prev => prev.filter(mistake => mistake.id !== id));
  };

  const toggleReviewed = (id: string) => {
    setMistakes(prev =>
      prev.map(mistake =>
        mistake.id === id ? { ...mistake, reviewedRecently: !mistake.reviewedRecently } : mistake
      )
    );
  };

  return (
    <AppContext.Provider value={{
      problems,
      notes,
      concepts,
      mistakes,
      addProblem,
      loadDemoProblems,
      clearDemoProblems,
      updateProblem,
      deleteProblem,
      addNote,
      updateNote,
      deleteNote,
      addConcept,
      updateConcept,
      deleteConcept,
      addMistake,
      updateMistake,
      deleteMistake,
      toggleReviewed,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
