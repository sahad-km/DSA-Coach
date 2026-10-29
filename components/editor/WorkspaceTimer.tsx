'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock } from 'lucide-react';

interface WorkspaceTimerProps {
  onTimeUpdate?: (activeSeconds: number) => void;
  initialSeconds?: number;
}

export const WorkspaceTimer: React.FC<WorkspaceTimerProps> = ({
  onTimeUpdate,
  initialSeconds = 0,
}) => {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (onTimeUpdate) onTimeUpdate(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUpdate]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
      <Clock className={`h-3.5 w-3.5 ${isPaused ? 'text-amber-400' : 'text-blue-400 animate-pulse'}`} />
      <span className="text-white font-semibold tracking-wider">{formatTime(seconds)}</span>
      <button
        type="button"
        onClick={() => setIsPaused(!isPaused)}
        className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title={isPaused ? 'Resume solving timer' : 'Pause solving timer'}
      >
        {isPaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3" />}
      </button>
    </div>
  );
};
