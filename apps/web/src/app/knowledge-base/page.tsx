'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Trash2, FileUp, Sparkles } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

const KNOWLEDGE_TEMPLATES: Record<string, { title: string; content: string }> = {
  faq: {
    title: 'Organization FAQ & Operating Hours',
    content: `Organization Name: Universal Support Client
Business Hours: Monday to Saturday, 8:00 AM – 6:00 PM. Emergency on-call support available 24/7.
Contact: contact@organization.com | Phone: +855 23 888 999
Location: Phnom Penh, Cambodia
Services Provided: Professional consulting, customer support, admissions/enrollment, and service appointments.
SLA: Inquiries are addressed within 15 minutes; urgent tickets escalated immediately to human agents.`,
  },
  services: {
    title: 'Services, Programs & Fee Structure',
    content: `Overview of Offerings:
1. Standard Consultation: Initial evaluation, service roadmap, and pricing quotation.
2. Premium Packages: Dedicated support specialist, priority scheduling, and discounted long-term agreements.
3. Payment Methods: KHQR (Bakong), Visa, Mastercard, and direct bank wire transfers.
Discounts: Special rates available for educational institutions, non-profit organizations, and long-standing partners.`,
  },
  policies: {
    title: 'Terms of Service, Appointments & Cancellations',
    content: `Booking & Appointments:
- Clients can reserve or reschedule appointments up to 24 hours in advance without penalty.
- Urgent or emergency walk-ins are prioritized during standard working hours.
Satisfaction Guarantee:
- If a service or product does not meet agreed specifications, clients are eligible for full adjustments or refunds within 30 days.`,
  },
};

export default function KnowledgeBasePage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login?redirect=/knowledge-base';
      }
    }
  }, []);

  const queryClient = useQueryClient();
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // 1. Fetch documents list from live API
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['kb-documents-list'],
    queryFn: async () => {
      const json = await apiFetch('/api/v1/knowledge-base/documents');
      return json.data || [];
    },
    refetchInterval: 5000,
  });

  // 2. Ingest document mutation
  const ingestMutation = useMutation({
    mutationFn: async () => {
      const json = await apiFetch('/api/v1/knowledge-base/documents', {
        method: 'POST',
        body: JSON.stringify({ title: docTitle, content: docContent }),
      });
      return json;
    },
    onSuccess: () => {
      setUploadSuccess(`Document "${docTitle}" indexed successfully!`);
      setDocTitle('');
      setDocContent('');
      queryClient.invalidateQueries({ queryKey: ['kb-documents-list'] });
      setTimeout(() => setUploadSuccess(null), 4000);
    },
  });

  // 3. Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const json = await apiFetch(`/api/v1/knowledge-base/documents/${id}`, {
        method: 'DELETE',
      });
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-documents-list'] });
    },
  });

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set title from file name
    const cleanedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setDocTitle(cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1));

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setDocContent(text);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyTemplate = (key: string) => {
    if (!key) return;
    const template = KNOWLEDGE_TEMPLATES[key];
    if (template) {
      setDocTitle(template.title);
      setDocContent(template.content);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Knowledge Base Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage company documents, FAQs, and RAG vector search indexes.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh documents"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm p-3.5 rounded-xl flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
          <span>{(error as ApiError)?.message || 'Failed to load knowledge base documents.'}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm p-3.5 rounded-xl flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Add Knowledge Document</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">pgvector RAG</span>
          </div>

          {/* Quick Templates Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Load Ready Template</span>
            </label>
            <select
              defaultValue=""
              onChange={(e) => handleApplyTemplate(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="" disabled>Select a business template...</option>
              <option value="faq">Company FAQ & Support Hours</option>
              <option value="shipping">Shipping & Delivery Policy</option>
              <option value="refunds">Return & Refund Guidelines</option>
              <option value="pricing">Product Plans & Pricing</option>
            </select>
          </div>

          {/* File Upload Trigger */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <FileUp className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>Or Upload Text / Markdown / CSV File</span>
            </label>
            <input
              type="file"
              accept=".txt,.md,.markdown,.csv,.json"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 dark:file:bg-sky-950/80 file:text-sky-700 dark:file:text-sky-300 hover:file:bg-sky-100 dark:hover:file:bg-sky-900 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-800/30"
            />
          </div>
          
          {ingestMutation.error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs p-3 rounded-lg">
              {(ingestMutation.error as ApiError).message}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Title</label>
            <input
              type="text"
              placeholder="e.g. Shipping Policy 2026"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Text Content</label>
            <textarea
              rows={6}
              placeholder="Paste document text or policy information here..."
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => ingestMutation.mutate()}
            disabled={!docTitle.trim() || !docContent.trim() || ingestMutation.isPending}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Upload className="h-4 w-4" />
            {ingestMutation.isPending ? 'Ingesting & Indexing...' : 'Ingest & Chunk Document'}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Ingested Documents & Vector Chunks</h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{documents.length} Total Documents</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                <div className="h-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded max-w-md mx-auto"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No documents ingested in database.</div>
            ) : (
              documents.map((d: any) => (
                <div key={d.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{d.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {d.contentType || 'TEXT'} • {d._count?.chunks ?? d.chunks?.length ?? 0} vector chunks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border ${
                        d.status === 'READY' || d.status === 'PROCESSED'
                          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                          : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {d.status || 'READY'}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete document "${d.title}"?`)) {
                          deleteMutation.mutate(d.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
