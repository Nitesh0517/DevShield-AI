import React from 'react';
import { Shield, Cpu, Activity, Clock, Terminal } from 'lucide-react';

export default function Navbar({
  health,
  activeTab,
  setActiveTab,
  historyCount = 0,
}) {
  const isHealthy = health?.status === 'healthy';
  const isAiMode = health?.ai_mode === 'ai';
  const secureRunnerAvailable = health?.secure_runner_available;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090d16]/85 border-b border-[#1e293b] px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-cyan-500 shadow-lg shadow-purple-900/30 ring-1 ring-white/20">
            <Shield className="w-5 h-5 text-white stroke-[2.2]" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#090d16]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-200 bg-clip-text text-transparent">
                DevShield
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Coding & Debugging Agent
            </p>
          </div>
        </div>

        {/* View Switcher Navigation */}
        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0f172a] border border-[#1e293b]">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'workspace'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Workspace
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            History
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-900/60 text-purple-200 border border-purple-400/30">
                {historyCount}
              </span>
            )}
          </button>
        </nav>

        {/* Telemetry Status Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* AI / Connectivity Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              !isHealthy
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : isAiMode
                ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
            title={
              !isHealthy
                ? 'Backend is not running on port 8000. Running with client-side demo fallback. Start backend with: cd DevShield-AI/backend; uvicorn app.main:app --port 8000'
                : isAiMode
                ? `Nebius Token Factory Active (${health?.model || 'NVIDIA Nemotron'})`
                : 'Demo Mode: Live Nebius API key not set. Using intelligent local mock.'
            }
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="font-semibold">
              {!isHealthy ? 'Backend Offline (Demo Active)' : isAiMode ? 'Nebius AI' : 'Demo Mode'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isHealthy ? 'bg-rose-400' : isAiMode ? 'bg-purple-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>

          {/* Secure Sandbox Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              secureRunnerAvailable
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-700/60 text-slate-400'
            }`}
            title={
              secureRunnerAvailable
                ? 'Restricted Docker Sandbox is ready for isolated execution'
                : 'Docker runner is inactive. Host execution is blocked for security.'
            }
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="font-semibold">
              {secureRunnerAvailable ? 'Docker Sandbox' : 'Sandbox Idle'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                secureRunnerAvailable ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
