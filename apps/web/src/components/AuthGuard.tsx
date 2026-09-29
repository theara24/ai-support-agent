'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (
      pathname === '/login' ||
      pathname.startsWith('/chat') ||
      pathname === '/widget' ||
      pathname.startsWith('/widget/') ||
      pathname === '/'
    ) {
      setIsAuthorized(true);
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, router]);

  if (
    !isAuthorized &&
    pathname !== '/login' &&
    !pathname.startsWith('/chat') &&
    pathname !== '/widget' &&
    !pathname.startsWith('/widget/') &&
    pathname !== '/'
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
