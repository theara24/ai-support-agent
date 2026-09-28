'use client';

import { BarChart3, Cpu, DollarSign, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics & AI Cost Metrics</h1>
        <p className="text-sm text-slate-500">Track AI token consumption, estimated LLM costs, and support performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tokens Processed</span>
            <Cpu className="h-5 w-5 text-sky-600" />
          </div>
          <span className="text-3xl font-extrabold text-slate-900">142,500</span>
          <p className="text-xs text-slate-500 mt-2">Prompt: 95,000 | Completion: 47,500</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Estimated LLM Cost</span>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-3xl font-extrabold text-slate-900">$0.0142</span>
          <p className="text-xs text-slate-500 mt-2">Based on Gemini Flash token rates</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">AI Self-Service Rate</span>
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
          <span className="text-3xl font-extrabold text-slate-900">75.0%</span>
          <p className="text-xs text-slate-500 mt-2">18 of 24 resolved without human agent</p>
        </div>
      </div>
    </div>
  );
}
