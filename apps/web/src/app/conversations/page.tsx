'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Send,
  RefreshCw,
  Search,
  User,
  CheckCircle,
  Copy,
  Check,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Layers,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { MarkdownMessage } from '@/components/MarkdownMessage';
import { useApp } from '@/context/AppContext';

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const {
    t,
    language,
    soundEnabled,
    toggleSound,
    playAlertChime,
    desktopNotificationsEnabled,
    requestNotificationPermission,
    showNotification,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState(false);
  const [presence, setPresence] = useState<{
    isCustomerOnline: boolean;
    isAgentOnline: boolean;
    onlineCount: number;
  }>({
    isCustomerOnline: false,
    isAgentOnline: false,
    onlineCount: 0,
  });
  const [customerTyping, setCustomerTyping] = useState<boolean>(false);
  const [typingSender, setTypingSender] = useState<string>('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login?redirect=/conversations';
      }
    }
  }, []);

  const cannedResponses = [
    {
      label: t('canned.greeting'),
      text:
        language === 'km'
          ? 'សួស្តី! សូមអរគុណសម្រាប់ការទាក់ទងមកកាន់យើងខ្ញុំ។ តើខ្ញុំអាចជួយលោកអ្នកយ៉ាងដូចម្តេច?'
          : 'Hello! Thanks for reaching out to support. How can I assist you today?',
    },
    {
      label: t('canned.order'),
      text:
        language === 'km'
          ? 'សូមមេត្តាផ្តល់លេខសម្គាល់ការបញ្ជាទិញ (Order ID) របស់លោកអ្នកដើម្បីឱ្យខ្ញុំជួយពិនិត្យស្ថានភាពបច្ចុប្បន្ន។'
          : 'Could you please provide your Order ID (e.g. ACME-1001) so I can pull up the latest status?',
    },
    {
      label: t('canned.refund'),
      text:
        language === 'km'
          ? 'យើងមានគោលការណ៍ធានាបង្វិលប្រាក់ក្នុងរយៈពេល ៣០ ថ្ងៃ។ តើលោកអ្នកចង់ឱ្យខ្ញុំជួយស្នើសុំបង្វិលប្រាក់ដែរឬទេ?'
          : 'We offer a 30-day money-back guarantee on all standard orders. Would you like me to initiate a return request?',
    },
    {
      label: t('canned.checking'),
      text:
        language === 'km'
          ? 'សូមរង់ចាំបន្តិច ខ្ញុំកំពុងពិនិត្យមើលព័ត៌មានលម្អិតក្នុងប្រព័ន្ធជូនលោកអ្នក។'
          : 'Please allow me just a moment while I look into your records and verify the details.',
    },
    {
      label: t('canned.resolved'),
      text:
        language === 'km'
          ? 'ខ្ញុំបានដោះស្រាយបញ្ហានេះរួចរាល់ហើយ។ សូមប្រាប់ខ្ញុំប្រសិនបើលោកអ្នកត្រូវការជំនួយបន្ថែម!'
          : 'I have updated your account and resolved this issue. Please let us know if there is anything else we can do!',
    },
  ];

  // 1. Socket.IO Real-Time Synchronization & Live Audio/Push Notifications
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      }

      const isCustomer =
        data?.senderType === 'CUSTOMER' ||
        data?.message?.senderType === 'CUSTOMER';

      if (isCustomer) {
        const text = data?.content || data?.message?.content || 'New customer message received';
        const convId = data?.conversationId || data?.message?.conversationId;
        const channel = data?.channel || (convId === selectedId ? undefined : 'New');

        showNotification(
          t('toast.new_message'),
          text,
          channel,
          () => convId && setSelectedId(convId),
        );
      }
    };

    const handleConversationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      }
    };

    const handleStatusChanged = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      }

      if (data?.status === 'WAITING_FOR_AGENT') {
        showNotification(
          t('toast.escalated'),
          'Customer requested human agent takeover.',
          data?.channel,
          () => data?.conversationId && setSelectedId(data.conversationId),
        );
      }
    };

    const handleTypingStatus = (data: any) => {
      if (data?.conversationId === selectedId) {
        setCustomerTyping(!!data.isTyping);
        setTypingSender(data.sender || 'Customer');
      }
    };

    const handlePresenceUpdate = (data: any) => {
      if (data?.conversationId === selectedId) {
        setPresence({
          isCustomerOnline: !!data.isCustomerOnline,
          isAgentOnline: !!data.isAgentOnline,
          onlineCount: data.onlineCount || 0,
        });
      }
    };

    const handleMessageStatusChanged = (data: any) => {
      if (data?.conversationId === selectedId) {
        queryClient.setQueryData(['conversation-detail', selectedId], (old: any) => {
          if (!old || !old.messages) return old;
          return {
            ...old,
            messages: old.messages.map((m: any) =>
              m.id === data.messageId ? { ...m, deliveryStatus: data.deliveryStatus } : m
            ),
          };
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('conversation:status_changed', handleStatusChanged);
    socket.on('typing:status', handleTypingStatus);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:status_changed', handleMessageStatusChanged);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('conversation:status_changed', handleStatusChanged);
      socket.off('typing:status', handleTypingStatus);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:status_changed', handleMessageStatusChanged);
    };
  }, [queryClient, selectedId, showNotification, t]);

  // Join/Leave Socket.IO Conversation Room & Query Presence
  useEffect(() => {
    if (!selectedId) return;
    const socket = getSocket();
    setCustomerTyping(false);

    socket.emit('join:conversation', { conversationId: selectedId, role: 'AGENT' }, (res: any) => {
      if (res?.presence) {
        setPresence({
          isCustomerOnline: !!res.presence.isCustomerOnline,
          isAgentOnline: !!res.presence.isAgentOnline,
          onlineCount: res.presence.onlineCount || 0,
        });
      }
    });

    socket.emit('presence:query', { conversationId: selectedId }, (res: any) => {
      if (res) {
        setPresence({
          isCustomerOnline: !!res.isCustomerOnline,
          isAgentOnline: !!res.isAgentOnline,
          onlineCount: res.onlineCount || 0,
        });
      }
    });

    return () => {
      socket.emit('leave:conversation', { conversationId: selectedId });
    };
  }, [selectedId]);

  // 2. Fetch live conversations list
  const {
    data: conversations = [],
    isLoading: isListLoading,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['conversations-list'],
    queryFn: async () => {
      const json = await apiFetch('/api/v1/conversations');
      const list = json.data || [];
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
      return list;
    },
    refetchInterval: 5000,
  });

  // 3. Fetch selected conversation detail
  const {
    data: activeConv,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ['conversation-detail', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const json = await apiFetch(`/api/v1/conversations/${selectedId}`);
      return json.data || null;
    },
    enabled: !!selectedId,
    refetchInterval: 4000,
  });

  // Auto-scroll timeline to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  // 4. Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !messageInput.trim()) return;
      return apiFetch(`/api/v1/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: messageInput.trim(),
          isInternalNote,
        }),
      });
    },
    onSuccess: () => {
      setMessageInput('');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (selectedId && !isInternalNote) {
        getSocket().emit('typing:status', {
          conversationId: selectedId,
          isTyping: false,
          sender: 'Support Agent',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
    },
  });

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    if (selectedId && !isInternalNote) {
      const socket = getSocket();
      socket.emit('typing:status', {
        conversationId: selectedId,
        isTyping: true,
        sender: 'Support Agent',
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:status', {
          conversationId: selectedId,
          isTyping: false,
          sender: 'Support Agent',
        });
      }, 2500);
    }
  };

  const takeoverMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/v1/conversations/${id}/takeover`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
    },
  });

  const handbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/v1/conversations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'AI_ACTIVE' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/v1/conversations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/v1/conversations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'HUMAN_ACTIVE' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
    },
  });

  // Export Transcript
  const exportTranscript = (conv: any) => {
    if (!conv) return;
    const msgs = conv.messages || [];
    const transcriptText = [
      `=== ACME SUPPORT CONVERSATION TRANSCRIPT ===`,
      `Conversation ID: ${conv.id}`,
      `Customer: ${conv.customer?.name || 'Anonymous'} (${conv.channel})`,
      `Date: ${new Date(conv.createdAt).toLocaleString()}`,
      `Status: ${conv.status}`,
      `===========================================`,
      '',
      ...msgs.map(
        (m: any) =>
          `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.senderType}${
            m.isInternalNote ? ' (INTERNAL NOTE)' : ''
          }: ${m.content}`,
      ),
    ].join('\n\n');

    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${conv.customer?.name || 'customer'}-${conv.id.substring(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sentiment Helper
  const getSentiment = (conv: any) => {
    if (!conv) return null;
    if (conv.status === 'WAITING_FOR_AGENT') {
      return {
        label: t('sentiment.frustrated'),
        badgeClass:
          'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
      };
    }
    const msgs = conv.messages || [];
    const lastMsg = msgs[msgs.length - 1]?.content?.toLowerCase() || '';
    if (
      lastMsg.includes('thank') ||
      lastMsg.includes('great') ||
      lastMsg.includes('good') ||
      lastMsg.includes('awesome') ||
      lastMsg.includes('អរគុណ') ||
      lastMsg.includes('ល្អ')
    ) {
      return {
        label: t('sentiment.positive'),
        badgeClass:
          'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
      };
    }
    return {
      label: t('sentiment.neutral'),
      badgeClass:
        'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    };
  };

  // Filter Conversations
  const filteredConversations = conversations.filter((c: any) => {
    const q = (searchFilter || '').trim().toLowerCase();
    const name = (c.customer?.name || '').toLowerCase();
    const email = (c.customer?.email || '').toLowerCase();
    const id = (c.id || '').toLowerCase();
    const chatId = (c.customer?.telegramChatId || '').toLowerCase();

    const matchesSearch =
      !q || name.includes(q) || email.includes(q) || id.includes(q) || chatId.includes(q);

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || c.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });

  const pendingWaitingConvs = conversations.filter(
    (c: any) => c.status === 'WAITING_FOR_AGENT',
  );

  // Periodic SLA Escalation Alert Reminder: Triggers audio & desktop notification if any customer is waiting
  useEffect(() => {
    if (pendingWaitingConvs.length === 0) return;

    // Trigger alert reminder every 45 seconds if customers are still waiting unaccepted
    const timer = setInterval(() => {
      playAlertChime();
      showNotification(
        t('alert.waiting_reminder_title'),
        `${pendingWaitingConvs.length} ${t('alert.waiting_reminder_body')}`,
        'SLA',
        () => setSelectedId(pendingWaitingConvs[0]?.id),
      );
    }, 45000);

    return () => clearInterval(timer);
  }, [pendingWaitingConvs.length, playAlertChime, showNotification, t]);

  const activeId = selectedId || (filteredConversations[0]?.id ?? null);
  const currentConv =
    activeConv?.id === activeId ? activeConv : conversations.find((c: any) => c.id === activeId);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getChannelBadge = (channel: string) => {
    if (channel === 'TELEGRAM') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-full shrink-0">
          <span>✈️</span>
          <span>{t('channel.telegram')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full shrink-0">
        <span>🌐</span>
        <span>{t('channel.web')}</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING_FOR_AGENT':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
            {t('status.waiting_for_agent')}
          </span>
        );
      case 'HUMAN_ACTIVE':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
            {t('status.human_active')}
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
            {t('status.resolved')}
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
            {t('status.ai_active')}
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3 pb-1 w-full min-h-0 overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="flex justify-between items-center shrink-0 px-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span>{t('app.title')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('app.subtitle')}</p>
        </div>

        {/* Toolbar: Sound Toggle, Push Notification Permission, Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={soundEnabled ? t('app.sound_on') : t('app.sound_off')}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? t('app.sound_on') : t('app.sound_off')}</span>
          </button>

          <button
            onClick={() => requestNotificationPermission()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              desktopNotificationsEnabled
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title={desktopNotificationsEnabled ? t('app.notifications_enabled') : t('app.enable_notifications')}
          >
            {desktopNotificationsEnabled ? (
              <BellRing className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {desktopNotificationsEnabled ? t('app.notifications_enabled') : t('app.enable_notifications')}
            </span>
          </button>

          <button
            onClick={() => refetchList()}
            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('app.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SLA Pending Alert Banner */}
      {pendingWaitingConvs.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 px-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 truncate">
              🚨 {pendingWaitingConvs.length} {t('alert.waiting_banner')}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedId(pendingWaitingConvs[0]?.id);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors shadow-2xs shrink-0 ml-2"
          >
            {t('alert.accept_now')} →
          </button>
        </div>
      )}

      {/* 3-Column Chatwoot Workspace */}
      <div className="flex-1 flex gap-4 min-h-0 w-full overflow-hidden">
        {/* COLUMN 1: Conversation List (Fixed 320px width) */}
        <div className="w-[320px] min-w-[320px] max-w-[320px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col shrink-0 h-full overflow-hidden transition-colors">
          {/* Channel Filter Pills */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 shrink-0">
            <div className="flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-semibold">
              <button
                onClick={() => setChannelFilter('ALL')}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  channelFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('channel.all')} ({conversations.length})
              </button>
              <button
                onClick={() => setChannelFilter('WEB')}
                className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                  channelFilter === 'WEB'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🌐</span> {t('channel.web')} ({conversations.filter((c: any) => c.channel === 'WEB').length})
              </button>
              <button
                onClick={() => setChannelFilter('TELEGRAM')}
                className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                  channelFilter === 'TELEGRAM'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>✈️</span> {t('channel.telegram')} ({conversations.filter((c: any) => c.channel === 'TELEGRAM').length})
              </button>
            </div>

            {/* Search Input & Status Dropdown */}
            <div className="flex gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder={t('action.search_placeholder')}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 truncate"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-sky-500 shrink-0"
              >
                <option value="ALL">{t('status.all')}</option>
                <option value="AI_ACTIVE">{t('status.ai_active')}</option>
                <option value="WAITING_FOR_AGENT">{t('status.waiting_for_agent')}</option>
                <option value="HUMAN_ACTIVE">{t('status.human_active')}</option>
                <option value="RESOLVED">{t('status.resolved')}</option>
              </select>
            </div>
          </div>

          {/* Scrollable Conversation Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
            {isListLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
                <MessageSquare className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600" />
                <p>{t('action.no_conversations')}</p>
              </div>
            ) : (
              filteredConversations.map((c: any) => {
                const isSelected = activeId === c.id;
                const lastMsg = c.messages?.[c.messages.length - 1];
                const isWaiting = c.status === 'WAITING_FOR_AGENT';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`p-3 cursor-pointer group transition-colors border-l-4 ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-600'
                        : isWaiting
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="relative shrink-0 flex items-center">
                          <span className="text-sm">{c.channel === 'TELEGRAM' ? '✈️' : '🌐'}</span>
                          {c.channel === 'TELEGRAM' ? (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-sky-500 border border-white dark:border-slate-900" title="Telegram Active"></span>
                          ) : isSelected && presence.isCustomerOnline ? (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900 animate-pulse" title="Online"></span>
                          ) : null}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                          {c.customer?.name || 'Anonymous Visitor'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                        {new Date(c.updatedAt || c.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2 block max-w-full">
                      {lastMsg ? lastMsg.content : 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between gap-1">
                      {getStatusBadge(c.status)}

                      {/* 1-Click Action Buttons: ⚡ Takeover | 🤖 Hand back | ✅ Resolve */}
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                        {c.status !== 'HUMAN_ACTIVE' && c.status !== 'RESOLVED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              takeoverMutation.mutate(c.id);
                            }}
                            title={t('action.takeover')}
                            className="p-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors text-[10px] font-bold"
                          >
                            ⚡
                          </button>
                        )}

                        {c.status === 'HUMAN_ACTIVE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handbackMutation.mutate(c.id);
                            }}
                            title={t('action.handback')}
                            className="p-1 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 hover:bg-sky-200 transition-colors text-[10px] font-bold"
                          >
                            🤖
                          </button>
                        )}

                        {c.status !== 'RESOLVED' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveMutation.mutate(c.id);
                            }}
                            title={t('action.resolve')}
                            className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors text-[10px] font-bold"
                          >
                            ✅
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              reopenMutation.mutate(c.id);
                            }}
                            title={t('action.reopen')}
                            className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors text-[10px]"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: Active Chat Timeline (Flexible Width) */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-full overflow-hidden transition-colors">
          {currentConv ? (
            <>
              {/* Header with Prominent Easy Actions */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0 text-sm">
                    {(currentConv.customer?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">
                        {currentConv.customer?.name || 'Customer'}
                      </h2>
                      {getChannelBadge(currentConv.channel)}
                      {currentConv.channel === 'TELEGRAM' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                          <span>✈️</span> Telegram Contact
                        </span>
                      ) : presence.isCustomerOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          {t('status.online')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                          {t('status.offline')}
                        </span>
                      )}
                      {getSentiment(currentConv) && (
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                            getSentiment(currentConv)?.badgeClass
                          }`}
                        >
                          {getSentiment(currentConv)?.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {currentConv.customer?.email ||
                        (currentConv.customer?.telegramChatId
                          ? `Chat ID: ${currentConv.customer.telegramChatId}`
                          : 'Web Visitor')}
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {currentConv.status !== 'HUMAN_ACTIVE' && currentConv.status !== 'RESOLVED' && (
                    <button
                      onClick={() => takeoverMutation.mutate(currentConv.id)}
                      disabled={takeoverMutation.isPending}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>{t('action.takeover')}</span>
                    </button>
                  )}

                  {currentConv.status === 'HUMAN_ACTIVE' && (
                    <button
                      onClick={() => handbackMutation.mutate(currentConv.id)}
                      disabled={handbackMutation.isPending}
                      className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>{t('action.handback')}</span>
                    </button>
                  )}

                  {currentConv.status !== 'RESOLVED' ? (
                    <button
                      onClick={() => resolveMutation.mutate(currentConv.id)}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{t('action.resolve')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => reopenMutation.mutate(currentConv.id)}
                      disabled={reopenMutation.isPending}
                      className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>{t('action.reopen')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => exportTranscript(currentConv)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={t('action.export')}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Message Timeline */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40 dark:bg-slate-950/40 min-h-0 transition-colors">
                {isDetailLoading ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    Loading messages...
                  </div>
                ) : currentConv.messages?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    No messages in this conversation.
                  </div>
                ) : (
                  currentConv.messages?.map((m: any) => {
                    const isInternal = m.isInternalNote;
                    const isCustomer = m.senderType === 'CUSTOMER';
                    const isAi = m.senderType === 'AI';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${
                          isInternal ? 'items-center my-2' : isCustomer ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                            isInternal
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 w-full max-w-lg rounded-xl shadow-2xs'
                              : isCustomer
                              ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-2xs'
                              : isAi
                              ? 'bg-sky-600 dark:bg-sky-700 text-white rounded-br-sm shadow-2xs'
                              : 'bg-indigo-600 dark:bg-indigo-700 text-white rounded-br-sm shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs opacity-85 mb-1.5 font-semibold">
                            {isAi ? (
                              <Bot className="h-3.5 w-3.5" />
                            ) : isInternal ? (
                              <Layers className="h-3.5 w-3.5" />
                            ) : (
                              <User className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {isInternal
                                ? t('action.internal_note')
                                : isAi
                                ? 'AI Support Assistant'
                                : isCustomer
                                ? currentConv.customer?.name || 'Customer'
                                : 'Human Agent'}
                            </span>
                          </div>
                          <MarkdownMessage content={m.content} isUser={!isCustomer && !isInternal} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {!isCustomer && !isInternal && (
                            <span
                              className={`flex items-center gap-0.5 text-xs ${
                                m.deliveryStatus === 'DELIVERED' || currentConv.channel === 'TELEGRAM'
                                  ? 'text-sky-500 dark:text-sky-400 font-semibold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                              title={
                                m.deliveryStatus === 'DELIVERED' || currentConv.channel === 'TELEGRAM'
                                  ? t('status.delivered')
                                  : t('status.sent')
                              }
                            >
                              {m.deliveryStatus === 'DELIVERED' || currentConv.channel === 'TELEGRAM' ? (
                                <span className="tracking-tighter font-bold">✓✓</span>
                              ) : (
                                <span className="font-bold">✓</span>
                              )}
                              <span className="text-[10px] ml-0.5 font-medium">
                                {m.deliveryStatus === 'DELIVERED' || currentConv.channel === 'TELEGRAM'
                                  ? t('status.delivered')
                                  : t('status.sent')}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Real-Time Typing Indicator Bubble */}
                {customerTyping && (
                  <div className="flex items-center gap-2 p-2.5 px-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 w-fit shadow-xs animate-in fade-in duration-200">
                    <div className="flex gap-1 items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce"></span>
                    </div>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {typingSender ? `${typingSender} ${t('status.typing')}` : t('status.customer_typing')}
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Canned Quick Replies */}
              <div className="px-3 pt-2.5 pb-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
                <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs shrink-0">
                  {language === 'km' ? 'ចម្លើយរហ័ស:' : 'Quick Replies:'}
                </span>
                {cannedResponses.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setMessageInput(r.text)}
                    className="whitespace-nowrap px-3 py-1 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors shadow-2xs"
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span className={isInternalNote ? 'font-bold text-amber-700 dark:text-amber-400' : ''}>
                      {t('action.internal_note')}
                    </span>
                  </label>
                  {currentConv.channel === 'TELEGRAM' && !isInternalNote && (
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                      <span>✈️</span> Will forward to customer Telegram app
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={messageInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessageMutation.mutate();
                      }
                    }}
                    placeholder={isInternalNote ? t('action.note_placeholder') : t('action.input_placeholder')}
                    className={`flex-1 border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${
                      isInternalNote
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 focus:ring-amber-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-sky-500'
                    }`}
                  />
                  <button
                    onClick={() => sendMessageMutation.mutate()}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    className={`px-4 rounded-lg font-semibold text-sm text-white transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 ${
                      isInternalNote
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    <span>{t('action.send')}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-2">
              <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">{t('action.no_conversations')}</p>
            </div>
          )}
        </div>

        {/* COLUMN 3: CRM Contact & Attributes Sidebar (Fixed 280px width) */}
        {currentConv && (
          <div className="w-[280px] min-w-[280px] max-w-[280px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col shrink-0 h-full overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
            {/* Contact Card */}
            <div className="p-4 text-center space-y-2 shrink-0">
              <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg flex items-center justify-center mx-auto shadow-inner">
                {(currentConv.customer?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                  {currentConv.customer?.name || 'Anonymous Visitor'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentConv.customer?.email || 'No email registered'}
                </p>
              </div>
              <div className="pt-1 flex justify-center">{getChannelBadge(currentConv.channel)}</div>
            </div>

            {/* Conversation Attributes */}
            <div className="p-4 space-y-3 text-xs shrink-0">
              <h4 className="font-bold uppercase tracking-wider text-xs text-slate-400 dark:text-slate-500">
                {t('crm.details')}
              </h4>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">{t('crm.status')}</span>
                  {getStatusBadge(currentConv.status)}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">{t('crm.channel')}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{currentConv.channel}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Presence</span>
                  {currentConv.channel === 'TELEGRAM' ? (
                    <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                      <span>✈️</span> Telegram App
                    </span>
                  ) : presence.isCustomerOnline ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {t('status.online')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                      {t('status.offline')}
                    </span>
                  )}
                </div>

                {currentConv.customer?.telegramChatId && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">{t('crm.telegram_chat_id')}</span>
                    <span className="font-mono text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 text-xs">
                      {currentConv.customer.telegramChatId}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">{t('crm.created_at')}</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {new Date(currentConv.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">{t('crm.conv_id')}</span>
                  <button
                    onClick={() => handleCopyId(currentConv.id)}
                    className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 font-mono"
                    title={t('action.copy_id')}
                  >
                    <span>{currentConv.id.substring(0, 8)}...</span>
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Support Tickets */}
            <div className="p-4 space-y-3 text-xs flex-1">
              <div className="flex justify-between items-center">
                <h4 className="font-bold uppercase tracking-wider text-xs text-slate-400 dark:text-slate-500">
                  {t('crm.tickets')}
                </h4>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentConv.tickets?.length || 0} Open
                </span>
              </div>

              {currentConv.tickets && currentConv.tickets.length > 0 ? (
                <div className="space-y-2">
                  {currentConv.tickets.map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[160px]">
                          {ticket.title}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ticket #{ticket.id.substring(0, 6)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 text-xs italic">{t('crm.no_tickets')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
