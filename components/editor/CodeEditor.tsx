'use client';

import React, { useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { RotateCcw, Copy, Check } from 'lucide-react';

interface CodeEditorProps {
  slug: string;
  starterCode: string;
  code: string;
  onChange: (value: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  slug,
  starterCode,
  code,
  onChange,
}) => {
  const [copied, setCopied] = useState(false);

  // Initialize draft from localStorage if available
  useEffect(() => {
    try {
      const storageKey = `dsa_coach_draft_${slug}`;
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft && savedDraft.trim().length > 0) {
        onChange(savedDraft);
      } else if (!code || code.trim().length === 0) {
        onChange(starterCode);
      }
    } catch {
      // LocalStorage access fallback
      if (!code) onChange(starterCode);
    }
  }, [slug, starterCode, onChange]);

  const handleEditorChange = (value?: string) => {
    const val = value || '';
    onChange(val);
    try {
      localStorage.setItem(`dsa_coach_draft_${slug}`, val);
    } catch {
      // Ignore quota errors
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset code to the original starter template? Your current edits will be discarded.')) {
      onChange(starterCode);
      try {
        localStorage.removeItem(`dsa_coach_draft_${slug}`);
      } catch {
        // Ignore
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Configure editor preferences
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      tabSize: 2,
      automaticLayout: true,
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      padding: { top: 12, bottom: 12 },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span className="font-mono text-slate-300 font-semibold">solution.js</span>
          <span className="text-slate-500">•</span>
          <span className="text-[11px] text-slate-500 font-mono">JavaScript (Node.js)</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-rose-400 transition-colors"
            title="Reset to starter template"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 min-h-[350px]">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            renderLineHighlight: 'all',
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};
