'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  X,
  Send,
  CheckCircle2,
  LifeBuoy,
  ShieldAlert,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportIssueModal({ isOpen, onClose }: ReportIssueModalProps) {
  const [category, setCategory] = useState('UI_BUG');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedRef, setSubmittedRef] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please fill in both the issue title and description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Create official system report ticket for Super Admin
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = userStr ? JSON.parse(userStr) : null;
      const tenantEmail = user?.email || 'tenant-admin@platform.local';

      const payload = {
        title: `[PLATFORM_ISSUE][${severity}][${category}] ${title.trim()}`,
        description: `REPORTED BY TENANT ADMIN: ${tenantEmail}\n\nCATEGORY: ${category}\nSEVERITY: ${severity}\nCURRENT URL: ${window.location.href}\n\nDETAILS:\n${description.trim()}`,
        priority: severity === 'URGENT' ? 'URGENT' : severity,
      };

      const res = await apiFetch('/api/v1/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const refId = res?.data?.id ? `#ISSUE-${res.data.id.slice(0, 6).toUpperCase()}` : '#ISSUE-LOGGED';
      setSubmittedRef(refId);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setTitle('');
    setDescription('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                Report Issue to Super Admin / រាយការណ៍បញ្ហាប្រព័ន្ធ
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct lifeline to Platform Engineering team
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Issue Dispatched to Super Admin!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your incident report has been logged with reference ID <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{submittedRef}</span>. The platform team has been notified.
              </p>
            </div>
            <button
              onClick={handleResetAndClose}
              className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="UI_BUG">UI / Layout Bug</option>
                  <option value="SOCKET_DISCONNECT">Real-Time / Socket Disconnect</option>
                  <option value="AI_ACCURACY">AI Accuracy / Response Quality</option>
                  <option value="KNOWLEDGE_BASE">Knowledge Base / File Upload</option>
                  <option value="PERFORMANCE">Slowness / Performance</option>
                  <option value="OTHER">Other / Feature Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="LOW">Low (Cosmetic / Trivial)</option>
                  <option value="MEDIUM">Medium (Normal)</option>
                  <option value="HIGH">High (Important feature broken)</option>
                  <option value="URGENT">Urgent (System outage)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issue Summary / ចំណងជើងបញ្ហា
              </label>
              <input
                type="text"
                placeholder="e.g. Chat widget fails to load on Safari, or Knowledge base 500 error"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Description & Steps / ការពណ៌នាលម្អិត
              </label>
              <textarea
                rows={3}
                placeholder="What happened? What were you trying to do? Any error message?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Sending...' : 'Dispatch Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
