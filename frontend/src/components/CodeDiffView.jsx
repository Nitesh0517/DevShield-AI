import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';

export default function CodeDiffView({
  originalCode,
  suggestedCode,
  onApplyPatch,
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide' | 'suggestedOnly'

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([suggestedCode], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'devshield_patch.py');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const originalLines = originalCode.split('\n');
  const suggestedLines = suggestedCode.split('\n');

  return (
    <div className="rounded-xl bg-[#0f172a] border border-[#24324f] overflow-hidden shadow-xl">
      {/* Diff Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#131d33] border-b border-[#24324f]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-200">
            Code Comparison & Proposed Patch
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* View toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#090d16] border border-[#24324f] text-[11px]">
            <button
              onClick={() => setViewMode('sideBySide')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                viewMode === 'sideBySide'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('suggestedOnly')}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                viewMode === 'suggestedOnly'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Patch Only
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e293b] hover:bg-slate-700 text-slate-300 hover:text-white border border-[#24324f] transition-all"
            title="Copy suggested code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e293b] hover:bg-slate-700 text-slate-300 hover:text-white border border-[#24324f] transition-all"
            title="Download proposed patch as Python file"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download .py</span>
          </button>

          {/* Apply Patch Button */}
          {onApplyPatch && (
            <button
              onClick={onApplyPatch}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 transition-all"
              title="Replace workspace code with this suggested patch"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply Fix</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Display Area */}
      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#24324f] font-mono text-xs">
          {/* Original Column */}
          <div className="overflow-x-auto bg-[#090d16]/70">
            <div className="px-4 py-2 text-[11px] font-semibold tracking-wider uppercase text-rose-400/90 bg-rose-950/20 border-b border-rose-900/30 flex items-center justify-between">
              <span>Original (Defective)</span>
              <span className="text-[10px] text-slate-500">Read-Only</span>
            </div>
            <pre className="p-4 leading-relaxed text-slate-300 tab-4">
              {originalLines.map((line, idx) => (
                <div key={idx} className="flex">
                  <span className="w-8 select-none text-slate-600 text-right pr-3 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="whitespace-pre">{line || ' '}</span>
                </div>
              ))}
            </pre>
          </div>

          {/* Suggested Fix Column */}
          <div className="overflow-x-auto bg-[#0a1120]/90">
            <div className="px-4 py-2 text-[11px] font-semibold tracking-wider uppercase text-emerald-400/90 bg-emerald-950/20 border-b border-emerald-900/30 flex items-center justify-between">
              <span>Suggested Fix (Patched)</span>
              <span className="text-[10px] text-emerald-500/80">AI Recommended</span>
            </div>
            <pre className="p-4 leading-relaxed text-slate-200 tab-4">
              {suggestedLines.map((line, idx) => (
                <div key={idx} className="flex bg-emerald-950/10">
                  <span className="w-8 select-none text-emerald-600/70 text-right pr-3 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="whitespace-pre text-emerald-200/95">{line || ' '}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#090d16] font-mono text-xs">
          <pre className="p-4 leading-relaxed text-slate-200">
            {suggestedLines.map((line, idx) => (
              <div key={idx} className="flex">
                <span className="w-8 select-none text-purple-500/70 text-right pr-3 shrink-0">
                  {idx + 1}
                </span>
                <span className="whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
