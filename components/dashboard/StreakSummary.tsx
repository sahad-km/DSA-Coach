'use client';

import React from 'react';
import { StreakStats, DifficultyBreakdown } from '@/lib/adaptive/analytics';
import { Flame, Target, Trophy, Clock, CheckCircle2, Zap } from 'lucide-react';

interface StreakSummaryProps {
  streak: StreakStats;
  difficultyBreakdown: DifficultyBreakdown;
}

export const StreakSummary: React.FC<StreakSummaryProps> = ({
  streak,
  difficultyBreakdown,
}) => {
  // Generate last 7 days representation
  const now = new Date();
  const last7Days: Array<{ dateStr: string; dayName: string; isActive: boolean }> = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayName = dayNames[d.getDay()];
    const isActive = streak.activeDaysLast30.includes(dateStr);

    last7Days.push({ dateStr, dayName, isActive });
  }

  const minutesToday = Math.round(streak.activeSecondsToday / 60);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Daily Streak Tracker */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>DAILY STREAK</span>
            <Flame className={`h-4 w-4 ${streak.currentStreak > 0 ? 'text-amber-500 fill-amber-500/20 animate-pulse' : 'text-slate-600'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {streak.currentStreak}
            </span>
            <span className="text-sm text-slate-400">
              day{streak.currentStreak === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {streak.currentStreak > 0
              ? `Best streak: ${streak.bestStreak} day${streak.bestStreak === 1 ? '' : 's'} in a row`
              : `Solve a problem today to kick off a new streak!`}
          </p>
        </div>

        {/* 7-day mini momentum track */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          {last7Days.map((d) => (
            <div key={d.dateStr} className="flex flex-col items-center space-y-1">
              <div
                className={`h-3 w-3 rounded-full transition-colors ${
                  d.isActive
                    ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                    : 'bg-slate-800'
                }`}
                title={`${d.dateStr}: ${d.isActive ? 'Active' : 'No activity'}`}
              />
              <span className="text-[9px] font-mono text-slate-500">{d.dayName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Today's Effort */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>TODAY&apos;S PROGRESS</span>
            <Target className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {streak.solvedToday}
            </span>
            <span className="text-sm text-slate-400">solved today</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {streak.attemptedToday} attempt{streak.attemptedToday === 1 ? '' : 's'} recorded • {minutesToday}m active focus
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{minutesToday}m solving</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Active timer</span>
          </div>
        </div>
      </div>

      {/* 3. Difficulty Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>DIFFICULTY BREAKDOWN</span>
            <Trophy className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="space-y-2 mt-2">
            {/* Easy */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="badge-easy px-1.5 py-0.2 rounded font-semibold text-[10px]">Easy</span>
              <span className="text-slate-300">
                {difficultyBreakdown.easy.solved} / {difficultyBreakdown.easy.total}
              </span>
            </div>
            {/* Medium */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="badge-medium px-1.5 py-0.2 rounded font-semibold text-[10px]">Medium</span>
              <span className="text-slate-300">
                {difficultyBreakdown.medium.solved} / {difficultyBreakdown.medium.total}
              </span>
            </div>
            {/* Hard */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="badge-hard px-1.5 py-0.2 rounded font-semibold text-[10px]">Hard</span>
              <span className="text-slate-300">
                {difficultyBreakdown.hard.solved} / {difficultyBreakdown.hard.total}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono text-right">
          Total: {difficultyBreakdown.easy.solved + difficultyBreakdown.medium.solved + difficultyBreakdown.hard.solved} solved
        </div>
      </div>
    </div>
  );
};
