'use client';

import { Ticket, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function TicketsPage() {
  const tickets = [
    { id: 'TICK-101', title: 'Double charge on invoice #9021', customer: 'Alice Johnson', priority: 'HIGH', status: 'OPEN', date: '2026-09-28' },
    { id: 'TICK-102', title: 'Cannot access API endpoint', customer: 'Bob Smith', priority: 'URGENT', status: 'IN_PROGRESS', date: '2026-09-28' },
    { id: 'TICK-103', title: 'Feature request for webhook export', customer: 'Carol Davis', priority: 'LOW', status: 'RESOLVED', date: '2026-09-27' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500">Manage escalated customer requests and support tickets.</p>
        </div>
        <button className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors">
          <Plus className="h-4 w-4" />
          Create Ticket
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Ticket ID</th>
              <th className="p-4">Title</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-semibold text-sky-600">{t.id}</td>
                <td className="p-4 font-medium text-slate-900">{t.title}</td>
                <td className="p-4">{t.customer}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                    t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {t.priority}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    t.status === 'OPEN' ? 'bg-sky-100 text-sky-800' :
                    t.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-400">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
