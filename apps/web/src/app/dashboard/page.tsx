'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Ticket,
  Bot,
  UserCheck,
  Cpu,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Activity,
  Layers,
  Database,
  Radio,
  Send,
  Sparkles,
  Search,
  Trash2,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

interface OnboardingRequest {
  id: string;
  orgName: string;
  industry: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'onboarding' | 'incidents' | 'infrastructure'>('overview');

  // Onboarding Requests state for Super Admin (loaded from persistent storage, no hardcoded fake demo)
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequest[]>([]);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login?redirect=/dashboard';
        return;
      }

      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to parse user info:', e);
      }

      try {
        const storedRequests = localStorage.getItem('tenant_onboarding_applications');
        if (storedRequests) {
          setOnboardingRequests(JSON.parse(storedRequests));
        } else {
          setOnboardingRequests([]);
        }
      } catch (e) {
        console.error('Failed to parse onboarding applications:', e);
        setOnboardingRequests([]);
      }
    }
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const json = await apiFetch('/api/v1/analytics/overview');
      return json.data;
    },
  });

  const { data: recentConversations = [], isLoading: isRecentLoading } = useQuery({
    queryKey: ['dashboard-recent-conversations'],
    queryFn: async () => {
      try {
        const json = await apiFetch('/api/v1/conversations');
        return (json.data || []).slice(0, 5);
      } catch {
        return [];
      }
    },
  });

  const { data: allTickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['dashboard-all-tickets'],
    queryFn: async () => {
      try {
        const json = await apiFetch('/api/v1/tickets');
        return json.data || [];
      } catch {
        return [];
      }
    },
  });

  // Filter reported platform issues submitted via "Report Issue to Super Admin"
  const platformIssues = allTickets.filter(
    (t: any) => t.title?.includes('[PLATFORM_ISSUE]') || t.title?.includes('[SYSTEM_ISSUE]')
  );

  const saveUpdatedRequests = (updated: OnboardingRequest[]) => {
    setOnboardingRequests(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_onboarding_applications', JSON.stringify(updated));
    }
  };

  const handleApproveRequest = (id: string, orgName: string) => {
    const updated = onboardingRequests.map((r) =>
      r.id === id ? { ...r, status: 'APPROVED' as const } : r
    );
    saveUpdatedRequests(updated);
    setNotificationMsg(`✅ Approved ${orgName}! Tenant organization created and admin access enabled.`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleRejectRequest = (id: string, orgName: string) => {
    const updated = onboardingRequests.map((r) =>
      r.id === id ? { ...r, status: 'REJECTED' as const } : r
    );
    saveUpdatedRequests(updated);
    setNotificationMsg(`❌ Application for ${orgName} was rejected.`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleDeleteRequest = (id: string) => {
    const updated = onboardingRequests.filter((r) => r.id !== id);
    saveUpdatedRequests(updated);
    setNotificationMsg(`🗑️ Application removed from list.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleClearAllRequests = () => {
    saveUpdatedRequests([]);
    setNotificationMsg(`🧹 All onboarding applications have been cleared.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const totalConvs = analytics?.totalConversations ?? 0;
  const resolutionRateFormatted =
    totalConvs > 0 ? `${(analytics?.resolutionRate ?? 0).toFixed(1)}%` : 'Insufficient data';

  const stats = [
    {
      name: 'Total Conversations',
      value: analytics ? analytics.totalConversations : '—',
      icon: MessageSquare,
      badge: 'Active threads',
    },
    {
      name: 'AI Resolution Rate',
      value: analytics ? resolutionRateFormatted : '—',
      icon: Bot,
      badge: totalConvs > 0 ? 'Measured' : 'Needs data',
    },
    {
      name: 'Human Escalations',
      value: analytics ? analytics.humanEscalations : '—',
      icon: UserCheck,
      badge: 'Handoffs',
    },
    {
      name: 'Open Tickets',
      value: analytics ? analytics.openTickets : '—',
      icon: Ticket,
      badge: 'In progress',
    },
    {
      name: 'AI Token Usage',
      value: analytics ? (analytics.totalTokens || 0).toLocaleString() : '—',
      icon: Cpu,
      badge: 'Tokens',
    },
  ];

  const webCount = analytics?.channelBreakdown?.web ?? 0;
  const telegramCount = analytics?.channelBreakdown?.telegram ?? 0;
  const totalChannels = webCount + telegramCount;
  const webPercent = totalChannels > 0 ? Math.round((webCount / totalChannels) * 100) : 0;
  const telegramPercent = totalChannels > 0 ? Math.round((telegramCount / totalChannels) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <span>{notificationMsg}</span>
          <button onClick={() => setNotificationMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isSuperAdmin ? 'Platform Control Center' : 'Support Overview'}
            </h1>
            {isSuperAdmin && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 tracking-wide">
                👑 SUPER ADMIN
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSuperAdmin
              ? 'Multi-tenant organization approvals, tenant bug reports, system health, and global analytics.'
              : 'Real-time AI metrics, human handoffs, and operational overview.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('onboarding')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'onboarding'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>Onboarding Queue</span>
                <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-sky-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {onboardingRequests.filter((r) => r.status === 'PENDING_REVIEW').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'incidents'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>Reported Issues</span>
                <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {platformIssues.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('infrastructure')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'infrastructure'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Infrastructure
              </button>
            </div>
          )}

          <button
            onClick={() => {
              refetchAnalytics();
              refetchTickets();
            }}
            className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {analyticsError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-semibold">Unable to fetch live analytics</p>
            <p className="text-xs text-rose-700">
              {(analyticsError as ApiError)?.message || 'Please check API connection.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: OPERATIONAL OVERVIEW */}
      {(!isSuperAdmin || activeTab === 'overview') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider">{stat.name}</span>
                    <Icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    {isAnalyticsLoading ? (
                      <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div>
                    ) : (
                      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</span>
                    )}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {stat.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                Recent Support Activity
              </h2>
              <div className="space-y-3">
                {isRecentLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                    ))}
                  </div>
                ) : recentConversations.length > 0 ? (
                  recentConversations.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {(item.customer?.name || 'Customer')[0]}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.customer?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                            {item.messages?.[0]?.content || 'Active support thread'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                          {item.channel}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            item.status === 'WAITING_FOR_AGENT'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : item.status === 'RESOLVED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : item.status === 'HUMAN_ACTIVE'
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                              : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    No conversations recorded yet. Start a chat in Customer Web Chat to see real activity.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Channel Breakdown</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Web Chat</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {webPercent}% ({webCount})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-600 h-full rounded-full transition-all"
                      style={{ width: `${webPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Telegram Bot</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {telegramPercent}% ({telegramCount})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${telegramPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANT ONBOARDING & APPROVAL QUEUE (SUPER ADMIN EXCLUSIVE) */}
      {isSuperAdmin && activeTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span>Tenant Onboarding Applications / សំណើសុំបើកគណនី</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Applications submitted from the homepage modal waiting for Super Admin review and workspace provisioning.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {onboardingRequests.length} Total Applications
                </span>
                {onboardingRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllRequests}
                    className="text-xs font-semibold px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Clear all applications"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {onboardingRequests.length > 0 ? (
                onboardingRequests.map((req) => (
                  <div key={req.id} className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{req.orgName}</h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {req.industry}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4 flex-wrap">
                        <span>Contact: <strong className="text-slate-700 dark:text-slate-200">{req.contactName}</strong></span>
                        <span>Email: <strong className="text-slate-700 dark:text-slate-200">{req.email}</strong></span>
                        <span>Phone: <strong className="text-slate-700 dark:text-slate-200">{req.phone}</strong></span>
                        <span>Submitted: {req.createdAt}</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        &quot;{req.notes}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'PENDING_REVIEW' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.id, req.orgName)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req.id, req.orgName)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve Workspace</span>
                          </button>
                        </>
                      ) : req.status === 'APPROVED' ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Workspace Active</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          <span>Declined</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete application"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center space-y-3 text-slate-400">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      No Tenant Applications / មិនមានសំណើសុំបើកគណនីទេ
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      New tenant applications submitted via the landing page modal will appear here in real-time for Super Admin review.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPORTED SYSTEM INCIDENTS (SUPER ADMIN EXCLUSIVE) */}
      {isSuperAdmin && activeTab === 'incidents' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <span>Tenant Incident & Bug Reports / របាយការណ៍បញ្ហាពី Tenant</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Issues reported directly by Tenant Admins or Support Agents using the &quot;Report Issue to Super Admin&quot; button.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                {platformIssues.length} Incidents Logged
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {platformIssues.length > 0 ? (
                platformIssues.map((ticket: any) => (
                  <div key={ticket.id} className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                          #{ticket.id.slice(0, 8)}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{ticket.title}</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {ticket.priority || 'MEDIUM'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-mono whitespace-pre-wrap">
                      {ticket.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>Status: <strong className="text-emerald-500">{ticket.status}</strong></span>
                      <span>Logged: {new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center space-y-2 text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No open platform incidents reported!
                  </p>
                  <p className="text-xs">All tenant workspaces and system services are running smoothly.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INFRASTRUCTURE & HEALTH PULSE (SUPER ADMIN EXCLUSIVE) */}
      {isSuperAdmin && activeTab === 'infrastructure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">PostgreSQL DB</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Healthy</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Port 5436 • pgvector (768-dim) • 29 Connections active
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Redis In-Memory</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Connected</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Port 6380 • Socket.IO Pub/Sub & token session store
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Google Gemini LLM</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Operational</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Gemini 2.5 Flash / Flash Lite • 0.2 temperature • Tool calling
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Telegram Bot</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Active</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                @ThearaSupportBot • Long-polling listener connected
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ExternalLink className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400" />
              <span>Super Admin Developer Tools & API Access</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Access the live REST endpoints, inspect OpenAPI schemas, or run health diagnostic checks.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="http://localhost:3000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-700 shadow-xs transition-colors"
              >
                <span>Interactive Swagger REST API Docs</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>

              <a
                href="http://localhost:3000/api/v1/health"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <span>Live System Health Check JSON</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
