'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Language = 'en' | 'km';
export type Theme = 'light' | 'dark';

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  channel?: string;
  onClick?: () => void;
}

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  soundEnabled: boolean;
  toggleSound: () => void;
  playChime: () => void;
  playAlertChime: () => void;
  desktopNotificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<boolean>;
  showNotification: (title: string, body: string, channel?: string, onClick?: () => void) => void;
  toasts: ToastNotification[];
  removeToast: (id: string) => void;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.conversations': 'Conversations',
    'nav.tickets': 'Tickets',
    'nav.knowledge_base': 'Knowledge Base',
    'nav.analytics': 'Analytics',
    'nav.chat_widget': 'Chat Widget',
    'nav.logout': 'Sign Out',

    // Headers & General
    'app.title': 'Omnichannel Helpdesk & Conversations',
    'app.subtitle': 'Unified inbox managing customer conversations across Web Widget & Telegram channels.',
    'app.refresh': 'Refresh conversations',
    'app.dark_mode': 'Dark Mode',
    'app.light_mode': 'Light Mode',
    'app.sound_on': 'Audio Alert On',
    'app.sound_off': 'Audio Alert Off',
    'app.enable_notifications': 'Enable Desktop Notifications',
    'app.notifications_enabled': 'Notifications Active',

    // Channels
    'channel.all': 'All',
    'channel.web': 'Web',
    'channel.telegram': 'Telegram',

    // Statuses
    'status.all': 'All Statuses',
    'status.ai_active': 'AI Active',
    'status.waiting_for_agent': 'Waiting for Agent',
    'status.human_active': 'Agent Active',
    'status.resolved': 'Resolved',
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.sent': 'Sent',
    'status.delivered': 'Delivered',
    'status.customer_typing': 'Customer is typing...',
    'status.agent_typing': 'Agent is typing...',
    'status.ai_typing': 'AI Assistant is thinking...',

    // Sentiment
    'sentiment.positive': '😊 Positive',
    'sentiment.neutral': '😐 Neutral',
    'sentiment.frustrated': '⚠️ Needs Attention',

    // Actions
    'action.takeover': '⚡ Takeover from AI',
    'action.handback': '🤖 Return to AI',
    'action.resolve': '✅ Mark as Resolved',
    'action.reopen': '🔄 Reopen Conversation',
    'action.export': '📥 Export Transcript',
    'action.send': 'Send',
    'action.copied': 'Copied!',
    'action.copy_id': 'Copy ID',
    'action.search_placeholder': 'Search customer or Chat ID...',
    'action.no_conversations': 'No conversations found.',
    'action.internal_note': 'Send as Private Internal Note',
    'action.input_placeholder': 'Type response to customer...',
    'action.note_placeholder': 'Type internal note (only visible to team)...',

    // Canned Replies
    'canned.greeting': '👋 Greeting',
    'canned.order': '📦 Order Check',
    'canned.refund': '🔄 Refund Policy',
    'canned.checking': '⏳ Checking Records',
    'canned.resolved': '✅ Issue Resolved',

    // CRM Sidebar
    'crm.customer_profile': 'CUSTOMER PROFILE',
    'crm.details': 'CONVERSATION DETAILS',
    'crm.channel': 'Channel',
    'crm.status': 'Status',
    'crm.telegram_chat_id': 'Telegram Chat ID',
    'crm.created_at': 'Created At',
    'crm.conv_id': 'Conversation ID',
    'crm.tickets': 'SUPPORT TICKETS',
    'crm.no_tickets': 'No active support tickets.',
    'crm.new_ticket': '+ Create Ticket',

    // Toasts & SLA Alerts
    'toast.new_message': 'New Customer Message',
    'toast.escalated': '🚨 Human Agent Needed',
    'alert.waiting_reminder_title': '⚠️ Action Required: Waiting Customers',
    'alert.waiting_reminder_body': 'customer(s) waiting for human assistance without response!',
    'alert.waiting_banner': 'customer(s) waiting for an agent!',
    'alert.accept_now': 'Review & Accept Now',
  },
  km: {
    // Nav
    'nav.dashboard': 'ផ្ទាំងគ្រប់គ្រង',
    'nav.conversations': 'ការសន្ទនា',
    'nav.tickets': 'សំបុត្រជំនួយ',
    'nav.knowledge_base': 'មូលដ្ឋានចំណេះដឹង',
    'nav.analytics': 'ការវិភាគ & ស្ថិតិ',
    'nav.chat_widget': 'ធាតុក្រាហ្វិកជជែក',
    'nav.logout': 'ចាកចេញ',

    // Headers & General
    'app.title': 'មជ្ឈមណ្ឌលជំនួយ & ការសន្ទនាគ្រប់បណ្តាញ',
    'app.subtitle': 'ប្រអប់សាររួមបញ្ចូលគ្នា គ្រប់គ្រងការសន្ទនាអតិថិជនពី Web Widget និង Telegram។',
    'app.refresh': 'ផ្ទុកទិន្នន័យឡើងវិញ',
    'app.dark_mode': 'ទម្រង់ងងឹត',
    'app.light_mode': 'ទម្រង់ពន្លឺ',
    'app.sound_on': 'បើកសំឡេងរោទ៍',
    'app.sound_off': 'បិទសំឡេងរោទ៍',
    'app.enable_notifications': 'បើកការជូនដំណឹងលើកុំព្យូទ័រ',
    'app.notifications_enabled': 'ការជូនដំណឹងកំពុងដំណើរការ',

    // Channels
    'channel.all': 'ទាំងអស់',
    'channel.web': 'គេហទំព័រ',
    'channel.telegram': 'តេឡេក្រាម',

    // Statuses
    'status.all': 'គ្រប់ស្ថានភាព',
    'status.ai_active': 'AI កំពុងឆ្លើយ',
    'status.waiting_for_agent': 'រង់ចាំភ្នាក់ងារ',
    'status.human_active': 'ភ្នាក់ងារកំពុងឆ្លើយ',
    'status.resolved': 'បានដោះស្រាយ',
    'status.online': 'អនឡាញ (Online)',
    'status.offline': 'អហ្វឡាញ (Offline)',
    'status.sent': 'បានផ្ញើ (Sent)',
    'status.delivered': 'បានទៅដល់ (Delivered)',
    'status.customer_typing': 'អតិថិជនកំពុងវាយអក្សរ...',
    'status.agent_typing': 'ភ្នាក់ងារកំពុងវាយអក្សរ...',
    'status.ai_typing': 'AI កំពុងរៀបចំចម្លើយ...',

    // Sentiment
    'sentiment.positive': '😊 សប្បាយចិត្ត',
    'sentiment.neutral': '😐 ធម្មតា',
    'sentiment.frustrated': '⚠️ ត្រូវការជំនួយបន្ទាន់',

    // Actions
    'action.takeover': '⚡ គ្រប់គ្រងជំនួស AI',
    'action.handback': '🤖 ប្រគល់ទៅ AI វិញ',
    'action.resolve': '✅ ដោះស្រាយរួចរាល់',
    'action.reopen': '🔄 បើកការសន្ទនាឡើងវិញ',
    'action.export': '📥 ទាញយកកំណត់ត្រា',
    'action.send': 'ផ្ញើសារ',
    'action.copied': 'បានចម្លង!',
    'action.copy_id': 'ចម្លងលេខកូដ',
    'action.search_placeholder': 'ស្វែងរកឈ្មោះអតិថិជន ឬ Chat ID...',
    'action.no_conversations': 'រកមិនឃើញការសន្ទនាឡើយ។',
    'action.internal_note': 'ផ្ញើជាកំណត់សម្គាល់ផ្ទៃក្នុង (អតិថិជនមើលមិនឃើញ)',
    'action.input_placeholder': 'វាយបញ្ចូលចម្លើយទៅកាន់អតិថិជន...',
    'action.note_placeholder': 'វាយកំណត់សម្គាល់ផ្ទៃក្នុងសម្រាប់ក្រុមការងារ...',

    // Canned Replies
    'canned.greeting': '👋 ស្វាគមន៍',
    'canned.order': '📦 ពិនិត្យការបញ្ជាទិញ',
    'canned.refund': '🔄 គោលការណ៍បង្វិលប្រាក់',
    'canned.checking': '⏳ កំពុងពិនិត្យទិន្នន័យ',
    'canned.resolved': '✅ បញ្ហាបានដោះស្រាយ',

    // CRM Sidebar
    'crm.customer_profile': 'ប្រវត្តិអតិថិជន',
    'crm.details': 'ព័ត៌មានលម្អិតការសន្ទនា',
    'crm.channel': 'បណ្តាញទំនាក់ទំនង',
    'crm.status': 'ស្ថានភាព',
    'crm.telegram_chat_id': 'Telegram Chat ID',
    'crm.created_at': 'កាលបរិច្ឆេទបង្កើត',
    'crm.conv_id': 'លេខសម្គាល់ការសន្ទនា',
    'crm.tickets': 'សំបុត្រជំនួយ (TICKETS)',
    'crm.no_tickets': 'គ្មានសំបុត្រជំនួយសកម្មឡើយ។',
    'crm.new_ticket': '+ បង្កើតសំបុត្រថ្មី',

    // Toasts & SLA Alerts
    'toast.new_message': 'មានសារថ្មីពីអតិថិជន',
    'toast.escalated': '🚨 អតិថិជនស្នើសុំជួបភ្នាក់ងារផ្ទាល់',
    'alert.waiting_reminder_title': '⚠️ ត្រូវការការឆ្លើយតប៖ អតិថិជនកំពុងរង់ចាំ',
    'alert.waiting_reminder_body': 'នាក់កំពុងរង់ចាំភ្នាក់ងារឆ្លើយតប!',
    'alert.waiting_banner': 'នាក់កំពុងរង់ចាំភ្នាក់ងារឆ្លើយតប (សូមជួយទទួលបន្ទាន់)',
    'alert.accept_now': 'ចូលពិនិត្យ និងទទួលឆ្លើយភ្លាមៗ',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguageState] = useState<Language>('en');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = (localStorage.getItem('app_theme') as Theme) || 'light';
      setTheme(storedTheme);
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      const storedLang = (localStorage.getItem('app_lang') as Language) || 'en';
      setLanguageState(storedLang);
      document.documentElement.lang = storedLang;

      const storedSound = localStorage.getItem('app_sound');
      if (storedSound !== null) {
        setSoundEnabled(storedSound === 'true');
      }

      if ('Notification' in window) {
        setDesktopNotificationsEnabled(Notification.permission === 'granted');
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('app_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'km' : 'en';
      localStorage.setItem('app_lang', next);
      if (typeof window !== 'undefined') {
        document.documentElement.lang = next;
      }
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('app_sound', String(next));
      return next;
    });
  }, []);

  // Web Audio API Synth Chime (Two-tone pleasant doorbell chime)
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Tone 1: 587.33Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      // Tone 2: 880Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.55);
    } catch (e) {
      // Audio autoplay policy may block before first interaction
    }
  }, [soundEnabled]);

  // Urgent SLA Escalation Reminder Chime (Double warning pulse)
  const playAlertChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Pulse 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(493.88, ctx.currentTime); // B4
      osc1.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.22); // E4
      gain1.gain.setValueAtTime(0.28, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.22);

      // Pulse 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(493.88, ctx.currentTime + 0.25);
      osc2.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.48);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.48);
    } catch {
      // Audio policy
    }
  }, [soundEnabled]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setDesktopNotificationsEnabled(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showNotification = useCallback(
    (title: string, body: string, channel?: string, onClick?: () => void) => {
      // 1. Play chime
      playChime();

      // 2. In-App Toast
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [{ id, title, body, channel, onClick }, ...prev.slice(0, 3)]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);

      // 3. Desktop Native Push Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(title, {
            body,
            icon: '/icon.png',
            tag: id,
          });
          if (onClick) {
            notif.onclick = () => {
              window.focus();
              onClick();
            };
          }
        } catch (e) {
          console.warn('Native notification failed:', e);
        }
      }
    },
    [playChime],
  );

  const t = useCallback(
    (key: string): string => {
      return translations[language]?.[key] || translations['en']?.[key] || key;
    },
    [language],
  );

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        language,
        setLanguage,
        toggleLanguage,
        t,
        soundEnabled,
        toggleSound,
        playChime,
        playAlertChime,
        desktopNotificationsEnabled,
        requestNotificationPermission,
        showNotification,
        toasts,
        removeToast,
      }}
    >
      {children}

      {/* Floating In-App Toast Alerts (Top-Right) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.onClick) toast.onClick();
              removeToast(toast.id);
            }}
            className="pointer-events-auto p-3.5 bg-white dark:bg-slate-800 border-l-4 border-sky-500 shadow-xl rounded-r-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-all animate-in slide-in-from-right duration-200"
          >
            <div className="text-xl shrink-0">
              {toast.channel === 'TELEGRAM' ? '✈️' : '💬'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {toast.title}
                </p>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold uppercase">
                  {toast.channel || 'New'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                {toast.body}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
