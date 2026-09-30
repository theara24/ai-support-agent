'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building,
  RefreshCw,
  Copy,
  Check,
  Radio,
  Lock,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { getSocket } from '@/lib/socket';

interface StoredUser {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  organizationName?: string;
}

export default function SettingsPage() {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'session'>('profile');

  const [user, setUser] = useState<StoredUser | null>(null);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Feedback states
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setProfileForm({
            firstName: parsed.firstName || parsed.name?.split(' ')[0] || '',
            lastName: parsed.lastName || parsed.name?.split(' ').slice(1).join(' ') || '',
            email: parsed.email || '',
          });
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    const socket = getSocket();
    setIsSocketConnected(socket.connected);

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Fetch live profile details from API
  const { refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/v1/users/profile');
        if (res.data) {
          const u = res.data;
          setProfileForm({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
          });
          setUser((prev) => ({
            ...prev,
            ...u,
            organizationName: u.organization?.name || prev?.organizationName,
          }));
        }
        return res.data;
      } catch {
        return null;
      }
    },
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { firstName: string; lastName: string; email: string }) => {
      const res = await apiFetch('/api/v1/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    onSuccess: (updated) => {
      setProfileFeedback({
        type: 'success',
        text: 'Profile updated successfully!',
      });

      // Update localStorage so sidebar immediately reflects new name
      const updatedUser: StoredUser = {
        ...user,
        firstName: updated.firstName,
        lastName: updated.lastName,
        name: `${updated.firstName || ''} ${updated.lastName || ''}`.trim(),
        email: updated.email,
      };
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    },
    onError: (err: any) => {
      setProfileFeedback({
        type: 'error',
        text: err.message || 'Failed to update profile.',
      });
    },
  });

  // Password Change Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const res = await apiFetch('/api/v1/users/change-password', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    onSuccess: () => {
      setSecurityFeedback({
        type: 'success',
        text: 'Your password has been changed securely!',
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (err: any) => {
      setSecurityFeedback({
        type: 'error',
        text: err.message || 'Failed to change password. Please verify current password.',
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityFeedback({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setSecurityFeedback({
        type: 'error',
        text: 'New password must be at least 8 characters.',
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayName = `${profileForm.firstName} ${profileForm.lastName}`.trim() || user?.name || user?.email || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isTenantAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Account & Profile Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details, credentials, and active workspace preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile Information</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'security'
              ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Password & Security</span>
        </button>

        <button
          onClick={() => setActiveTab('session')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'session'
              ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>Session & Diagnostics</span>
        </button>
      </div>

      {/* Tab Content: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="h-16 w-16 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-extrabold text-xl flex items-center justify-center border border-sky-200 dark:border-sky-800 shadow-2xs">
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {user?.email}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {isSuperAdmin ? '👑 Super Admin' : isTenantAdmin ? '🏢 Tenant Admin' : '🎧 Support Agent'}
                </span>
              </div>
            </div>
          </div>

          {profileFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-150 ${
                profileFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {profileFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              )}
              <span>{profileFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This email is used for logging into your AI Support Agent dashboard.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: Security */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lock className="h-4 w-4 text-sky-500" />
              Change Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ensure your account is protected with a strong, distinct password.
            </p>
          </div>

          {securityFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-150 ${
                securityFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {securityFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              )}
              <span>{securityFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter existing password"
                  className="w-full px-3.5 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                minLength={8}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: Session & Diagnostics */}
      {activeTab === 'session' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Session & Diagnostics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Technical details regarding your active connection and tenant tenancy.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">WebSocket Live Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isSocketConnected ? 'Connected & Subscribed (Real-Time)' : 'Reconnecting...'}
                  </span>
                </div>
              </div>
            </div>

            {user?.id && (
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">User ID</span>
                  <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {user.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(user.id || '', 'userId')}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  {copiedId === 'userId' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}

            {user?.organizationId && (
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Organization / Tenant ID</span>
                  <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {user.organizationId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(user.organizationId || '', 'orgId')}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                  {copiedId === 'orgId' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
