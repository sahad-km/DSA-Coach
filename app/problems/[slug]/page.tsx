'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IQuestion, QuestionListType, IAttempt } from '@/lib/types';
import { ExecutionOutcome } from '@/lib/test-harness';
import { ProblemDescriptionPanel } from '@/components/editor/ProblemDescriptionPanel';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { TestResultsPanel } from '@/components/editor/TestResultsPanel';
import { WorkspaceTimer } from '@/components/editor/WorkspaceTimer';
import {
  Play,
  Send,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Code2,
} from 'lucide-react';

export default function ProblemWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedList = (searchParams.get('list') || 'blind75') as QuestionListType;

  const [question, setQuestion] = useState<IQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [code, setCode] = useState<string>('');

  // Attempt learning signals
  const [sessionStartedAt] = useState<Date>(new Date());
  const [activeSeconds, setActiveSeconds] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [solutionRevealed, setSolutionRevealed] = useState<boolean>(false);
  const [runCount, setRunCount] = useState<number>(0);
  const [failedSubmissionCount, setFailedSubmissionCount] = useState<number>(0);
  const [attempts, setAttempts] = useState<IAttempt[]>([]);
  const [adaptiveFeedback, setAdaptiveFeedback] = useState<{
    score?: any;
    review?: any;
  } | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeExecutionMode, setActiveExecutionMode] = useState<'run' | 'submit' | null>(null);
  const [outcome, setOutcome] = useState<ExecutionOutcome | null>(null);

  // Fetch problem details and attempt history
  useEffect(() => {
    async function loadProblemAndAttempts() {
      setIsLoadingQuestion(true);
      try {
        const res = await fetch(`/api/problems/${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setQuestion(json.data);
            setCode(json.data.starterCode);
            setIsLoadingQuestion(false); // Render UI immediately!

            // Fetch previous attempts in background
            fetch(
              `/api/attempts?questionId=${json.data.canonicalId}&list=${selectedList}`
            )
              .then((r) => r.json())
              .then((attJson) => {
                if (attJson.success && Array.isArray(attJson.data)) {
                  setAttempts(attJson.data);
                }
              })
              .catch((attErr) => {
                console.warn('Failed to fetch previous attempts:', attErr);
              });
          }
        }
      } catch (err) {
        console.error('Failed to load problem:', err);
        setIsLoadingQuestion(false);
      }
    }
    loadProblemAndAttempts();
  }, [slug, selectedList]);

  // Handle "Run Code" (visible sample tests only)
  const handleRunCode = async () => {
    if (!code || isExecuting) return;
    setIsExecuting(true);
    setActiveExecutionMode('run');
    setRunCount((prev) => prev + 1);

    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, code }),
      });

      const json = await res.json();
      if (json.outcome) {
        setOutcome(json.outcome);
      }
    } catch (err) {
      console.error('Error running code:', err);
    } finally {
      setIsExecuting(false);
      setActiveExecutionMode(null);
    }
  };

  // Handle "Submit Solution" (complete test suite evaluation + attempt tracking)
  const handleSubmitSolution = async () => {
    if (!code || isExecuting) return;
    setIsExecuting(true);
    setActiveExecutionMode('submit');

    try {
      const res = await fetch('/api/code/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          code,
          selectedList,
          startedAt: sessionStartedAt.toISOString(),
          activeTimeSeconds: activeSeconds,
          runCount,
          failedSubmissionCount,
          hintsUsed,
          solutionRevealed,
        }),
      });

      const json = await res.json();
      if (json.outcome) {
        setOutcome(json.outcome);
        if (json.outcome.status !== 'Accepted') {
          setFailedSubmissionCount((prev) => prev + 1);
        }
        if (json.attempt) {
          setAttempts((prev) => [json.attempt, ...prev]);
        }
        if (json.score) {
          setAdaptiveFeedback({
            score: json.score,
            review: json.review,
          });
        }
      }
    } catch (err) {
      console.error('Error submitting code:', err);
    } finally {
      setIsExecuting(false);
      setActiveExecutionMode(null);
    }
  };

  if (isLoadingQuestion) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-slate-400">
        <RefreshCw className="h-7 w-7 text-blue-400 animate-spin" />
        <p>Loading problem workspace...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Problem Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested problem &ldquo;{slug}&rdquo; could not be found in the catalogue.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Workspace Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-white">{question.title}</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {selectedList === 'blind75' ? 'Blind 75' : 'NeetCode 150'}
            </span>
          </div>
        </div>

        {/* Action Controls: Timer + Run + Submit */}
        <div className="flex items-center space-x-3">
          <WorkspaceTimer onTimeUpdate={(secs) => setActiveSeconds(secs)} />

          <button
            id="btn-run-code"
            onClick={handleRunCode}
            disabled={isExecuting}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 text-slate-300 ${isExecuting && activeExecutionMode === 'run' ? 'animate-spin' : ''}`} />
            <span>Run</span>
          </button>

          <button
            id="btn-submit-solution"
            onClick={handleSubmitSolution}
            disabled={isExecuting}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className={`h-3.5 w-3.5 ${isExecuting && activeExecutionMode === 'submit' ? 'animate-spin' : ''}`} />
            <span>Submit</span>
          </button>
        </div>
      </header>

      {/* Main Two-Panel Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Left Panel: Description, Examples, Hints */}
        <div className="h-full overflow-hidden">
          <ProblemDescriptionPanel
            question={question}
            hintsUsed={hintsUsed}
            onUseHint={() => setHintsUsed((prev) => prev + 1)}
            solutionRevealed={solutionRevealed}
            onRevealSolution={() => setSolutionRevealed(true)}
          />
        </div>

        {/* Right Panel: Editor (top) + Results (bottom) */}
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
          {/* Monaco Editor */}
          <div className="flex-1 min-h-[45%] overflow-hidden">
            <CodeEditor
              slug={question.slug}
              starterCode={question.starterCode}
              code={code}
              onChange={(val) => setCode(val)}
            />
          </div>

          {/* Test Results & Console */}
          <div className="h-[45%] overflow-hidden">
            <TestResultsPanel
              outcome={outcome}
              isRunning={isExecuting}
              activeMode={activeExecutionMode}
              attempts={attempts}
              onRestoreCode={(restored) => setCode(restored)}
              adaptiveFeedback={adaptiveFeedback}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
