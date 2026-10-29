'use client';

import React, { useState } from 'react';
import { TopicProgressSummary } from '@/lib/types';
import {
  Layers,
  Unlock,
  Lock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

interface TopicMasteryCardProps {
  topics: TopicProgressSummary[];
  selectedList: string;
}

export const TopicMasteryCard: React.FC<TopicMasteryCardProps> = ({
  topics,
  selectedList,
}) => {
  const [filter, setFilter] = useState<'all' | 'weak' | 'active'>('all');

  const filteredTopics = topics.filter((t) => {
    if (filter === 'weak') return t.isWeak;
    if (filter === 'active') return t.solvedQuestions > 0 || t.averageMastery > 0;
    return true;
  });

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md shadow-xl">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Topic Mastery & Difficulty Gates
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {topics.length} Topics
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mastery is estimated using deterministic signals with outlier-trimmed averages.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({topics.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'active'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({topics.filter((t) => t.solvedQuestions > 0 || t.averageMastery > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('weak')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 ${
              filter === 'weak'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800 font-semibold'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Weak ({topics.filter((t) => t.isWeak).length})</span>
          </button>
        </div>
      </div>

      {/* Grid of Topics */}
      {filteredTopics.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-mono text-xs">
          {filter === 'weak'
            ? 'No weak topics identified! All active topics are healthy (≥ 60% mastery).'
            : 'No topics match the selected filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map((t) => {
            const hasStarted = t.solvedQuestions > 0 || t.averageMastery > 0;
            const percentSolved =
              t.totalQuestions > 0
                ? Math.round((t.solvedQuestions / t.totalQuestions) * 100)
                : 0;

            return (
              <div
                key={t.topic}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  t.isWeak
                    ? 'bg-rose-950/15 border-rose-900/40 hover:border-rose-700/60'
                    : t.averageMastery >= 75
                    ? 'bg-emerald-950/15 border-emerald-900/40 hover:border-emerald-700/60'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Topic Title & Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-200 leading-snug">
                      {t.topic}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      {t.solvedQuestions}/{t.totalQuestions} solved ({percentSolved}%)
                    </span>
                  </div>

                  {t.isWeak ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1 shrink-0">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      <span>Weak</span>
                    </span>
                  ) : t.averageMastery >= 75 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>Strong</span>
                    </span>
                  ) : hasStarted ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                      Learning
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-500 shrink-0">
                      Unseen
                    </span>
                  )}
                </div>

                {/* Mastery Progress Bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Mastery</span>
                    <span
                      className={`font-bold ${
                        t.isWeak
                          ? 'text-rose-400'
                          : t.averageMastery >= 75
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {t.averageMastery}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        t.isWeak
                          ? 'bg-rose-500'
                          : t.averageMastery >= 75
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(4, t.averageMastery)}%` }}
                    />
                  </div>
                </div>

                {/* Difficulty Unlock Gates */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Unlocks:</span>
                  <div className="flex items-center space-x-1.5">
                    {/* Easy */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <Unlock className="h-2.5 w-2.5" />
                      <span>Easy</span>
                    </span>

                    {/* Medium */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                        t.unlockedMedium
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800/80 text-slate-600 border border-slate-800'
                      }`}
                      title={
                        t.unlockedMedium
                          ? 'Medium difficulty unlocked for this topic'
                          : 'Solve 2+ Easy independently with 60%+ mastery to unlock Medium'
                      }
                    >
                      {t.unlockedMedium ? (
                        <Unlock className="h-2.5 w-2.5" />
                      ) : (
                        <Lock className="h-2.5 w-2.5" />
                      )}
                      <span>Med</span>
                    </span>

                    {/* Hard */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                        t.unlockedHard
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800/80 text-slate-600 border border-slate-800'
                      }`}
                      title={
                        t.unlockedHard
                          ? 'Hard difficulty unlocked for this topic'
                          : 'Solve 3+ Medium independently with 65%+ mastery to unlock Hard'
                      }
                    >
                      {t.unlockedHard ? (
                        <Unlock className="h-2.5 w-2.5" />
                      ) : (
                        <Lock className="h-2.5 w-2.5" />
                      )}
                      <span>Hard</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
