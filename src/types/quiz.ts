export const QUIZ_QUESTION_TYPES = ["multiple_choice", "true_false", "short_answer", "essay", "matching"] as const;
export const QUIZ_ATTEMPT_STATUSES = ["submitted", "needs_review"] as const;

export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPES)[number];
export type QuizAttemptStatus = (typeof QUIZ_ATTEMPT_STATUSES)[number];

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizMatchPair {
  id: string;
  prompt: string;
  answer: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  points: number;
  options: QuizOption[];
  correctAnswer: string;
  pairs: QuizMatchPair[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherEmail: string;
  timeLimitMinutes: number;
  randomizeQuestions: boolean;
  questions: QuizQuestion[];
  createdAtMs: number;
  updatedAtMs: number;
}

export interface QuizAuthor {
  uid: string;
  email: string;
}

export interface QuizFormValues {
  title: string;
  description: string;
  timeLimitMinutes: number;
  randomizeQuestions: boolean;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  questionId: string;
  type: QuizQuestionType;
  selectedOptionId: string;
  responseText: string;
  matchingAnswers: Record<string, string>;
  awardedPoints: number;
  maxPoints: number;
  autoMarked: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentEmail: string;
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  objectiveScore: number;
  objectiveMaxScore: number;
  percentage: number;
  status: QuizAttemptStatus;
  startedAtMs: number;
  submittedAtMs: number;
  timeSpentSeconds: number;
}

export interface QuizSubmissionValues {
  startedAtMs: number;
  timeSpentSeconds: number;
  answers: Record<string, Pick<QuizAnswer, "selectedOptionId" | "responseText" | "matchingAnswers">>;
}
