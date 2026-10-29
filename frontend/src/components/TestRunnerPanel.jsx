import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronRight,
  Flame,
  Clock,
  HelpCircle,
} from 'lucide-react';

export default function TestRunnerPanel({
  tests = [],
  originalCode,
  suggestedCode,
  isTesting,
  testResult,
  onRunTests,
  secureRunnerAvailable,
}) {
  const [targetCodeType, setTargetCodeType] = useState('suggested'); // 'suggested' | 'original'
  const [showConsole, setShowConsole] = useState(false);
  const [expandedTests, setExpandedTests] = useState({});

  const toggleTestExpand = (idx) => {
    setExpandedTests((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const codeToRun = targetCodeType === 'suggested' ? suggestedCode : originalCode;

  const handleRun = () => {
    onRunTests({
      code: codeToRun,
      tests: tests,
    });
  };

  const passedCount = testResult?.passed_count ?? 0;
  const totalCount = testResult?.total_count ?? tests.length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-xl bg-[#0f172a] border border-[#24324f] overflow-hidden shadow-xl mt-6">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#131d33] border-b border-[#24324f]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Restricted Test Verification Suite
            </h3>
            <p className="text-xs text-slate-400">
              {tests.length} automated test case{tests.length === 1 ? '' : 's'} generated
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Target Code Selector */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#090d16] border border-[#24324f] text-xs">
            <button
              onClick={() => setTargetCodeType('suggested')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                targetCodeType === 'suggested'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Test Proposed Fix
            </button>
            <button
              onClick={() => setTargetCodeType('original')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                targetCodeType === 'original'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Test Original Code
            </button>
          </div>

          {/* Run Tests Button */}
          <button
            onClick={handleRun}
            disabled={isTesting || tests.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-purple-900/30 transition-all"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing in Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Tests in Sandbox</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Environment Banner */}
      <div className="px-5 py-2.5 bg-[#090d16]/80 border-b border-[#24324f] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {secureRunnerAvailable ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                <strong className="text-emerald-400 font-medium">Secured Sandbox Active:</strong> Isolated Docker container (non-root UID 1000, network disabled, read-only rootfs, 128MB RAM limit).
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                <strong className="text-amber-400 font-medium">Docker Runner Inactive:</strong> Untrusted host execution is strictly blocked for security. Live execution disabled until Docker Desktop is started.
              </span>
            </>
          )}
        </div>
        <div className="text-[11px] text-slate-400 shrink-0">
          Timeout: 5s · Memory: 128MB · Network: OFF
        </div>
      </div>

      {/* Results Overview (if tests have been evaluated) */}
      {testResult && (
        <div className="p-5 border-b border-[#24324f] bg-[#0c1424]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {testResult.status === 'passed' && (
                <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              {testResult.status === 'failed' && (
                <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              {testResult.status === 'error' && (
                <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
                  <Flame className="w-6 h-6" />
                </div>
              )}
              {testResult.status === 'unavailable' && (
                <div className="p-2 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-500/30">
                  <AlertOctagon className="w-6 h-6" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white capitalize">
                    {testResult.status === 'passed' && 'All Tests Executed & Passed!'}
                    {testResult.status === 'failed' && 'Tests Executed: Assertions Failed'}
                    {testResult.status === 'error' && 'Execution Error Encountered'}
                    {testResult.status === 'unavailable' && 'Execution Safely Blocked (Sandbox Unavailable)'}
                  </h4>
                  {testResult.execution_time_ms > 0 && (
                    <span className="text-xs text-slate-400 font-mono">
                      ({testResult.execution_time_ms}ms)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {testResult.error_message ||
                    `Executed and verified inside secure Docker sandbox (${passedCount}/${totalCount} assertions passed).`}
                </p>
              </div>
            </div>

            {testResult.status !== 'unavailable' && (
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-200">
                    {passedCount} / {totalCount} Passed
                  </div>
                  <div className="text-xs text-slate-400">{passRate}% pass rate</div>
                </div>
                <div className="w-24 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
                  <div
                    className={`h-full transition-all duration-500 ${
                      passRate === 100
                        ? 'bg-emerald-500'
                        : passRate > 0
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${passRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Cases List */}
      <div className="p-5 space-y-3">
        {tests.map((test, idx) => {
          const result = testResult?.results?.find((r) => r.name === test.name);
          const isExpanded = !!expandedTests[idx];

          let badgeContent = null;
          if (!testResult) {
            badgeContent = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <Clock className="w-3 h-3" />
                Generated (Not Executed)
              </span>
            );
          } else if (testResult.status === 'unavailable') {
            badgeContent = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-800/50">
                <AlertOctagon className="w-3 h-3" />
                Skipped (Runner Unavailable)
              </span>
            );
          } else if (result?.status === 'passed') {
            badgeContent = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Passed (Executed in Container)
                {result.duration_ms > 0 && ` · ${result.duration_ms}ms`}
              </span>
            );
          } else if (result?.status === 'failed') {
            badgeContent = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <XCircle className="w-3 h-3" />
                Failed (Assertion Failure)
                {result.duration_ms > 0 && ` · ${result.duration_ms}ms`}
              </span>
            );
          } else {
            badgeContent = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="w-3 h-3" />
                Error in Execution
              </span>
            );
          }

          return (
            <div
              key={idx}
              className={`rounded-xl border transition-all ${
                result?.status === 'passed'
                  ? 'bg-emerald-950/20 border-emerald-900/40'
                  : result?.status === 'failed' || result?.status === 'error'
                  ? 'bg-rose-950/20 border-rose-900/40'
                  : testResult?.status === 'unavailable'
                  ? 'bg-amber-950/10 border-amber-900/30'
                  : 'bg-[#131d33]/60 border-[#24324f]'
              }`}
            >
              <div
                onClick={() => toggleTestExpand(idx)}
                className="flex items-center justify-between p-3.5 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <button className="text-slate-400 hover:text-slate-200">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {test.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {badgeContent}
                </div>
              </div>

              {/* Collapsible Test Code & Error Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-[#24324f]/60 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>Test Assertion Script:</span>
                    <span className="text-[10px] text-slate-500">
                      Expected outcome: {test.expected_outcome || 'pass'}
                    </span>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#090d16] text-slate-300 overflow-x-auto">
                    {test.code}
                  </pre>

                  {result?.error && (
                    <div className="mt-2.5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                      <strong>Failure Detail:</strong> {result.error}
                    </div>
                  )}

                  {result?.output && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                      <strong>Captured Sandbox Output:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">{result.output}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Terminal / Output Console Accordion */}
      {testResult?.captured_output && (
        <div className="border-t border-[#24324f] bg-[#090d16]">
          <button
            onClick={() => setShowConsole(!showConsole)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>Container Execution Logs & Diagnostic Output</span>
            </div>
            <span>{showConsole ? 'Hide Console ▲' : 'Show Console ▼'}</span>
          </button>

          {showConsole && (
            <div className="p-4 border-t border-[#1e293b] font-mono text-xs text-emerald-400 bg-black/90 overflow-x-auto max-h-56">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {testResult.captured_output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
