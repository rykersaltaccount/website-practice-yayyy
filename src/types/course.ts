export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  modules: CourseModule[];
  createdAt: string;
  overallProgress: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  overview?: string;
  contentMarkdown?: string;
  conceptChecks?: ConceptCheck[];
  drills?: Drill[];
  capstone?: Capstone;
  isCompleted: boolean;
  bestScore: number;
}

export interface ConceptCheck {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Drill {
  id: string;
  title: string;
  instructions: string;
  starterCode: string;
  solution: string;
  hints: string[];
  gradingTokens: string[];
}

export interface Capstone extends Drill {
  id: string;
}
