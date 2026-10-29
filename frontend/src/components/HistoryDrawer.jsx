import React from 'react';
import { Clock, Trash2, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';

export default function HistoryDrawer({
  history = [],
  onSelectSession,
  onClearHistory,
}) {
  if (history.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[#0f172a] border border-[#24324f] max-w-2xl mx-auto my-8">
        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-200">
          No Debug Sessions in History
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Analyses and patches you generate in the workspace will appear here so you can review them or switch between previous sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Debug Session History</h2>
          <p className="text-xs text-slate-400">
            {history.length} session{history.length === 1 ? '' : 's'} recorded during this run
          </p>
        </div>
        <button
          onClick={onClearHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear History
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => onSelectSession(item)}
            className="group p-4 rounded-xl bg-[#0f172a] hover:bg-[#131d33] border border-[#24324f] hover:border-purple-500/50 cursor-pointer transition-all shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.mode === 'ai'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.mode === 'ai' ? 'Nebius AI' : 'Demo Mode'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-purple-300 transition-colors truncate">
                  {item.summary || 'Python Code Analysis'}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {item.root_cause || item.bug_description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="p-2 rounded-lg bg-[#1e293b] text-slate-300 group-hover:text-white group-hover:bg-purple-600 transition-all"
                  title="Open this session in workspace"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
