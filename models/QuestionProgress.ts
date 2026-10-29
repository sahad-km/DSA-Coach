import mongoose, { Schema, Model } from 'mongoose';
import { IQuestionProgress } from '@/lib/types';

const QuestionProgressSchema = new Schema<IQuestionProgress>(
  {
    questionId: { type: String, required: true, index: true },
    selectedList: {
      type: String,
      enum: ['blind75', 'neetcode150'],
      required: true,
      index: true,
    },
    attemptCount: { type: Number, default: 0 },
    acceptedCount: { type: Number, default: 0 },
    masteryScore: { type: Number, default: 0, min: 0, max: 100 },
    recallEstimate: { type: Number, default: 1.0, min: 0, max: 1.0 },
    status: {
      type: String,
      enum: ['New', 'Learning', 'Needs Practice', 'Familiar', 'Mastered'],
      default: 'New',
      index: true,
    },
    firstSolvedAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    nextReviewAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

// Enforce unique progress per question and selected list
QuestionProgressSchema.index({ questionId: 1, selectedList: 1 }, { unique: true });

export const QuestionProgress: Model<IQuestionProgress> =
  mongoose.models.QuestionProgress ||
  mongoose.model<IQuestionProgress>('QuestionProgress', QuestionProgressSchema);
