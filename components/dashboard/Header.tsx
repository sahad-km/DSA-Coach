'use client';

import React from 'react';
import { QuestionListType, LearningStage } from '@/lib/types';
import { Sparkles, Terminal, Code2, Layers, Sliders } from 'lucide-react';

interface HeaderProps {
  selectedList: QuestionListType;
  onSelectList: (list: QuestionListType) => void;
  learningStage?: LearningStage;
}

export const Header: React.FC<HeaderProps> = ({
  selectedList,
  onSelectList,
  learningStage = 'Easy',
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">DSA Coach</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Adaptive
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Deterministic Mastery Engine
            </p>
          </div>
        </div>

        {/* List Selector Switch */}
        <div className="flex items-center space-x-4">
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 shadow-inner">
            <button
              id="list-selector-blind75"
              onClick={() => onSelectList('blind75')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ${
                selectedList === 'blind75'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Blind 75</span>
            </button>
            <button
              id="list-selector-neetcode150"
              onClick={() => onSelectList('neetcode150')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ${
                selectedList === 'neetcode150'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>NeetCode 150</span>
            </button>
          </div>

          {/* Current Learning Stage Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Stage:</span>
            <span className="font-semibold text-emerald-400">{learningStage}</span>
          </div>

          {/* Settings Link */}
          <a
            href="/settings"
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="Adaptive Engine Settings"
          >
            <Sliders className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
};
