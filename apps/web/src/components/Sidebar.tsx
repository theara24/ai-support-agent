'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Ticket,
  BookOpen,
  BarChart3,
  Settings,
  LayoutDashboard,
  Bot,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">AI Support</h1>
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">SaaS Platform</span>
          </div>
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 px-2 py-2 truncate">
          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
            SA
          </div>
          <div className="truncate">
            <p className="text-sm font-semibold text-slate-900 truncate">Support Agent</p>
            <p className="text-xs text-slate-500 truncate">agent@company.com</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition-colors"
          title="Sign out"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
