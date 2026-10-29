export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type QuestionListType = 'blind75' | 'neetcode150';

export type ProgressStatus = 'New' | 'Learning' | 'Needs Practice' | 'Familiar' | 'Mastered';

export type SubmissionResult =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Compilation Error'
  | 'Pending';

export type LearningStage = 'Easy' | 'Mixed Easy/Medium' | 'Advanced';

export interface AuthorizedExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface SampleTestCase {
  id: string;
  input: unknown[];
  expected: unknown;
  rawInputStr?: string;
}

export interface IQuestion {
  canonicalId: string;
  slug: string;
  title: string;
  officialDifficulty: Difficulty;
  topicTags: string[];
  blind75: boolean;
  neetcode150: boolean;
  officialUrl: string;
  starterCode: string;
  description: string;
  authorizedExamples: AuthorizedExample[];
  sampleTestCases: SampleTestCase[];
  expectedSolvingTimeSeconds: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQuestionProgress {
  questionId: string;
  selectedList: QuestionListType;
  attemptCount: number;
  acceptedCount: number;
  masteryScore: number; // 0 - 100
  recallEstimate: number; // 0.0 - 1.0
  status: ProgressStatus;
  firstSolvedAt: Date | null;
  lastAttemptAt: Date | null;
  nextReviewAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AttemptErrorType = 'none' | 'implementation_mistake' | 'algorithmic_misunderstanding';

export interface IAttempt {
  _id?: string;
  id?: string;
  questionId: string;
  selectedList: QuestionListType;
  startedAt: Date;
  completedAt: Date;
  activeTimeSeconds: number;
  runCount: number;
  failedSubmissionCount: number;
  hintsUsed: number;
  solutionRevealed: boolean;
  result: SubmissionResult;
  testsPassed: number;
  testsTotal: number;
  codeSnapshot?: string;
  errorType: AttemptErrorType;
  isIndependent: boolean;
  createdAt?: Date;
}

export interface NextQuestionRecommendation {
  question: IQuestion | null;
  reason: string;
  priorityScore: number;
  category:
    | 'overdue_review'
    | 'weak_topic'
    | 'learning_unseen'
    | 'difficulty_advancement'
    | 'standard_review'
    | 'none';
}

export interface TopicProgressSummary {
  topic: string;
  totalQuestions: number;
  solvedQuestions: number;
  averageMastery: number;
  unlockedMedium: boolean;
  unlockedHard: boolean;
  isWeak: boolean;
}
