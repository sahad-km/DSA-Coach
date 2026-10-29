import { z } from 'zod';
import { QuestionListTypeSchema } from './question';

export const ProgressStatusSchema = z.enum([
  'New',
  'Learning',
  'Needs Practice',
  'Familiar',
  'Mastered',
]);

export const QuestionProgressSchema = z.object({
  questionId: z.string().min(1),
  selectedList: QuestionListTypeSchema,
  attemptCount: z.number().int().min(0).default(0),
  acceptedCount: z.number().int().min(0).default(0),
  masteryScore: z.number().min(0).max(100).default(0),
  recallEstimate: z.number().min(0).max(1).default(1),
  status: ProgressStatusSchema.default('New'),
  firstSolvedAt: z.date().nullable().default(null),
  lastAttemptAt: z.date().nullable().default(null),
  nextReviewAt: z.date().nullable().default(null),
});

export type ValidatedQuestionProgress = z.infer<typeof QuestionProgressSchema>;
