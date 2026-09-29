'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Headphones,
  RotateCcw,
  X,
  CheckCircle2,
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

export default function WidgetChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [conversationStatus, setConversationStatus] = useState<string>('AI_ACTIVE');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Customization parameters from query string
  const [botName, setBotName] = useState<string>('Support Assistant');
  const [companyName, setCompanyName] = useState<string>('Acme Corp');
  const [primaryColor, setPrimaryColor] = useState<string>('#0284c7');
  const [greeting, setGreeting] = useState<string>('Hi there! How can I help you today?');
  const [quickQuestions, setQuickQuestions] = useState<string[]>([
    'What services do you provide?',
    'How do I contact support or a human agent?',
    'What are your hours and location?',
  ]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Read URL query parameters on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('botName')) setBotName(params.get('botName')!);
      if (params.get('company')) setCompanyName(params.get('company')!);
      if (params.get('primaryColor')) setPrimaryColor(params.get('primaryColor')!);
      if (params.get('greeting')) setGreeting(params.get('greeting')!);

      const qqParam = params.get('quickQuestions');
      if (qqParam) {
        try {
          const parsed = (qqParam.includes(';') ? qqParam.split(';') : qqParam.split(','))
            .map((q) => q.trim())
            .filter(Boolean);
          if (parsed.length > 0) {
            setQuickQuestions(parsed);
          }
        } catch {}
      }

      const themeParam = params.get('theme');
      if (themeParam === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        // Embedded widgets default to crisp light theme unless ?theme=dark is explicitly requested
        document.documentElement.classList.remove('dark');
      }

      const savedId = localStorage.getItem('acme_widget_conversation_id');
      if (savedId) {
        setConversationId(savedId);
        loadConversation(savedId);
      }
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
      localStorage.removeItem('acme_widget_conversation_id');
      setConversationId(null);
    }
  };

  // Socket.IO Real-Time listeners
  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    socket.emit('join:conversation', { conversationId, role: 'CUSTOMER' });

    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.isInternalNote) return;

      socket.emit('message:delivered', { conversationId, messageId: msg.id });

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;

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
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleResetChat = () => {
    localStorage.removeItem('acme_widget_conversation_id');
    setConversationId(null);
    setMessages([]);
    setConversationStatus('AI_ACTIVE');
    setErrorBanner(null);
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage('AI_SUPPORT_CLOSE_WIDGET', '*');
    }
  };

  // Typing input handler
  const handleInputChange = (val: string) => {
    setInputMessage(val);
    if (conversationId) {
      const socket = getSocket();
      socket.emit('typing:status', {
        conversationId,
        isTyping: true,
        sender: 'Website Visitor',
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:status', {
          conversationId,
          isTyping: false,
          sender: 'Website Visitor',
        });
      }, 2500);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (conversationId) {
      getSocket().emit('typing:status', {
        conversationId,
        isTyping: false,
        sender: 'Website Visitor',
      });
    }

    setErrorBanner(null);
    setIsSending(true);
    setInputMessage('');

    try {
      let activeId = conversationId;

      if (!activeId) {
        const createRes = await apiFetch('/api/v1/conversations', {
          method: 'POST',
          skipAuth: true,
          body: JSON.stringify({
            channel: 'WEB',
            customerName: 'Website Visitor',
            customerEmail: 'visitor@website.com',
          }),
        });
        activeId = createRes.data.id;
        setConversationId(activeId);
        localStorage.setItem('acme_widget_conversation_id', activeId!);
      }

      const tempUserMsg: ChatMessage = {
        id: `temp_${Date.now()}`,
        senderType: 'CUSTOMER',
        content: text,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'SENT',
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsTyping(true);

      const res = await apiFetch(`/api/v1/conversations/${activeId}/messages`, {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ content: text, senderType: 'CUSTOMER' }),
      });

      if (res?.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) {
            return prev.filter((m) => m.id !== tempUserMsg.id);
          }
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


  return (
    <div className="fixed inset-0 flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 select-none overflow-hidden font-sans">
      {/* Header */}
      <header
        className="px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-sm transition-colors z-10"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm leading-tight truncate">{botName}</h2>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
            </div>
            <p className="text-[11px] text-white/80 truncate">{companyName} • Online</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleResetChat}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Start new conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Escalation Banners */}
      {conversationStatus === 'WAITING_FOR_AGENT' && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-xs text-amber-800 flex items-center gap-2 shrink-0">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
          <span>Escalated to live agent. Standing by...</span>
        </div>
      )}

      {conversationStatus === 'HUMAN_ACTIVE' && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-3 py-1.5 text-xs text-indigo-900 flex items-center gap-2 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span>Connected with a human agent.</span>
        </div>
      )}

      {errorBanner && (
        <div className="bg-rose-50 border-b border-rose-200 px-3 py-1.5 text-xs text-rose-700 shrink-0">
          {errorBanner}
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50 dark:bg-slate-950">
        {/* Welcome Greeting */}
        <div className="flex items-start gap-2.5">
          <div
            className="h-7 w-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs"
            style={{ backgroundColor: primaryColor }}
          >
            <Bot className="h-4 w-4" />
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-xs max-w-[85%] text-slate-900 dark:text-slate-100">
            <MarkdownMessage content={greeting} isUser={false} className="text-slate-900 dark:text-slate-100" />
          </div>
        </div>

        {/* Suggestion Chips (if few messages) */}
        {messages.length === 0 && (
          <div className="pl-9 pr-2 space-y-1.5 pt-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Suggested questions:</p>
            <div className="flex flex-col gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="text-left text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Messages */}
        {messages.map((m) => {
          const isUser = m.senderType === 'CUSTOMER';
          return (
            <div key={m.id} className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div
                  className="h-7 w-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {m.senderType === 'AGENT' ? <Headphones className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
              )}
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-[88%] break-words shadow-2xs ${
                  isUser
                    ? 'text-white rounded-tr-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-sm'
                }`}
                style={isUser ? { backgroundColor: primaryColor } : {}}
              >
                <MarkdownMessage
                  content={m.content}
                  isUser={isUser}
                  className={isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'}
                />
                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isUser ? 'text-white/80' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isUser && (
                    <span className="font-bold tracking-tighter" title={m.deliveryStatus === 'DELIVERED' ? 'Delivered' : 'Sent'}>
                      {m.deliveryStatus === 'DELIVERED' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2 animate-in fade-in duration-200">
            <div
              className="h-7 w-7 rounded-full text-white flex items-center justify-center shrink-0 text-xs shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2 shadow-2xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <footer className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-800 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="p-2 rounded-xl text-white shadow transition-transform active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-1.5 text-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 font-medium">
            <Sparkles className="h-2.5 w-2.5 text-sky-500" />
            Powered by AI Assistant
          </span>
        </div>
      </footer>
    </div>
  );
}
