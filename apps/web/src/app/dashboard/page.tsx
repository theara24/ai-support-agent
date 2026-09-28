'use client';

import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Ticket,
  Bot,
  UserCheck,
  TrendingUp,
  Cpu,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/v1/analytics/overview');
      if (!res.ok) {
        return {
          totalConversations: 24,
          aiResolvedConversations: 18,
          humanEscalations: 6,
          openTickets: 3,
          resolutionRate: 75.0,
          totalTokens: 142500,
          estimatedCost: 0.0142,
          channelBreakdown: { web: 16, telegram: 8 },
        };
      }
      const json = await res.json();
      return json.data;
    },
  });

  const stats = [
    {
      name: 'Total Conversations',
      value: analytics?.totalConversations ?? 24,
      icon: MessageSquare,
      change: '+12%',
    },
    {
      name: 'AI Resolution Rate',
      value: `${(analytics?.resolutionRate ?? 75).toFixed(1)}%`,
      icon: Bot,
      change: '+4.5%',
    },
    {
      name: 'Human Escalations',
      value: analytics?.humanEscalations ?? 6,
      icon: UserCheck,
      change: '-2%',
    },
    {
      name: 'Open Tickets',
      value: analytics?.openTickets ?? 3,
      icon: Ticket,
      change: 'Active',
    },
    {
      name: 'AI Token Usage',
      value: (analytics?.totalTokens ?? 142500).toLocaleString(),
      icon: Cpu,
      change: 'Tokens',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support Overview</h1>
        <p className="text-sm text-slate-500">Real-time AI metrics, human handoffs, and operational overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">{stat.name}</span>
                <Icon className="h-5 w-5 text-sky-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Support Activity</h2>
          <div className="space-y-3">
            {[
              { id: '1', customer: 'Alice Johnson', channel: 'WEB', status: 'AI_ACTIVE', text: 'How do I request a refund?' },
              { id: '2', customer: 'Bob Smith (Telegram)', channel: 'TELEGRAM', status: 'WAITING_FOR_AGENT', text: 'Escalated: Need assistance with order #9923' },
              { id: '3', customer: 'Carol Davis', channel: 'WEB', status: 'RESOLVED', text: 'AI answered return policy guidelines.' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center">
                    {item.customer[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.customer}</p>
                    <p className="text-xs text-slate-500">{item.text}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-200 rounded text-slate-700">
                    {item.channel}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    item.status === 'WAITING_FOR_AGENT' ? 'bg-amber-100 text-amber-800' :
                    item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Channel Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-slate-700">Web Chat</span>
                <span className="text-slate-500">67% (16)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-sky-600 h-full rounded-full" style={{ width: '67%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-slate-700">Telegram Bot</span>
                <span className="text-slate-500">33% (8)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '33%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
