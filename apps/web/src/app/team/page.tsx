'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Headphones,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Building,
  Radio,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { getSocket } from '@/lib/socket';

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER';
  organizationId?: string;
  createdAt: string;
  isOnline?: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function TeamPage() {
  const { t } = useApp();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    email?: string;
    role?: string;
    organizationId?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPPORT_AGENT' | 'ADMIN' | 'ONLINE'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  // Form states for creating agent
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'SUPPORT_AGENT',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load current user from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load user:', e);
      }
    }
  }, []);

  // Fetch Team Members
  const {
    data: members = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/users');
      return res.data || [];
    },
  });

  // Real-time presence and team member updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const handlePresenceGlobal = (payload: { onlineUserIds: string[] }) => {
      if (payload?.onlineUserIds) {
        const onlineSet = new Set(payload.onlineUserIds);
        queryClient.setQueryData<TeamMember[]>(['team-members'], (old) => {
          if (!old) return old;
          return old.map((m) => ({
            ...m,
            isOnline: onlineSet.has(m.id),
          }));
        });
      }
    };

    const handleMemberCreated = (newMember: TeamMember) => {
      queryClient.setQueryData<TeamMember[]>(['team-members'], (old) => {
        if (!old) return [newMember];
        if (old.some((m) => m.id === newMember.id)) return old;
        return [newMember, ...old];
      });
      setFeedbackMsg({
        type: 'success',
        text: `New member ${newMember.firstName || ''} (${newMember.email}) joined the team!`,
      });
    };

    const handleMemberDeleted = (payload: { userId: string }) => {
      queryClient.setQueryData<TeamMember[]>(['team-members'], (old) => {
        if (!old) return old;
        return old.filter((m) => m.id !== payload.userId);
      });
    };

    const handleMemberUpdated = (updated: TeamMember) => {
      queryClient.setQueryData<TeamMember[]>(['team-members'], (old) => {
        if (!old) return old;
        return old.map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
      });
    };

    socket.on('presence:global', handlePresenceGlobal);
    socket.on('team:member_created', handleMemberCreated);
    socket.on('team:member_deleted', handleMemberDeleted);
    socket.on('team:member_updated', handleMemberUpdated);

    // Request initial presence
    socket.emit('presence:global:query', {}, (data: any) => {
      if (data?.onlineUserIds) {
        handlePresenceGlobal(data);
      }
    });

    return () => {
      socket.off('presence:global', handlePresenceGlobal);
      socket.off('team:member_created', handleMemberCreated);
      socket.off('team:member_deleted', handleMemberDeleted);
      socket.off('team:member_updated', handleMemberUpdated);
    };
  }, [queryClient]);

  // Create Agent Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setIsAddModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'SUPPORT_AGENT',
      });
      setFormError(null);
      setFeedbackMsg({
        type: 'success',
        text: `Agent account ${data.email} successfully created!`,
      });
      refetch();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create agent');
    },
  });

  // Delete Agent Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/v1/users/${id}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    onSuccess: () => {
      setMemberToDelete(null);
      setFeedbackMsg({
        type: 'success',
        text: 'Team member removed successfully.',
      });
      refetch();
    },
    onError: (err: any) => {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to delete team member.',
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    createMutation.mutate(formData);
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (roleFilter === 'ONLINE') return !!m.isOnline;
    if (roleFilter === 'SUPPORT_AGENT') return m.role === 'SUPPORT_AGENT';
    if (roleFilter === 'ADMIN') return m.role === 'ADMIN' || m.role === 'SUPER_ADMIN';

    return true;
  });

  const totalMembers = members.length;
  const onlineMembersCount = members.filter((m) => m.isOnline).length;
  const agentCount = members.filter((m) => m.role === 'SUPPORT_AGENT').length;
  const adminCount = members.filter((m) => m.role === 'ADMIN' || m.role === 'SUPER_ADMIN').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-500" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Team & Human Agents
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
              Live Presence Active
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your customer support team, provision human agent accounts, and monitor live online availability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh team members"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin text-sky-500' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Support Agent</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Members</span>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {isLoading ? '—' : totalMembers}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Workspace team</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-950/80 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Online Right Now
            </span>
            <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-2">
            {isLoading ? '—' : onlineMembersCount}
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Real-time socket presence</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Support Agents</span>
            <Headphones className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {isLoading ? '—' : agentCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Customer responders</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Administrators</span>
            <Shield className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {isLoading ? '—' : adminCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Full control access</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team member by name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              roleFilter === 'ALL'
                ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Members ({totalMembers})
          </button>
          <button
            onClick={() => setRoleFilter('ONLINE')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              roleFilter === 'ONLINE'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online ({onlineMembersCount})
          </button>
          <button
            onClick={() => setRoleFilter('SUPPORT_AGENT')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              roleFilter === 'SUPPORT_AGENT'
                ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Agents ({agentCount})
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              roleFilter === 'ADMIN'
                ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Admins ({adminCount})
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Live Status</th>
                <th className="py-3 px-4">Workspace</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-sky-500" />
                    Loading team members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No members found</p>
                    <p className="text-[11px] mt-0.5">Try searching with a different keyword or create an agent.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Support Member';
                  const initials = fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'AG';
                  const isCurrent = member.id === currentUser?.id;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                              {initials}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                member.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                              title={member.isOnline ? 'Online now' : 'Offline'}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{fullName}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        {member.role === 'SUPER_ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            👑 Super Admin
                          </span>
                        ) : member.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            🏢 Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                            🎧 Support Agent
                          </span>
                        )}
                      </td>

                      {/* Live Status */}
                      <td className="py-3 px-4">
                        {member.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Workspace / Org */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {member.organization?.name || 'Default Platform'}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {new Date(member.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {!isCurrent && member.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setMemberToDelete(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Remove agent from organization"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Add Team Member</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Provision a new human support agent</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Sothea"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Chan"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@company.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 pr-9 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="SUPPORT_AGENT">Support Agent (Respond to conversations & tickets)</option>
                  <option value="ADMIN">Workspace Admin (Full organization settings & agents management)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Agent'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Remove Team Member?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to remove <strong className="font-semibold text-slate-900 dark:text-slate-100">{memberToDelete.firstName} ({memberToDelete.email})</strong>?
              They will no longer have access to answer customer inquiries.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(memberToDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteMutation.isPending ? 'Removing...' : 'Delete Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
