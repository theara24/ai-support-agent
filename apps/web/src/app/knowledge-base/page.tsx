'use client';

import { useState } from 'react';
import { BookOpen, Upload, FileText, CheckCircle2, Clock } from 'lucide-react';

export default function KnowledgeBasePage() {
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');

  const documents = [
    { id: '1', title: 'Return & Refund Policies 2026', type: 'PDF Document', chunks: 12, status: 'READY', date: '2026-09-28' },
    { id: '2', title: 'Product API Integration Manual', type: 'Text Document', chunks: 28, status: 'READY', date: '2026-09-27' },
    { id: '3', title: 'Frequently Asked Questions (FAQ)', type: 'FAQ Entry', chunks: 8, status: 'READY', date: '2026-09-25' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Base Management</h1>
        <p className="text-sm text-slate-500">Manage company documents, FAQs, and RAG vector search indexes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">Add New Knowledge Document</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
            <input
              type="text"
              placeholder="e.g. Shipping Policy 2026"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Text Content</label>
            <textarea
              rows={5}
              placeholder="Paste document text or policy information here..."
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
            <Upload className="h-4 w-4" />
            Ingest & Chunk Document
          </button>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-base">Ingested Documents & Vector Chunks</h2>
          <div className="divide-y divide-slate-100">
            {documents.map((d) => (
              <div key={d.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{d.title}</h3>
                    <p className="text-xs text-slate-500">{d.type} • {d.chunks} vector chunks</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {d.status}
                  </span>
                  <span className="text-xs text-slate-400">{d.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
