'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROLES, PLANS } from '@/lib/constants';
import { useToast } from '@/components/common/ToastProvider';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: parseInt(newRole) }),
      });

      if (res.ok) {
        toast.success('Role updated.');
        fetchUsers();
      } else {
        toast.error('Failed to update role');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating role');
    }
  };

  const handleResetUsage = async (userId) => {
    if (!confirm('Are you sure you want to reset usage for this user?')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-usage`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Usage reset.');
        fetchUsers();
      } else {
        toast.error('Failed to reset usage');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error resetting usage');
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to permanently delete user ${userEmail}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(`Deleted ${userEmail}.`);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting user');
    }
  };

  if (loading) return <div className="p-16 text-center text-slate-400 text-sm">Loading users...</div>;
  if (error) return <div className="p-16 text-center text-rose-400 text-sm">Error: {error}</div>;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Admin Console</h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  Privileged
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Manage user accounts, privileges, and quotas</p>
            </div>
            <button onClick={fetchUsers} className="btn-secondary text-xs font-semibold px-4 py-2 rounded-xl">
              Refresh Directory
            </button>
          </div>

          <nav className="flex gap-2 mt-6 border-b border-white/[0.08] pb-3">
            <Link
              href="/admin/dashboard"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
            >
              Users Directory
            </Link>
            <Link
              href="/admin/permissions"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Role Matrix
            </Link>
          </nav>
        </header>

        <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-slate-400 uppercase tracking-wider text-[11px] border-b border-white/[0.06]">
                <tr>
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Credits</th>
                  <th className="p-4 font-semibold">Plan</th>
                  <th className="p-4 font-semibold">Joined</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">{user.name || 'Anonymous'}</div>
                      <div className="text-slate-400 text-[11px]">{user.email}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{user._id}</div>
                    </td>
                    <td className="p-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className="bg-slate-900/80 border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {Object.entries(ROLES).map(([key, value]) => (
                          <option key={key} value={value}>{key} ({value})</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`font-mono font-semibold ${user.creditsUsed >= (user.role === ROLES.SUBSCRIBER ? PLANS.PRO.credits : PLANS.FREE.credits) ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {user.creditsUsed || 0} / {user.role === ROLES.ADMIN ? '∞' : (user.role === ROLES.SUBSCRIBER ? PLANS.PRO.credits : PLANS.FREE.credits)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                        {user.plan?.name || 'Free'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleResetUsage(user._id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors"
                        >
                          Reset Usage
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id, user.email)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
