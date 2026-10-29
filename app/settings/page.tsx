'use client';

import React, { useState, useEffect } from 'react';
import {
  UserSettings,
  DEFAULT_USER_SETTINGS,
  getLocalSettings,
  saveLocalSettings,
} from '@/lib/settings';
import {
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Unlock,
  ShieldCheck,
  Scale,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    setSettings(getLocalSettings());
  }, []);

  const handleWeightChange = (key: keyof UserSettings['weights'], val: number) => {
    setSettings((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: val / 100,
      },
    }));
  };

  const handleScheduleChange = (key: keyof UserSettings['schedule'], val: number) => {
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: val,
      },
    }));
  };

  const handleProgressionChange = (key: keyof UserSettings['progression'], val: number) => {
    setSettings((prev) => ({
      ...prev,
      progression: {
        ...prev.progression,
        [key]: val,
      },
    }));
  };

  const handleSave = () => {
    saveLocalSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    if (confirm('Reset all adaptive scoring weights and progression gates to defaults?')) {
      setSettings(DEFAULT_USER_SETTINGS);
      saveLocalSettings(DEFAULT_USER_SETTINGS);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const timePct = Math.round(settings.weights.timeWeight * 100);
  const indepPct = Math.round(settings.weights.independenceWeight * 100);
  const subPct = Math.round(settings.weights.failedSubmissionsWeight * 100);
  const retPct = Math.round(settings.weights.retentionWeight * 100);
  const totalWeight = timePct + indepPct + subPct + retPct;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </a>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              <h1 className="text-base font-bold text-white tracking-tight">
                Adaptive Engine Settings
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors border border-slate-700/60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Settings successfully saved to your profile!</span>
          </div>
        )}

        {/* 1. Heuristic Scoring Weights */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Scale className="h-4 w-4 text-blue-400" />
                <h2 className="text-base font-bold text-white">Heuristic Scoring Weights</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Controls how much each performance signal influences your 0–100 mastery score per attempt.
              </p>
            </div>
            <div className="text-xs font-mono self-start sm:self-auto">
              <span className={`px-2 py-0.5 rounded ${totalWeight === 100 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>
                Total: {totalWeight}% {totalWeight !== 100 && '(Must sum to 100%)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Time Weight */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-300 font-semibold">Active Solving Time</span>
                <span className="text-blue-400 font-bold">{timePct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={timePct}
                onChange={(e) => handleWeightChange('timeWeight', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Rewards completing questions quickly relative to expected benchmark solving times.
              </p>
            </div>

            {/* Independence Weight */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-300 font-semibold">Solution Independence</span>
                <span className="text-blue-400 font-bold">{indepPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={indepPct}
                onChange={(e) => handleWeightChange('independenceWeight', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Penalizes relying on hints or revealing the complete solution code.
              </p>
            </div>

            {/* Failed Submissions Weight */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-300 font-semibold">Submission Accuracy</span>
                <span className="text-blue-400 font-bold">{subPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={subPct}
                onChange={(e) => handleWeightChange('failedSubmissionsWeight', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deducts points for failed runs before reaching an accepted submission.
              </p>
            </div>

            {/* Retention Weight */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-300 font-semibold">Spaced Retention</span>
                <span className="text-blue-400 font-bold">{retPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={retPct}
                onChange={(e) => handleWeightChange('retentionWeight', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Evaluates retention on scheduled reviews. Automatically redistributed during cold-start solves.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Spaced Revision Interval Rules */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <h2 className="text-base font-bold text-white">Spaced Revision Intervals (Days)</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic review scheduling offsets based on how comfortably and independently you solved.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Failed / Revealed Solution</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={settings.schedule.failedOrRevealedDays}
                  onChange={(e) => handleScheduleChange('failedOrRevealedDays', Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
                <span className="text-slate-400 font-mono">days</span>
              </div>
              <p className="text-[11px] text-slate-500">Requires prompt re-attempt to solidify understanding.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Assisted (Used Hints)</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={settings.schedule.assistedDays}
                  onChange={(e) => handleScheduleChange('assistedDays', Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
                <span className="text-slate-400 font-mono">days</span>
              </div>
              <p className="text-[11px] text-slate-500">Short interval to test recall without hint clues.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Independent Difficult</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="2"
                  max="21"
                  value={settings.schedule.independentDifficultDays}
                  onChange={(e) => handleScheduleChange('independentDifficultDays', Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
                <span className="text-slate-400 font-mono">days</span>
              </div>
              <p className="text-[11px] text-slate-500">Solved without hints but slow or with retries.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Independent Comfortable</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={settings.schedule.independentComfortableDays}
                  onChange={(e) => handleScheduleChange('independentComfortableDays', Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
                <span className="text-slate-400 font-mono">days</span>
              </div>
              <p className="text-[11px] text-slate-500">Clean, confident initial solve.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Repeated Confident (Min)</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="7"
                  max="45"
                  value={settings.schedule.repeatedConfidentMinDays}
                  onChange={(e) => handleScheduleChange('repeatedConfidentMinDays', Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
                <span className="text-slate-400 font-mono">days</span>
              </div>
              <p className="text-[11px] text-slate-500">Mastered problems repeated successfully.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Repeated Confident (Max)</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="14"
                  max="90"
                  value={settings.schedule.repeatedConfidentMaxDays}
                  onChange={(e) => handleScheduleChange('repeatedConfidentMaxDays', Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
                <span className="text-slate-400 font-mono">days</span>
              </div>
              <p className="text-[11px] text-slate-500">Upper cap on long-term retention reviews.</p>
            </div>
          </div>
        </section>

        {/* 3. Progression Gates */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-2">
              <Unlock className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Topic Progression Unlock Gates</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Minimum criteria required in a topic before the recommendation engine unlocks the next difficulty tier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Easy to Medium */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 text-sm">Easy → Medium Unlock</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Per-Topic
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Easy Attempts Required:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.progression.easyToMediumAttemptsRequired}
                    onChange={(e) => handleProgressionChange('easyToMediumAttemptsRequired', Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Independent Solves Required:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.progression.easyToMediumIndependentSolvedRequired}
                    onChange={(e) => handleProgressionChange('easyToMediumIndependentSolvedRequired', Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Minimum Topic Mastery:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="30"
                      max="90"
                      value={settings.progression.easyToMediumTopicMasteryThreshold}
                      onChange={(e) => handleProgressionChange('easyToMediumTopicMasteryThreshold', Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right font-mono"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medium to Hard */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 text-sm">Medium → Hard Unlock</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Per-Topic
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Medium Attempts Required:</span>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={settings.progression.mediumToHardAttemptsRequired}
                    onChange={(e) => handleProgressionChange('mediumToHardAttemptsRequired', Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Independent Solves Required:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.progression.mediumToHardIndependentSolvedRequired}
                    onChange={(e) => handleProgressionChange('mediumToHardIndependentSolvedRequired', Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Minimum Topic Mastery:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="40"
                      max="90"
                      value={settings.progression.mediumToHardTopicMasteryThreshold}
                      onChange={(e) => handleProgressionChange('mediumToHardTopicMasteryThreshold', Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-right font-mono"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
