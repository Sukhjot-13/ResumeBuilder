'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, PERMISSIONS, PLANS } from '@/lib/constants';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
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
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: parseInt(newRole) }),
      });
      
      if (res.ok) {
        fetchUsers(); // Refresh list
      } else {
        alert('Failed to update role');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating role');
    }
  };

  const handleResetUsage = async (userId) => {
    if (!confirm('Are you sure you want to reset usage for this user?')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-usage`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchUsers();
      } else {
        alert('Failed to reset usage');
      }
    } catch (err) {
      console.error(err);
      alert('Error resetting usage');
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading users...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Manage users, roles, and subscriptions</p>
          </div>
          <button onClick={fetchUsers} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            Refresh Data
          </button>
        </header>

        <div className="glass rounded-xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Credits</th>
                  <th className="p-4 font-medium">Plan</th>
                  <th className="p-4 font-medium">Joined</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{user.name || 'No Name'}</div>
                      <div className="text-sm text-slate-400">{user.email}</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">{user._id}</div>
                    </td>
                    <td className="p-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                      >
                        {Object.entries(ROLES).map(([key, value]) => (
                          <option key={key} value={value}>{key} ({value})</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono ${user.creditsUsed >= (user.role === ROLES.SUBSCRIBER ? PLANS.PRO.credits : PLANS.FREE.credits) ? 'text-red-400' : 'text-green-400'}`}>
                          {user.creditsUsed || 0} / {user.role === ROLES.ADMIN ? '∞' : (user.role === ROLES.SUBSCRIBER ? PLANS.PRO.credits : PLANS.FREE.credits)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/5">
                        {user.plan?.name || 'Free'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleResetUsage(user._id)}
                          className="px-3 py-1 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded transition-colors"
                        >
                          Reset Usage
                        </button>
                        {/* Add more actions here like Ban/Delete */}
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
