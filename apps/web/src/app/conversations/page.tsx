'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Bot, UserCheck, Send, ShieldAlert } from 'lucide-react';

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string>('conv-1');
  const [messageInput, setMessageInput] = useState<string>('');

  const conversations = [
    { id: 'conv-1', customer: 'Alice Johnson', status: 'AI_ACTIVE', channel: 'WEB', time: '2m ago', lastMsg: 'What is the return policy?' },
    { id: 'conv-2', customer: 'Bob Smith', status: 'WAITING_FOR_AGENT', channel: 'TELEGRAM', time: '5m ago', lastMsg: 'I need to speak to a human representative.' },
    { id: 'conv-3', customer: 'Charlie Brown', status: 'HUMAN_ACTIVE', channel: 'WEB', time: '12m ago', lastMsg: 'Agent is assisting with invoice.' },
  ];

  const messages = [
    { id: 'm1', sender: 'CUSTOMER', text: 'Hi, I would like to know how refunds are processed.', time: '10:14 AM' },
    { id: 'm2', sender: 'AI', text: 'Hello Alice! According to our refund policy, returns must be initiated within 30 days of purchase. Would you like me to open a support ticket for your order?', time: '10:14 AM' },
  ];

  return (
    <div className="h-[calc(100vh-3rem)] flex gap-6">
      {/* Conversation List */}
      <div className="w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900 text-lg">Conversations</h2>
          <p className="text-xs text-slate-500">Live support queue across channels</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                selectedId === c.id ? 'bg-sky-50/70 border-l-4 border-sky-600' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-900 text-sm">{c.customer}</span>
                <span className="text-xs text-slate-400">{c.time}</span>
              </div>
              <p className="text-xs text-slate-500 truncate mb-2">{c.lastMsg}</p>
              <div className="flex gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  c.status === 'WAITING_FOR_AGENT' ? 'bg-amber-100 text-amber-800' :
                  c.status === 'HUMAN_ACTIVE' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                }`}>
                  {c.status}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {c.channel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Chat View */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
          <div>
            <h3 className="font-bold text-slate-900">Alice Johnson</h3>
            <span className="text-xs text-slate-500">Channel: WEB | Status: AI_ACTIVE</span>
          </div>
          <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm">
            <UserCheck className="h-4 w-4" />
            Takeover from AI
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'CUSTOMER' ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[70%] p-3.5 rounded-2xl text-sm ${
                  m.sender === 'CUSTOMER'
                    ? 'bg-slate-100 text-slate-900 rounded-bl-none'
                    : m.sender === 'AI'
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-indigo-600 text-white rounded-br-none'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] opacity-80 mb-1">
                  {m.sender === 'AI' ? <Bot className="h-3 w-3" /> : null}
                  <span>{m.sender}</span>
                </div>
                <p>{m.text}</p>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">{m.time}</span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <input
            type="text"
            placeholder="Type your response or internal note..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors">
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
