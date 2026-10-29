'use client';

import React from 'react';
import { RevisionQueueItem } from '@/lib/adaptive/analytics';
import { TopicProgressSummary } from '@/lib/types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface RevisionQueueCardProps {
  queue: RevisionQueueItem[];
  weakestTopics: TopicProgressSummary[];
}

export const RevisionQueueCard: React.FC<RevisionQueueCardProps> = ({
  queue,
  weakestTopics,
}) => {
  const overdueCount = queue.filter((item) => item.isOverdue).length;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md shadow-xl space-y-6">
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Spaced Revision Queue
            </h3>
            {queue.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                  overdueCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {overdueCount > 0 ? `${overdueCount} Overdue` : `${queue.length} Scheduled`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Questions scheduled for reinforcement based on your speed, accuracy, and hint usage.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 self-start sm:self-auto flex items-center space-x-1.5">
          <Calendar className="h-3.5 w-3.5 text-blue-400" />
          <span>FSRS-Ready Interval System</span>
        </div>
      </div>

      {/* Weak Topics Callout Banner */}
      {weakestTopics.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/50 flex items-start space-x-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-rose-300">
              Weak Topic Priority Detected
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Your lowest scoring topics are{' '}
              {weakestTopics.map((wt, i) => (
                <span key={wt.topic} className="font-semibold text-rose-300">
                  {wt.topic} ({wt.averageMastery}% mastery)
                  {i < weakestTopics.length - 1 ? ', ' : ''}
                </span>
              ))}
              . The adaptive selector prioritizes unseen questions and reviews in these topics to elevate foundational competence.
            </p>
          </div>
        </div>
      )}

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6">
          <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">All Reviews Completed!</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            You have no pending revisions right now. Continue solving new problems from the recommendation card or catalogue to expand your skills.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {queue.slice(0, 6).map((item) => (
            <div
              key={item.question.canonicalId}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                item.isOverdue
                  ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-700/50'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Question Info */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <a
                    href={`/problems/${item.question.slug}`}
                    className="font-semibold text-slate-200 hover:text-blue-400 transition-colors"
                  >
                    {item.question.title}
                  </a>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      item.question.officialDifficulty === 'Easy'
                        ? 'badge-easy'
                        : item.question.officialDifficulty === 'Medium'
                        ? 'badge-medium'
                        : 'badge-hard'
                    }`}
                  >
                    {item.question.officialDifficulty}
                  </span>
                  <span className="text-slate-500 text-[11px] font-mono">
                    • {item.question.topicTags.join(', ')}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                  <span>Mastery: {item.progress.masteryScore}/100 ({item.progress.status})</span>
                  <span>•</span>
                  <span>Solves: {item.progress.acceptedCount}</span>
                </div>
              </div>

              {/* Status & CTA */}
              <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                <div
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center space-x-1.5 ${
                    item.isOverdue
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  <span>{item.dueDescription}</span>
                </div>

                <a
                  href={`/problems/${item.question.slug}`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all"
                >
                  <Code2 className="h-3 w-3" />
                  <span>Solve</span>
                </a>
              </div>
            </div>
          ))}

          {queue.length > 6 && (
            <p className="text-center text-[11px] font-mono text-slate-500 pt-1">
              + {queue.length - 6} more questions scheduled for spaced review
            </p>
          )}
        </div>
      )}
    </div>
  );
};
