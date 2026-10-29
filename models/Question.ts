import mongoose, { Schema, Model } from 'mongoose';
import { IQuestion } from '@/lib/types';

const AuthorizedExampleSchema = new Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String },
  },
  { _id: false }
);

const SampleTestCaseSchema = new Schema(
  {
    id: { type: String, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    expected: { type: Schema.Types.Mixed, required: true },
    rawInputStr: { type: String },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    canonicalId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    officialDifficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      index: true,
    },
    topicTags: [{ type: String, required: true, index: true }],
    blind75: { type: Boolean, default: false, index: true },
    neetcode150: { type: Boolean, default: false, index: true },
    officialUrl: { type: String, required: true },
    starterCode: { type: String, required: true },
    description: { type: String, required: true },
    authorizedExamples: [AuthorizedExampleSchema],
    sampleTestCases: [SampleTestCaseSchema],
    expectedSolvingTimeSeconds: { type: Number, required: true, default: 900 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
