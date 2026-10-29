import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SamplePresets, { SAMPLE_PRESETS } from './components/SamplePresets';
import CodeDiffView from './components/CodeDiffView';
import TestRunnerPanel from './components/TestRunnerPanel';
import HistoryDrawer from './components/HistoryDrawer';
import { safeApiRequest } from './utils/api';
import { generateLocalDemoAnalysis } from './utils/demoEngine';
import {
  Sparkles,
  Bug,
  Code2,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Shield,
  Loader2,
  ArrowRight,
  Info,
  AlertTriangle,
  MapPin,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'history'

  // Form State
  const [code, setCode] = useState(SAMPLE_PRESETS[0].code);
  const [bugDescription, setBugDescription] = useState(SAMPLE_PRESETS[0].bug);

  // System Health
  const [health, setHealth] = useState(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeError, setAnalyzeError] = useState(null);

  // Test Runner State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Session History
  const [history, setHistory] = useState([]);

  // Fetch backend health status on mount
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await safeApiRequest('/api/health');
      if (data && data.status === 'healthy') {
        setHealth(data);
      } else {
        setHealth({ status: 'offline' });
      }
    } catch (err) {
      // Try top-level /health as backup
      try {
        const backupData = await safeApiRequest('/health');
        if (backupData && backupData.status === 'healthy') {
          setHealth(backupData);
          return;
        }
      } catch (backupErr) {
        // Both failed
      }
      setHealth({ status: 'offline' });
    }
  };

  const handleSelectPreset = (preset) => {
    setCode(preset.code);
    setBugDescription(preset.bug);
    setAnalysisResult(null);
    setTestResult(null);
    setAnalyzeError(null);
  };

  const handleAnalyze = async () => {
    if (!code.trim() && !bugDescription.trim()) {
      setAnalyzeError('Please provide either Python source code or a description of the defect.');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);
    setTestResult(null);

    let data = null;
    const finalCode = code.trim() || `# Defect specification:\n# ${bugDescription.trim()}\n`;
    const finalBug = bugDescription.trim() || 'Analyze code for runtime defects, logic flaws, and boundary violations.';

    try {
      data = await safeApiRequest('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          code: finalCode,
          bug_description: finalBug,
        }),
      });
    } catch (err) {
      console.warn('Backend API request encountered error:', err.message);
      // If we are in Demo Mode or if backend is offline/502 Bad Gateway, gracefully fall back to local demo synthesis
      if (
        !health ||
        health.status === 'offline' ||
        health.ai_mode === 'demo' ||
        err.message.includes('502') ||
        err.message.includes('Cannot connect') ||
        err.message.includes('Connection refused')
      ) {
        console.info('[DevShield] Running client-side deterministic demo engine.');
        data = generateLocalDemoAnalysis(finalCode, finalBug);
      } else {
        setAnalyzeError(err.message || 'An unexpected error occurred during analysis.');
        setIsAnalyzing(false);
        return;
      }
    }

    if (!data || typeof data !== 'object') {
      setAnalyzeError('Analysis response was empty or malformed.');
      setIsAnalyzing(false);
      return;
    }

    setAnalysisResult(data);

    // Save to session history
    const newHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      mode: data.mode || 'demo',
      code: finalCode,
      bug_description: finalBug,
      summary: data.summary || 'Code Defect Analysis',
      root_cause: data.root_cause || '',
      severity: data.severity || 'medium',
      relevant_code_location: data.relevant_code_location || null,
      suggested_code: data.suggested_code || data.proposed_patch || finalCode,
      explanation: data.explanation || '',
      tests: data.tests || data.suggested_unit_tests || [],
      warnings: data.warnings || [],
      limitations_and_uncertainty: data.limitations_and_uncertainty || [],
    };
    setHistory((prev) => [newHistoryItem, ...prev]);
    setIsAnalyzing(false);
  };

  const handleRunTests = async (payload) => {
    setIsTesting(true);
    try {
      const data = await safeApiRequest('/api/run-tests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setTestResult(data);
    } catch (err) {
      if (!health || health.status === 'offline' || err.message?.includes('Cannot connect')) {
        setTestResult({
          status: 'unavailable',
          secure_mode: false,
          error_message: 'Docker execution sandbox is offline in this static web deployment. Arbitrary code execution is blocked for security.',
          passed_count: 0,
          total_count: payload.tests?.length || 0,
          results: [],
          captured_output: '[SECURITY NOTICE] Live Python execution is strictly disabled in the static web deployment. Untrusted code execution requires the local containerized backend (Docker non-root sandbox).',
          execution_time_ms: 0,
        });
        return;
      }

      setTestResult({
        status: 'error',
        secure_mode: false,
        error_message: err.message || 'Error connecting to test runner.',
        passed_count: 0,
        total_count: payload.tests?.length || 0,
        results: [],
        captured_output: `[ERROR] ${err.message}`,
        execution_time_ms: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApplyPatch = () => {
    if (analysisResult?.suggested_code) {
      setCode(analysisResult.suggested_code);
    }
  };

  const handleSelectHistorySession = (session) => {
    setCode(session.code);
    setBugDescription(session.bug_description);
    setAnalysisResult({
      mode: session.mode,
      summary: session.summary,
      root_cause: session.root_cause,
      severity: session.severity,
      relevant_code_location: session.relevant_code_location,
      suggested_code: session.suggested_code,
      explanation: session.explanation,
      tests: session.tests,
      warnings: session.warnings,
      limitations_and_uncertainty: session.limitations_and_uncertainty,
    });
    setTestResult(null);
    setActiveTab('workspace');
  };

  const getSeverityBadge = (severity) => {
    const s = (severity || 'medium').toLowerCase();
    if (s === 'critical') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
          Critical Severity
        </span>
      );
    }
    if (s === 'high') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
          High Severity
        </span>
      );
    }
    if (s === 'medium') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Medium Severity
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
        Low Severity
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Sticky Header */}
      <Navbar
        health={health}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={history.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {activeTab === 'history' ? (
          <HistoryDrawer
            history={history}
            onSelectSession={handleSelectHistorySession}
            onClearHistory={() => setHistory([])}
          />
        ) : (
          <div className="space-y-8">
            {/* Hero Section */}
            <section className="text-center max-w-3xl mx-auto pt-2 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/60 text-purple-300 border border-purple-500/30 mb-4 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Nebius × NVIDIA Hackathon — Track 1: Coding & Agentic Engineering</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
                Find bugs.{' '}
                <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  Fix them with confidence.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
                DevShield AI inspects Python defects, explains the root cause, delivers a reviewable patch,
                and generates executable unit tests evaluated inside an isolated container sandbox.
              </p>
            </section>

            {/* Quick Presets for Demo */}
            <SamplePresets onSelectPreset={handleSelectPreset} />

            {/* Debug Workspace Input Card */}
            <section className="rounded-2xl bg-[#0f172a] border border-[#24324f] p-5 lg:p-6 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#24324f]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-950/50 text-purple-400 border border-purple-500/20">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Debug Workspace</h2>
                    <p className="text-xs text-slate-400">
                      Paste your Python code and describe the observed issue or edge case.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-950/50 text-indigo-300 border border-indigo-500/30">
                    Python 3.11+
                  </span>
                </div>
              </div>

              {/* Code & Bug Inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Code Area */}
                <div className="lg:col-span-7 flex flex-col">
                  <label htmlFor="code-editor" className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Python Source Code</span>
                    <span className="text-[11px] text-slate-500 font-normal">Monospace Editor</span>
                  </label>
                  <div className="relative flex-1 rounded-xl bg-[#090d16] border border-[#24324f] focus-within:border-purple-500 transition-all overflow-hidden">
                    <textarea
                      id="code-editor"
                      rows={12}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="# Enter your Python function or script here..."
                      spellCheck="false"
                      className="w-full h-full p-4 font-mono text-xs text-slate-200 bg-transparent resize-y focus:outline-none leading-relaxed placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Bug Description Area */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <label htmlFor="bug-input" className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Describe the Bug / Expected Behavior</span>
                      <Bug className="w-3.5 h-3.5 text-purple-400" />
                    </label>
                    <div className="rounded-xl bg-[#090d16] border border-[#24324f] focus-within:border-purple-500 transition-all overflow-hidden">
                      <textarea
                        id="bug-input"
                        rows={7}
                        value={bugDescription}
                        onChange={(e) => setBugDescription(e.target.value)}
                        placeholder="What triggers the bug? What error message or unexpected behavior occurs?"
                        className="w-full p-3.5 text-xs text-slate-200 bg-transparent resize-y focus:outline-none leading-relaxed placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Analyze Trigger */}
                  <div className="mt-4 pt-3 border-t border-[#1e293b]">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !code.trim() || !bugDescription.trim()}
                      className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xl shadow-purple-900/30 transition-all"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing with DevShield AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze Code & Formulate Patch</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      {health?.ai_mode === 'ai'
                        ? `Live inference via Nebius (${health.model})`
                        : 'Running in Demo Mode. Results synthesized offline without live API.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Banner */}
              {analyzeError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-semibold">Analysis Failed:</strong> {analyzeError}
                  </div>
                </div>
              )}
            </section>

            {/* Results Section */}
            {analysisResult && (
              <section className="space-y-6 animate-in fade-in-50 duration-300">
                {/* Mode Label Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                    analysisResult.mode === 'ai'
                      ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 shrink-0" />
                    <span>
                      {analysisResult.mode === 'ai' ? (
                        <>
                          <strong>Real AI Generated Result:</strong> Inferred via NVIDIA open-source model on Nebius Token Factory.
                        </>
                      ) : (
                        <>
                          <strong>Demo Mode Active:</strong> Nebius API key is not configured. This response is an intelligent local mock.
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(analysisResult.severity)}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/40 border border-white/10">
                      Mode: {analysisResult.mode}
                    </span>
                  </div>
                </div>

                {/* Bug Summary & Root Cause Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Summary Card */}
                  <div className="p-5 rounded-xl bg-[#0f172a] border border-[#24324f] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                          <Bug className="w-4 h-4" />
                          <span>Defect Summary</span>
                        </div>
                        {getSeverityBadge(analysisResult.severity)}
                      </div>
                      <p className="text-sm text-slate-200 font-medium leading-relaxed">
                        {analysisResult.summary}
                      </p>
                    </div>

                    {analysisResult.relevant_code_location && (
                      <div className="mt-3 pt-3 border-t border-[#1e293b] flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span>Location: </span>
                        <code className="text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono text-[11px]">
                          {analysisResult.relevant_code_location}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Root Cause Card */}
                  <div className="p-5 rounded-xl bg-[#0f172a] border border-[#24324f]">
                    <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                      <Info className="w-4 h-4" />
                      <span>Root Cause Analysis</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {analysisResult.root_cause}
                    </p>
                    {analysisResult.explanation && (
                      <div className="mt-3 pt-3 border-t border-[#1e293b] text-xs text-slate-400">
                        <strong className="text-slate-200">Patch Rationale:</strong> {analysisResult.explanation}
                      </div>
                    )}
                  </div>
                </div>

                {/* Limitations & Uncertainty if any */}
                {(analysisResult.limitations_and_uncertainty?.length > 0 || analysisResult.warnings?.length > 0) && (
                  <div className="p-4 rounded-xl bg-[#0f172a] border border-[#24324f] text-xs text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Assumptions, Limitations & Safety Considerations:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400 text-[11px] sm:text-xs">
                      {(analysisResult.limitations_and_uncertainty || analysisResult.warnings).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Code Diff & Patch View */}
                <CodeDiffView
                  originalCode={code}
                  suggestedCode={analysisResult.suggested_code}
                  onApplyPatch={handleApplyPatch}
                />

                {/* Test Runner Suite */}
                <TestRunnerPanel
                  tests={analysisResult.tests || []}
                  originalCode={code}
                  suggestedCode={analysisResult.suggested_code}
                  isTesting={isTesting}
                  testResult={testResult}
                  onRunTests={handleRunTests}
                  secureRunnerAvailable={health?.secure_runner_available}
                />
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-[#1e293b] text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 font-semibold">DevShield AI</span>
            <span>— AI-Powered Coding & Debugging Agent</span>
          </div>
          <div className="text-slate-500">
            Nebius × NVIDIA Hackathon · Track 1: Coding & Agentic Engineering
          </div>
        </div>
      </footer>
    </div>
  );
}
