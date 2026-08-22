import { useContext } from 'react';
import AppContext from '../contexts/AppContext';
import type { Problem } from '../types';

export const useProblems = () => {
  const { problems, addProblem, updateProblem, deleteProblem } = useContext(AppContext)!;

  const getProblemById = (id: string): Problem | undefined => {
    return problems.find(problem => problem.id === id);
  };

  const getProblemsByDifficulty = (difficulty: Problem['difficulty']) => {
    return problems.filter(problem => problem.difficulty === difficulty);
  };

  const getProblemsByTopic = (topic: string) => {
    return problems.filter(problem => problem.topics.includes(topic));
  };

  const getRecentProblems = (limit: number = 5) => {
    return [...problems]
      .sort((a, b) => new Date(b.dateSolved).getTime() - new Date(a.dateSolved).getTime())
      .slice(0, limit);
  };

  return {
    problems,
    addProblem,
    updateProblem,
    deleteProblem,
    getProblemById,
    getProblemsByDifficulty,
    getProblemsByTopic,
    getRecentProblems,
  };
};