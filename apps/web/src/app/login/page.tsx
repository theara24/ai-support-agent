'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Lock, Mail, AlertCircle, ArrowRight, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSessionUser, setCurrentSessionUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isLogout = params.get('logout') === 'true' || params.get('switch') === 'true';

      if (isLogout) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setCurrentSessionUser(null);
        return;
      }

      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      if (token && storedUser) {
        try {
          setCurrentSessionUser(JSON.parse(storedUser));
        } catch {}
      }
    }
  }, []);

  const handleForceLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setCurrentSessionUser(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const fillCredentials = (em: string, pass: string) => {
    setEmail(em);
    setPassword(pass);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data: any = null;

      // 1. Try Next.js serverless route first (handles Vercel + dynamic approved tenants)
      try {
        const localRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        });
        if (localRes.ok) {
          data = await localRes.json();
        }
      } catch (err) {
        console.warn('Next.js auth route bypass:', err);
      }

      // 2. If not fulfilled, attempt backend NestJS API
      if (!data?.success) {
        data = await apiFetch('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        });
      }

      if (!data?.success) {
        throw new Error(data?.error?.message || 'Login failed. Invalid email or password.');
      }

      const { accessToken, refreshToken, user } = data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Use full page reload to ensure all application contexts reinitialize
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err?.message || 'Unable to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-sky-500/20">
            <Bot className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Workspace Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to your AI Assistant dashboard & support console.
          </p>
        </div>

        {/* Existing Active Session Notice */}
        {currentSessionUser && (
          <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-sky-800 dark:text-sky-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Already signed in as:
              </span>
              <button
                type="button"
                onClick={handleForceLogout}
                className="text-rose-500 hover:text-rose-400 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </button>
            </div>
            <p className="font-mono text-slate-700 dark:text-slate-200">
              {currentSessionUser.email} ({currentSessionUser.role})
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Demo Fill Buttons */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            ⚡ Quick-Fill Accounts:
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => fillCredentials('chimtheara93@gmail.com', 'Support@6137!')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-left font-medium transition-colors cursor-pointer"
            >
              <strong className="block text-sky-500 font-bold">Theara Chim (Admin)</strong>
              chimtheara93@gmail.com
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('admin@acme-support.local', 'AdminPass123!')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-left font-medium transition-colors cursor-pointer"
            >
              <strong className="block text-indigo-400 font-bold">Super Admin</strong>
              admin@acme-support.local
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm p-3.5 rounded-xl flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Theara AI Support Platform • Built by Chim Theara (ជឺម ធារ៉ា)
          </p>
        </div>
      </div>
    </div>
  );
}
