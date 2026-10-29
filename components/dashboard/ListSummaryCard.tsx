'use client';

import React from 'react';
import { QuestionListType, TopicProgressSummary } from '@/lib/types';
import { CheckCircle, Clock, BookOpen, Lock, Unlock } from 'lucide-react';

interface ListSummaryCardProps {
  selectedList: QuestionListType;
  stats: {
    totalQuestions: number;
    solvedCount: number;
    attemptedCount: number;
    dueReviewCount: number;
  };
  topics: TopicProgressSummary[];
}

export const ListSummaryCard: React.FC<ListSummaryCardProps> = ({
  selectedList,
  stats,
  topics,
}) => {
  const percentSolved =
    stats.totalQuestions > 0
      ? Math.round((stats.solvedCount / stats.totalQuestions) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stat 1: Solved Progress */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
          <span>COMPLETION</span>
          <BookOpen className="h-4 w-4 text-blue-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-white">{stats.solvedCount}</span>
          <span className="text-sm text-slate-500">/ {stats.totalQuestions}</span>
        </div>
        <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${percentSolved}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {percentSolved}% of {selectedList === 'blind75' ? 'Blind 75' : 'NeetCode 150'} solved
        </p>
      </div>

      {/* Stat 2: Due Reviews */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
          <span>REVISION QUEUE</span>
          <Clock className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-extrabold ${stats.dueReviewCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {stats.dueReviewCount}
          </span>
          <span className="text-sm text-slate-500">due now</span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {stats.dueReviewCount > 0
            ? 'Spaced revision reinforces long-term algorithmic recall.'
            : 'No questions currently due for review. Keep practicing!'}
        </p>
      </div>

      {/* Stat 3: Progression Unlocks */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
          <span>DIFFICULTY UNLOCKS</span>
          <Unlock className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="space-y-2 mt-2">
          {topics.length > 0 ? (
            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
              {topics.slice(0, 3).map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate max-w-[130px]">{topic.topic}</span>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        topic.unlockedMedium
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      Med
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        topic.unlockedHard
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      Hard
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic mt-3">Start with Easy to unlock Medium per topic.</p>
          )}
        </div>
      </div>
    </div>
  );
};
