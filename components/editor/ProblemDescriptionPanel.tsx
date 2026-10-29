'use client';

import React, { useState } from 'react';
import { IQuestion } from '@/lib/types';
import {
  ExternalLink,
  Lightbulb,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Tag,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ProblemDescriptionPanelProps {
  question: IQuestion;
  hintsUsed: number;
  onUseHint: () => void;
  solutionRevealed: boolean;
  onRevealSolution: () => void;
}

export const ProblemDescriptionPanel: React.FC<ProblemDescriptionPanelProps> = ({
  question,
  hintsUsed,
  onUseHint,
  solutionRevealed,
  onRevealSolution,
}) => {
  const [showConfirmReveal, setShowConfirmReveal] = useState(false);
  const [hintsExpanded, setHintsExpanded] = useState(false);

  // Default hints derived or generated for the problem
  const defaultHints = [
    `Consider using a hash map to look up previous elements in O(1) time rather than a brute-force O(n²) nested loop.`,
    `Think about what complement value you need at each iteration, and check if it has already been encountered.`,
  ];

  const getDifficultyBadge = (difficulty: string) => {
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

  return (
    <div className="flex flex-col h-full bg-slate-900/80 rounded-xl border border-slate-800 p-6 overflow-y-auto space-y-6">
      {/* Title & Metadata Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          {getDifficultyBadge(question.officialDifficulty)}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Target: {Math.round(question.expectedSolvingTimeSeconds / 60)} min</span>
          </div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-white">{question.title}</h1>
          <a
            href={question.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Open Original Problem"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Topic Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {question.topicTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800/60 text-slate-300 border border-slate-700/60 flex items-center space-x-1"
            >
              <Tag className="h-3 w-3 text-slate-400" />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Problem Description */}
      <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
        <div className="whitespace-pre-wrap">{question.description}</div>

        {/* Authorized Examples */}
        {question.authorizedExamples && question.authorizedExamples.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 font-mono">
              Examples
            </h3>
            {question.authorizedExamples.map((ex, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3.5 font-mono text-xs space-y-1.5"
              >
                <div className="text-slate-400 font-semibold">Example {idx + 1}:</div>
                <div>
                  <span className="text-slate-500">Input: </span>
                  <span className="text-slate-200">{ex.input}</span>
                </div>
                <div>
                  <span className="text-slate-500">Output: </span>
                  <span className="text-emerald-400">{ex.output}</span>
                </div>
                {ex.explanation && (
                  <div className="text-slate-400 text-[11px] font-sans italic pt-1">
                    Explanation: {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hints & Solution Reveal Section */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        {/* Hint Control */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              if (!hintsExpanded && hintsUsed === 0) onUseHint();
              setHintsExpanded(!hintsExpanded);
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span>Algorithmic Hints {hintsUsed > 0 && `(Used: ${hintsUsed})`}</span>
            </div>
            {hintsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {hintsExpanded && (
            <div className="px-4 pb-3 space-y-2 text-xs text-slate-300 border-t border-slate-800/60 pt-2">
              {defaultHints.map((hint, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-amber-400 font-semibold mr-1.5">Hint {idx + 1}:</span>
                  {hint}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Solution Reveal Control */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-semibold text-slate-300">Official Solution</span>
            </div>
            {!solutionRevealed ? (
              <button
                type="button"
                onClick={() => setShowConfirmReveal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
              >
                Reveal Solution
              </button>
            ) : (
              <span className="text-xs text-rose-400 font-mono">Revealed</span>
            )}
          </div>

          {/* Confirm Reveal Modal / Alert */}
          {showConfirmReveal && !solutionRevealed && (
            <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 space-y-2.5 text-xs text-rose-200">
              <div className="flex items-center space-x-2 font-semibold text-rose-300">
                <AlertTriangle className="h-4 w-4" />
                <span>Confirm Solution Reveal</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Revealing the solution records that this question was not solved independently. It will be scheduled for revision in 1 day to reinforce understanding.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onRevealSolution();
                    setShowConfirmReveal(false);
                  }}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium"
                >
                  Yes, Reveal Solution
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmReveal(false)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {solutionRevealed && (
            <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-amber-400 font-sans">Optimal Approach:</div>
              <p className="font-sans text-xs text-slate-400">
                Hash Map lookup: Iterate through elements while keeping a map of seen numbers to their indices. For each element, look up `target - element`. Time complexity is O(n), Space complexity is O(n).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
