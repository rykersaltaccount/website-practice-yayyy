export type ProblemStatus = 'Backlog' | 'Todo' | 'In Progress' | 'Done';
export type ProblemPriority = 'Urgent' | 'High' | 'Medium' | 'Low' | 'None';

export interface Assignee {
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface Problem {
  id: string;
  issueKey?: string; // e.g. "ENG-828" or "CV-101"
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status?: ProblemStatus;
  priority?: ProblemPriority;
  assignee?: Assignee;
  gitBranch?: string; // e.g. "61039"
  starred?: boolean;
  leetCodeUrl: string;
  topics: string[];
  dateSolved: string; // ISO date string
  initialApproach: string;
  finalApproach: string;
  solution: string;
  mistakes: string[];
  whatILearned: string;
  reflection: Reflection;
}

export interface Reflection {
  whatWasDifficult: string;
  whatInitiallyThought: string;
  whatMadeItClick: string;
  conceptLearned: string;
  mistakeToAvoid: string;
  confidence: number; // 1-5 scale
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  notes?: string;
  keyTakeaways?: string;
  examples?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  tags?: string[];
  relatedProblems: string[]; // Problem IDs
  relatedNotes: string[]; // Note IDs
  mastery?: ConceptMastery;
  nextReviewDate?: string;
  reviewIntervalIndex?: number;
}

export interface ConceptMastery {
  mastered: boolean;
  masteredAt?: string;
  bestScore: number;
  attempts: number;
}

export interface Mistake {
  id: string;
  description: string;
  example: string;
  relatedConcept: string; // Concept ID
  relatedProblems: string[]; // Problem IDs
  reviewedRecently: boolean;
  learningLog: string;
  nextReviewDate?: string;
  reviewIntervalIndex?: number;
}

export interface CodingSession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  deepWorkIntervals?: number;
}

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role?: 'user' | 'admin';
  createdAt: string; // ISO date string
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  name: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}
