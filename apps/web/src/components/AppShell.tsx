'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlainPage =
    pathname === '/login' ||
    pathname.startsWith('/chat') ||
    pathname === '/widget' ||
    pathname.startsWith('/widget/') ||
    pathname === '/';

  if (pathname === '/') {
    return <AuthGuard><div className="w-full min-h-screen">{children}</div></AuthGuard>;
  }

  if (isPlainPage) {
    return (
      <AuthGuard>
        <div className="min-h-screen w-full overflow-y-auto">{children}</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 p-5 ${
            pathname.startsWith('/conversations') ? 'overflow-hidden' : 'overflow-y-auto'
          } flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors min-w-0`}
        >
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
