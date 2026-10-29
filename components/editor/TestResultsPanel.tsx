'use client';

import React, { useState } from 'react';
import { ExecutionOutcome } from '@/lib/test-harness';
import { IAttempt } from '@/lib/types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  RefreshCw,
  Layers,
  History,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface TestResultsPanelProps {
  outcome: ExecutionOutcome | null;
  isRunning: boolean;
  activeMode: 'run' | 'submit' | null;
  attempts?: IAttempt[];
  onRestoreCode?: (code: string) => void;
  adaptiveFeedback?: {
    score?: {
      attemptScore: number;
      newMasteryScore: number;
      status: string;
      explanation: string;
      signals: {
        timeScore: number;
        independenceScore: number;
        submissionScore: number;
      };
    };
    review?: {
      nextReviewAt: string | Date;
      intervalDays: number;
      reason: string;
    };
  } | null;
}

export const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
  outcome,
  isRunning,
  activeMode,
  attempts = [],
  onRestoreCode,
  adaptiveFeedback,
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'console' | 'history'>('tests');
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number>(0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4" />
            <span>Accepted</span>
          </div>
        );
      case 'Wrong Answer':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="h-4 w-4" />
            <span>Wrong Answer</span>
          </div>
        );
      case 'Time Limit Exceeded':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <Clock className="h-4 w-4" />
            <span>Time Limit Exceeded</span>
          </div>
        );
      case 'Compilation Error':
      case 'Runtime Error':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4" />
            <span>{status}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            <span>{status}</span>
          </div>
        );
    }
  };

  const getErrorTypeBadge = (errorType?: string) => {
    if (errorType === 'implementation_mistake') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
          Implementation Mistake
        </span>
      );
    }
    if (errorType === 'algorithmic_misunderstanding') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Algorithmic Misunderstanding
        </span>
      );
    }
    return null;
  };

  const selectedResult =
    outcome && outcome.results.length > 0
      ? outcome.results[selectedTestCaseIndex] || outcome.results[0]
      : null;

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Top Bar: Tabs & Overall Status */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'tests'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Test Results</span>
            {outcome && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300">
                {outcome.passedTests}/{outcome.totalTests}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'console'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Console Output</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Submissions ({attempts.length})</span>
          </button>
        </div>

        {/* Status Badge & Provider */}
        <div className="flex items-center space-x-3">
          {isRunning ? (
            <div className="flex items-center space-x-2 text-xs text-blue-400 font-mono">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>{activeMode === 'submit' ? 'Evaluating submission...' : 'Running sample tests...'}</span>
            </div>
          ) : outcome ? (
            <div className="flex items-center space-x-2">
              {getStatusBadge(outcome.status)}
              {outcome.executionTimeMs !== undefined && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {outcome.executionTimeMs} ms
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
        {isRunning ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-400">
              {activeMode === 'submit'
                ? 'Running sandbox evaluation against comprehensive test cases...'
                : 'Executing sample test cases...'}
            </p>
          </div>
        ) : activeTab === 'history' ? (
          /* Submission History Tab */
          <div className="space-y-3 font-sans">
            {attempts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <History className="h-7 w-7 mx-auto mb-2 opacity-40" />
                <p>No submissions recorded for this session yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click &ldquo;Submit&rdquo; when your solution is ready to evaluate.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attempts.map((att, idx) => (
                  <div
                    key={att._id || att.id || idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(att.result)}
                        {getErrorTypeBadge(att.errorType)}
                        {att.isIndependent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Independent</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
                            <ShieldAlert className="h-3 w-3" />
                            <span>Assisted / Revealed</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono pt-1">
                        <span>Tests: {att.testsPassed}/{att.testsTotal}</span>
                        <span>•</span>
                        <span>Active Time: {Math.floor(att.activeTimeSeconds / 60)}m {att.activeTimeSeconds % 60}s</span>
                        <span>•</span>
                        <span>Runs: {att.runCount}</span>
                        {att.hintsUsed > 0 && <span>• Hints: {att.hintsUsed}</span>}
                      </div>
                    </div>

                    {att.codeSnapshot && onRestoreCode && (
                      <button
                        type="button"
                        onClick={() => onRestoreCode(att.codeSnapshot!)}
                        className="self-start sm:self-auto inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restore Code</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !outcome ? (
          <div className="py-16 text-center text-slate-500">
            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Run your code or submit a solution to see execution results.</p>
          </div>
        ) : activeTab === 'console' ? (
          <div className="space-y-3">
            {outcome.compileOutput && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 whitespace-pre-wrap">
                <div className="font-semibold text-rose-400 mb-1">Compilation / Error Output:</div>
                {outcome.compileOutput}
              </div>
            )}
            {outcome.runtimeOutput ? (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap">
                {outcome.runtimeOutput}
              </div>
            ) : !outcome.compileOutput ? (
              <p className="text-slate-500 italic">No standard output logged.</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Adaptive Mastery & Spaced Revision Banner */}
            {adaptiveFeedback && adaptiveFeedback.score && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-blue-500/30 text-xs font-sans space-y-2 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold text-blue-400 font-mono tracking-wider">
                      ADAPTIVE MASTERY
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Score: {adaptiveFeedback.score.attemptScore}/100
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Mastery: {adaptiveFeedback.score.newMasteryScore}/100 ({adaptiveFeedback.score.status})
                    </span>
                  </div>
                  {adaptiveFeedback.review && (
                    <div className="flex items-center space-x-1.5 text-amber-400 font-mono text-[11px]">
                      <Clock className="h-3 w-3" />
                      <span>Review in {adaptiveFeedback.review.intervalDays} day{adaptiveFeedback.review.intervalDays === 1 ? '' : 's'}</span>
                    </div>
                  )}
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  {adaptiveFeedback.score.explanation}
                </p>

                {/* Heuristic Signals Breakdown */}
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-slate-400">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    Time: {adaptiveFeedback.score.signals.timeScore}%
                  </span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    Independence: {adaptiveFeedback.score.signals.independenceScore}%
                  </span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                    Accuracy: {adaptiveFeedback.score.signals.submissionScore}%
                  </span>
                </div>
              </div>
            )}

            {/* Test Case Selector Tabs */}
            {outcome.results.length > 0 && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800/60">
                {outcome.results.map((res, idx) => (
                  <button
                    key={res.id || idx}
                    type="button"
                    onClick={() => setSelectedTestCaseIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      selectedTestCaseIndex === idx
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {res.passed ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-rose-400" />
                    )}
                    <span>
                      {res.isSample ? `Case ${idx + 1}` : `Eval ${idx + 1}`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Test Case Details */}
            {selectedResult ? (
              <div className="space-y-3">
                {selectedResult.isSample ? (
                  <>
                    {/* Input */}
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                        Input
                      </span>
                      <div className="mt-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono">
                        {selectedResult.rawInputStr || JSON.stringify(selectedResult.input)}
                      </div>
                    </div>

                    {/* Output vs Expected */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                          Your Output
                        </span>
                        <div
                          className={`mt-1 p-2.5 rounded-lg border font-mono ${
                            selectedResult.passed
                              ? 'bg-slate-950 border-slate-800 text-emerald-400'
                              : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                          }`}
                        >
                          {selectedResult.errorMessage ? (
                            <span className="text-rose-400">{selectedResult.errorMessage}</span>
                          ) : (
                            JSON.stringify(selectedResult.actual)
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                          Expected Output
                        </span>
                        <div className="mt-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                          {JSON.stringify(selectedResult.expected)}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Hidden Evaluation Test Case */
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">Evaluation Test Case #{selectedTestCaseIndex + 1}</span>
                      {selectedResult.passed ? (
                        <span className="text-xs text-emerald-400 font-semibold">• Passed</span>
                      ) : (
                        <span className="text-xs text-rose-400 font-semibold">• Failed</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      This is an authorized evaluation test case. Expected outputs are kept server-side to guarantee integrity.
                    </p>
                    {selectedResult.errorMessage && (
                      <div className="p-2.5 rounded bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs mt-2">
                        {selectedResult.errorMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : outcome.compileOutput ? (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300">
                {outcome.compileOutput}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
