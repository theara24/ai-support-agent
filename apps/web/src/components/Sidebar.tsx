'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Ticket,
  BookOpen,
  BarChart3,
  LogOut,
  LayoutDashboard,
  Bot,
  Code2,
  Moon,
  Sun,
  Languages,
  ShieldAlert,
  Users,
  Settings,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { ReportIssueModal } from './ReportIssueModal';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, theme, toggleTheme, language, toggleLanguage } = useApp();
  const [user, setUser] = useState<{
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    organizationName?: string;
  } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isSupportAgent = user?.role === 'SUPPORT_AGENT';
  const isTenantAdmin = user?.role === 'ADMIN';

  const roleDisplay = isSuperAdmin
    ? { label: '👑 Super Admin', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800' }
    : isTenantAdmin
    ? { label: user?.organizationName ? `🏢 ${user.organizationName} Admin` : '🏢 Tenant Admin', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' }
    : { label: '🎧 Support Agent', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800' };

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.conversations'), href: '/conversations', icon: MessageSquare },
    { name: t('nav.tickets'), href: '/tickets', icon: Ticket },
    { name: t('nav.team'), href: '/team', icon: Users, adminOnly: true },
    { name: t('nav.knowledge_base'), href: '/knowledge-base', icon: BookOpen },
    { name: t('nav.analytics'), href: '/analytics', icon: BarChart3 },
    { name: t('nav.chat_widget'), href: '/widget-config', icon: Code2 },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  const visibleNav = navigation.filter((item) => {
    if (item.adminOnly && isSupportAgent) {
      return false;
    }
    if (isSupportAgent) {
      return item.href === '/dashboard' || item.href === '/conversations' || item.href === '/tickets' || item.href === '/settings';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to parse user from localStorage:', e);
      }
    }
  }, []);

  if (pathname === '/login' || pathname.startsWith('/chat') || pathname === '/widget' || pathname.startsWith('/widget/') || pathname === '/') return null;

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiFetch('/api/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => null);
      }
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const displayName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
    user?.email?.split('@')[0] ||
    (isSuperAdmin ? 'Super Admin' : 'Support Agent');
  const displayEmail = user?.email || (isSuperAdmin ? 'admin@theara-ai.support' : 'agent@theara-ai.support');
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 transition-colors">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">AI Support</h1>
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">
              {isSuperAdmin ? 'Platform Control' : 'Tenant Workspace'}
            </span>
          </div>
        </div>

        <nav className="space-y-1">
          {visibleNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold border-l-2 border-sky-500 pl-3'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        {/* Direct Lifeline or Super Admin Banner */}
        {isSuperAdmin ? (
          <div className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Platform Owner</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 font-mono font-bold">ALL ACCESS</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 transition-colors shadow-2xs"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>Report Issue to Super Admin</span>
          </button>
        )}

        {/* Quick Toggles: Language & Dark Theme */}
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            onClick={toggleLanguage}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60 transition-colors"
            title="Toggle Language"
          >
            <Languages className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>{language === 'en' ? '🇰🇭 ខ្មែរ' : '🇺🇸 EN'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60 transition-colors"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 truncate min-w-0 hover:opacity-85 transition-opacity group"
            title="Edit profile in Settings"
          >
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs shrink-0 group-hover:ring-2 ring-sky-500">
              {initials}
            </div>
            <div className="truncate min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">{displayName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{displayEmail}</p>
              <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${roleDisplay.bg}`}>
                {roleDisplay.label}
              </span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors shrink-0"
            title={t('nav.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tenant Issue Reporting Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </aside>
  );
}
