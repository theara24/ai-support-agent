'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Send,
  Bot,
  User,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Headphones,
  Info,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { MarkdownMessage } from '@/components/MarkdownMessage';

interface ChatMessage {
  id: string;
  senderType: 'CUSTOMER' | 'AI' | 'AGENT' | 'SYSTEM';
  content: string;
  createdAt: string;
  isInternalNote?: boolean;
  deliveryStatus?: 'SENT' | 'DELIVERED';
}

export default function CustomerChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('Demo Customer');
  const [customerEmail, setCustomerEmail] = useState<string>('demo.customer@example.com');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [conversationStatus, setConversationStatus] = useState<string>('AI_ACTIVE');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [aiInfo, setAiInfo] = useState<{ mode: string; chatModel: string } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch system AI status (Live Gemini vs Demo)
  useEffect(() => {
    apiFetch('/api/v1/health', { skipAuth: true })
      .then((data) => {
        if (data?.services?.ai) {
          setAiInfo({
            mode: data.services.ai.mode,
            chatModel: data.services.ai.chatModel,
          });
        }
      })
      .catch(() => null);
  }, []);

  // 2. Load existing customer conversation if in localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('acme_customer_conversation_id');
    if (savedId) {
      setConversationId(savedId);
      loadConversation(savedId);
    }
  }, []);

  const loadConversation = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/conversations/${id}`, { skipAuth: true });
      if (res?.data) {
        setConversationStatus(res.data.status);
        if (res.data.messages) {
          setMessages(res.data.messages);
        }
      }
    } catch {
      // If conversation expired or removed, clear storage
      localStorage.removeItem('acme_customer_conversation_id');
      setConversationId(null);
    }
  };

  // 3. Socket.IO Real-Time listeners for messages & human agent handoff
  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    socket.emit('join:conversation', {
      conversationId,
      role: 'CUSTOMER',
      name: customerName,
    });

    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.isInternalNote) return;

      // Acknowledge delivery back to server
      socket.emit('message:delivered', { conversationId, messageId: msg.id });

      setMessages((prev) => {
        // If already present by id, skip
        if (prev.some((m) => m.id === msg.id)) return prev;

        // If this socket message matches an optimistic temp message, replace the temp message
        const tempIndex = prev.findIndex(
          (m) => m.id.startsWith('temp_') && m.content === msg.content && m.senderType === msg.senderType
        );
        if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = { ...msg, deliveryStatus: 'DELIVERED' };
          return updated;
        }

        return [...prev, { ...msg, deliveryStatus: 'DELIVERED' }];
      });
      setIsTyping(false);
    };

    const handleStatusChanged = (data: { conversationId: string; status: string }) => {
      if (data.conversationId === conversationId) {
        setConversationStatus(data.status);
      }
    };

    const handleTypingStatus = (data: { isTyping: boolean }) => {
      setIsTyping(data.isTyping);
    };

    const handleMessageStatusChanged = (data: any) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, deliveryStatus: data.deliveryStatus } : m))
        );
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:status_changed', handleStatusChanged);
    socket.on('typing:status', handleTypingStatus);
    socket.on('message:status_changed', handleMessageStatusChanged);

    return () => {
      socket.emit('leave:conversation', { conversationId });
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:status_changed', handleStatusChanged);
      socket.off('typing:status', handleTypingStatus);
      socket.off('message:status_changed', handleMessageStatusChanged);
    };
  }, [conversationId, customerName]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Start a fresh conversation
  const handleResetChat = () => {
    localStorage.removeItem('acme_customer_conversation_id');
    setConversationId(null);
    setMessages([]);
    setConversationStatus('AI_ACTIVE');
    setErrorBanner(null);
  };

  // Typing input handler
  const handleInputChange = (val: string) => {
    setInputMessage(val);
    if (conversationId) {
      const socket = getSocket();
      socket.emit('typing:status', {
        conversationId,
        isTyping: true,
        sender: customerName || 'Customer',
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:status', {
          conversationId,
          isTyping: false,
          sender: customerName || 'Customer',
        });
      }, 2500);
    }
  };

  // Send Customer Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (conversationId) {
      getSocket().emit('typing:status', {
        conversationId,
        isTyping: false,
        sender: customerName || 'Customer',
      });
    }

    setErrorBanner(null);
    setIsSending(true);
    setInputMessage('');

    try {
      let activeId = conversationId;

      // Create conversation if not yet initialized
      if (!activeId) {
        const createRes = await apiFetch('/api/v1/conversations', {
          method: 'POST',
          skipAuth: true,
          body: JSON.stringify({
            channel: 'WEB',
            customerName: customerName.trim() || 'Demo Customer',
            customerEmail: customerEmail.trim() || 'demo.customer@example.com',
          }),
        });
        activeId = createRes.data.id;
        setConversationId(activeId);
        localStorage.setItem('acme_customer_conversation_id', activeId!);
      }

      // Optimistic user message append
      const tempUserMsg: ChatMessage = {
        id: `temp_${Date.now()}`,
        senderType: 'CUSTOMER',
        content: text,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'SENT',
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsTyping(true);

      // Post message to backend API
      const res = await apiFetch(`/api/v1/conversations/${activeId}/messages`, {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ content: text, senderType: 'CUSTOMER' }),
      });

      if (res?.data) {
        setMessages((prev) => {
          // If the real message was already added via Socket.IO, filter out temp message
          if (prev.some((m) => m.id === res.data.id)) {
            return prev.filter((m) => m.id !== tempUserMsg.id);
          }
          // Otherwise replace the temp message with the real one
          return prev.map((m) => (m.id === tempUserMsg.id ? res.data : m));
        });
      }
    } catch (err: any) {
      setIsTyping(false);
      setErrorBanner((err as ApiError)?.message || 'Failed to send message. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestHuman = async () => {
    await handleSendMessage('I would like to speak with a human support agent.');
  };

  const QUICK_PROMPTS = [
    { label: '💳 Payment Methods', prompt: 'What payment methods do you support?' },
    { label: '📦 Track ACME-1001', prompt: 'Where is my order ACME-1001?' },
    { label: '🔄 Refund Policy', prompt: 'What is your return and refund policy?' },
    { label: '👤 Speak with Agent', prompt: 'I want to speak to a human representative.' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 transition-colors">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[90vh] overflow-hidden transition-colors">
        {/* Header */}
        <header className="p-4 bg-slate-900 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-white">Theara AI Customer Support</h1>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {aiInfo?.mode === 'REAL_AI' ? (
                  <span className="text-sky-300 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Live Gemini AI ({aiInfo.chatModel})
                  </span>
                ) : (
                  <span className="text-amber-300 font-medium">Demo AI Mode (Deterministic)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestHuman}
              disabled={conversationStatus === 'WAITING_FOR_AGENT' || conversationStatus === 'HUMAN_ACTIVE'}
              className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
              title="Request a human support agent"
            >
              <Headphones className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Request Human</span>
            </button>
            <button
              onClick={handleResetChat}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Start New Chat"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Status Notification Banners */}
        {conversationStatus === 'WAITING_FOR_AGENT' && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              <span className="font-semibold">Escalated to Live Support</span> — An agent will join this chat momentarily.
            </div>
          </div>
        )}

        {conversationStatus === 'HUMAN_ACTIVE' && (
          <div className="bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-800 px-4 py-2 text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>A human support agent has connected and is chatting with you.</span>
          </div>
        )}

        {conversationStatus === 'RESOLVED' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>This conversation has been resolved. You can send a new message to re-open anytime.</span>
          </div>
        )}

        {errorBanner && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800 px-4 py-2 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 shrink-0">
            <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Chat Timeline */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-inner">
                <Bot className="h-9 w-9" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Hello! Welcome to Theara AI Support</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ask questions, explore services, or connect directly with our support team.
                </p>
              </div>

              {/* Quick starter chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleSendMessage(q.prompt)}
                    className="p-3 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 hover:border-sky-300 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 transition-all shadow-sm flex items-center justify-between"
                  >
                    <span>{q.label}</span>
                    <span className="text-[10px] text-slate-400">Ask →</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              if (m.isInternalNote) return null;
              const isCust = m.senderType === 'CUSTOMER';
              const isAi = m.senderType === 'AI';
              const isAgent = m.senderType === 'AGENT';

              return (
                <div
                  key={`${m.id}-${idx}`}
                  className={`flex flex-col ${isCust ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-end gap-2 max-w-[85%]">
                    {!isCust && (
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isAi ? 'bg-sky-600 text-white' : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                        isCust
                          ? 'bg-sky-600 text-white rounded-br-none shadow-sm'
                          : isAi
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 rounded-bl-none border border-indigo-200 dark:border-indigo-800 shadow-sm'
                      }`}
                    >
                      {!isCust && (
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                          {isAi ? (
                            <span className="text-sky-600 dark:text-sky-400 font-semibold">Theara AI Assistant</span>
                          ) : (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Live Support Specialist</span>
                          )}
                        </div>
                      )}
                      <MarkdownMessage content={m.content} isUser={isCust} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-2">
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isCust && (
                      <span
                        className={`flex items-center gap-0.5 ${
                          m.deliveryStatus === 'DELIVERED'
                            ? 'text-sky-500 dark:text-sky-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                        title={m.deliveryStatus === 'DELIVERED' ? 'Delivered' : 'Sent'}
                      >
                        {m.deliveryStatus === 'DELIVERED' ? (
                          <span className="font-bold tracking-tighter">✓✓</span>
                        ) : (
                          <span className="font-bold">✓</span>
                        )}
                        <span className="text-[9px] uppercase font-medium">
                          {m.deliveryStatus === 'DELIVERED' ? 'Delivered' : 'Sent'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic p-2 animate-in fade-in duration-200">
              <div className="h-6 w-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="flex items-center gap-1">
                {conversationStatus === 'HUMAN_ACTIVE'
                  ? 'Live Support Specialist is typing'
                  : 'Acme AI Assistant is thinking'}
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 bg-sky-500 rounded-full animate-bounce"></span>
                  <span className="h-1 w-1 bg-sky-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-1 w-1 bg-sky-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input Area */}
        <footer className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shrink-0 transition-colors">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder={
                conversationStatus === 'RESOLVED'
                  ? 'Conversation resolved. Send a message to reopen...'
                  : 'Ask questions, get help, or connect with our support team...'
              }
              value={inputMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={isSending}
              className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
            <span>Powered by Theara AI Support • Built by Chim Theara (ជឺម ធារ៉ា)</span>
            <Link href="/dashboard" className="text-sky-600 dark:text-sky-400 hover:underline">
              Agent Portal →
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
