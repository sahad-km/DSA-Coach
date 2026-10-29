import mongoose, { Schema, Model } from 'mongoose';
import { IAttempt } from '@/lib/types';

const AttemptSchema = new Schema<IAttempt>(
  {
    questionId: { type: String, required: true, index: true },
    selectedList: {
      type: String,
      enum: ['blind75', 'neetcode150'],
      required: true,
      index: true,
    },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    activeTimeSeconds: { type: Number, required: true, default: 0 },
    runCount: { type: Number, default: 0 },
    failedSubmissionCount: { type: Number, default: 0 },
    hintsUsed: { type: Number, default: 0 },
    solutionRevealed: { type: Boolean, default: false },
    result: {
      type: String,
      enum: [
        'Accepted',
        'Wrong Answer',
        'Runtime Error',
        'Time Limit Exceeded',
        'Compilation Error',
        'Pending',
      ],
      required: true,
      index: true,
    },
    testsPassed: { type: Number, default: 0 },
    testsTotal: { type: Number, default: 0 },
    codeSnapshot: { type: String },
    errorType: {
      type: String,
      enum: ['none', 'implementation_mistake', 'algorithmic_misunderstanding'],
      default: 'none',
      index: true,
    },
    isIndependent: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Attempt: Model<IAttempt> =
  mongoose.models.Attempt || mongoose.model<IAttempt>('Attempt', AttemptSchema);
