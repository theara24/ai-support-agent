'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, DollarSign, Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

export default function AnalyticsPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login?redirect=/analytics';
      }
    }
  }, []);

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['analytics-page-overview'],
    queryFn: async () => {
      const json = await apiFetch('/api/v1/analytics/overview');
      return json.data;
    },
  });

  const totalTokens = analytics?.totalTokens ?? 0;
  const estimatedCost = analytics?.estimatedCost ?? 0.0;
  const totalConvs = analytics?.totalConversations ?? 0;
  const aiResolved = analytics?.aiResolvedConversations ?? 0;
  const resolutionRateFormatted =
    totalConvs > 0
      ? `${(analytics?.resolutionRate ?? 0).toFixed(1)}%`
      : 'Insufficient data';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics & AI Cost Metrics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track real measured AI token consumption, estimated LLM costs, and support performance.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh analytics"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-semibold">Unable to fetch analytics</p>
            <p className="text-xs text-rose-700 dark:text-rose-400">{(error as ApiError)?.message || 'Please check API connection.'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tokens Processed</span>
            <Cpu className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          {isLoading ? (
            <div className="h-9 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded my-1"></div>
          ) : (
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{totalTokens.toLocaleString()}</span>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Measured from database AIUsage records
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Estimated LLM Cost</span>
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          {isLoading ? (
            <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded my-1"></div>
          ) : (
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">${estimatedCost.toFixed(4)}</span>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Based on actual token volume</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">AI Self-Service Rate</span>
            <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {isLoading ? (
            <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded my-1"></div>
          ) : (
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{resolutionRateFormatted}</span>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {totalConvs > 0
              ? `${aiResolved} of ${totalConvs} resolved without human takeover`
              : 'Requires completed conversations to calculate'}
          </p>
        </div>
      </div>
    </div>
  );
}
