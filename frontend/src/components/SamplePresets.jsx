import React from 'react';
import { Sparkles, Bug, AlertTriangle, RefreshCw } from 'lucide-react';

export const SAMPLE_PRESETS = [
  {
    id: 'zero-div',
    title: 'ZeroDivisionError',
    desc: 'Arithmetic division without denominator guard',
    icon: AlertTriangle,
    code: `def calculate_average_score(scores, total_students):
    # Calculates the class average score
    # Problem: Crashes when total_students is 0
    return scores / total_students

print("Average:", calculate_average_score(450, 0))`,
    bug: 'Function crashes with ZeroDivisionError when total_students is 0. It should validate the input and handle zero gracefully without crashing.',
  },
  {
    id: 'index-bound',
    title: 'IndexError / Off-by-One',
    desc: 'List boundary violation in loop condition',
    icon: Bug,
    code: `def get_last_three_items(items):
    # Retrieve the last 3 items from a sequence
    # Crashes if the list has fewer than 3 elements
    return [items[len(items) - 3], items[len(items) - 2], items[len(items) - 1]]

print(get_last_three_items(["alpha", "beta"]))`,
    bug: 'IndexError occurs when the list has fewer than 3 elements. Need safe slice or boundary checking.',
  },
  {
    id: 'mutable-default',
    title: 'Mutable Default Argument',
    desc: 'State bleed between successive function calls',
    icon: RefreshCw,
    code: `def append_audit_log(event_name, log_entries=[]):
    # Appends event to current log
    # Problem: Mutable default list retains state across calls!
    log_entries.append(event_name)
    return log_entries

print(append_audit_log("LOGIN"))
print(append_audit_log("LOGOUT"))  # Unexpectedly contains both!`,
    bug: 'log_entries retains items from previous calls because default list [] is instantiated once at function definition time.',
  },
];

export default function SamplePresets({ onSelectPreset }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>Try Hackathon Test Scenarios:</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SAMPLE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0f172a]/70 hover:bg-[#1e293b]/90 border border-[#24324f] hover:border-purple-500/50 text-left transition-all group"
            >
              <div className="p-1.5 rounded-lg bg-purple-950/50 text-purple-400 group-hover:text-purple-300 border border-purple-500/20">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {preset.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {preset.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
