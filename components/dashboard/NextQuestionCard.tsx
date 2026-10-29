'use client';

import React from 'react';
import { NextQuestionRecommendation, QuestionListType } from '@/lib/types';
import {
  Sparkles,
  ExternalLink,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Flame,
} from 'lucide-react';

interface NextQuestionCardProps {
  recommendation: NextQuestionRecommendation | null;
  selectedList: QuestionListType;
  isLoading: boolean;
  onRefresh: () => void;
}

export const NextQuestionCard: React.FC<NextQuestionCardProps> = ({
  recommendation,
  selectedList,
  isLoading,
  onRefresh,
}) => {
  const question = recommendation?.question;

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case 'Easy':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold badge-easy">Easy</span>;
      case 'Medium':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold badge-medium">Medium</span>;
      case 'Hard':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold badge-hard">Hard</span>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'overdue_review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 flex items-center space-x-1">
            <Flame className="h-3 w-3" />
            <span>Overdue Revision</span>
          </span>
        );
      case 'weak_topic':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
            <AlertCircle className="h-3 w-3" />
            <span>Topic Reinforcement</span>
          </span>
        );
      case 'difficulty_advancement':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center space-x-1">
            <Sparkles className="h-3 w-3" />
            <span>Difficulty Unlocked</span>
          </span>
        );
      case 'learning_unseen':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>New Problem</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Review
          </span>
        );
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 shadow-2xl backdrop-blur-xl">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Top Banner: Action & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-400 font-mono">
              Adaptive Selection
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 capitalize">
              {selectedList === 'blind75' ? 'Blind 75' : 'NeetCode 150'} List
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">Recommended Next Question</h2>
        </div>

        {/* Prominent "Give Me a Question" Button */}
        <button
          id="btn-give-me-a-question"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Sparkles className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Selecting...' : 'Give Me a Question'}</span>
        </button>
      </div>

      {/* Card Content */}
      <div className="mt-6">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-7 w-7 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-400 font-mono">Evaluating personal difficulty & review schedules...</p>
          </div>
        ) : question ? (
          <div className="space-y-5">
            {/* Rationale explanation banner */}
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/30 text-blue-200 text-xs sm:text-sm flex items-start space-x-2.5">
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-blue-300">Why this problem: </span>
                <span className="text-slate-200">{recommendation?.reason}</span>
              </div>
            </div>

            {/* Title, Difficulty & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  {getDifficultyBadge(question.officialDifficulty)}
                  {getCategoryBadge(recommendation?.category)}
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight hover:text-blue-400 transition-colors">
                  {question.title}
                </h3>
              </div>

              {/* Action Link */}
              <div className="flex items-center space-x-3">
                <a
                  href={`/problems/${question.slug}`}
                  id="btn-solve-in-workspace"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs sm:text-sm font-medium transition-colors"
                >
                  <span>Solve in Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href={question.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
                  title="Open Official Problem"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Problem Description Excerpt */}
            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/40 font-mono text-xs">
              {question.description}
            </p>

            {/* Metadata Tags: Topic & Expected Time */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5 bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/50">
                <Tag className="h-3 w-3 text-slate-400" />
                <span>{question.topicTags.join(', ')}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/50">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>Expected: {Math.round(question.expectedSolvingTimeSeconds / 60)} min</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-semibold text-white">All Caught Up!</h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {recommendation?.reason || 'No questions currently due for review or eligible in this list.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
