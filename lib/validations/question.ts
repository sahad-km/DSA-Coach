import { z } from 'zod';

export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard']);
export const QuestionListTypeSchema = z.enum(['blind75', 'neetcode150']);

export const AuthorizedExampleSchema = z.object({
  input: z.string().min(1),
  output: z.string().min(1),
  explanation: z.string().optional(),
});

export const SampleTestCaseSchema = z.object({
  id: z.string().min(1),
  input: z.array(z.any()),
  expected: z.any(),
  rawInputStr: z.string().optional(),
});

export const QuestionSchema = z.object({
  canonicalId: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Must be lowercase kebab-case'),
  slug: z.string().min(1),
  title: z.string().min(1),
  officialDifficulty: DifficultySchema,
  topicTags: z.array(z.string().min(1)).min(1, 'At least one topic tag is required'),
  blind75: z.boolean(),
  neetcode150: z.boolean(),
  officialUrl: z.string().url('Must be a valid URL'),
  starterCode: z.string().min(1),
  description: z.string().min(1),
  authorizedExamples: z.array(AuthorizedExampleSchema),
  sampleTestCases: z.array(SampleTestCaseSchema),
  expectedSolvingTimeSeconds: z.number().int().positive(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => data.blind75 || data.neetcode150,
  { message: 'Question must belong to at least one list (blind75 or neetcode150)' }
);

export const QuestionSeedSchema = z.array(QuestionSchema).min(1, 'Seed catalogue cannot be empty');

export const NextQuestionQuerySchema = z.object({
  list: QuestionListTypeSchema.default('blind75'),
});

export type ValidatedQuestion = z.infer<typeof QuestionSchema>;
