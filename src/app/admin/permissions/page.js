'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PERMISSIONS } from '@/lib/constants';

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/roles').then(r => {
        if (r.status === 403) { router.push('/dashboard'); return null; }
        return r.json();
      }),
      fetch('/api/admin/permissions').then(r => {
        if (r.status === 403) { router.push('/dashboard'); return null; }
        return r.json();
      }),
    ]).then(([rolesData, permData]) => {
      if (rolesData) setRoles(rolesData.roles || []);
      if (permData) setPermissions(permData.permissions || []);
    }).catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, [router]);

  const togglePermission = async (roleValue, permKey, currentlyHas) => {
    const role = roles.find(r => r.value === roleValue);
    if (!role || role.isAdmin) {
      setMessage({ type: 'warning', text: 'Admin role permissions are managed via the ALL wildcard and cannot be toggled individually.' });
      return;
    }

    const newPermissions = currentlyHas
      ? role.permissions.filter(p => p !== permKey)
      : [...role.permissions, permKey];

    setSaving(s => ({ ...s, [`${roleValue}-${permKey}`]: true }));
    setMessage(null);

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleValue, permissions: newPermissions }),
      });
      if (res.ok) {
        setRoles(roles.map(r => r.value === roleValue ? { ...r, permissions: newPermissions } : r));
        setMessage({ type: 'success', text: `${role.name} permission updated` });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(s => ({ ...s, [`${roleValue}-${permKey}`]: false }));
    }
  };

  // Group permissions by their group field
  const grouped = permissions.reduce((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="text-center text-slate-400">Loading permissions...</div>
      </div>
    );
  }

  const nonAdminRoles = roles.filter(r => !r.isAdmin);

  return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Permission Management
            </h1>
            <p className="text-slate-400 mt-2">
              Toggle permissions on/off for each role. Changes take effect immediately.
            </p>
          </header>

          {message && (
            <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              message.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {nonAdminRoles.map(role => (
              <div key={role.value} className="glass rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-white/5 px-5 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold">{role.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-3">
                    {role.permissions.length} permissions assigned
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Permission Grid by Category */}
          {Object.entries(grouped).map(([group, perms]) => (
            <div key={group} className="mb-8 glass rounded-xl border border-white/10 overflow-hidden">
              <div className="bg-white/5 px-5 py-3 border-b border-white/10">
                <h3 className="text-md font-medium text-slate-300">{group}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-3 font-medium">Permission</th>
                      {nonAdminRoles.map(role => (
                        <th key={role.value} className="p-3 font-medium text-center">{role.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {perms.map(perm => (
                      <tr key={perm.key} className="hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="text-sm font-medium">{perm.name}</div>
                          <div className="text-xs text-slate-500">{perm.description}</div>
                          <code className="text-xs text-slate-600 font-mono mt-0.5 block">{perm.key}</code>
                        </td>
                        {nonAdminRoles.map(role => {
                          const has = role.permissions.includes(perm.key);
                          const savingKey = `${role.value}-${perm.key}`;
                          const isSaving = saving[savingKey];
                          return (
                            <td key={role.value} className="p-3 text-center">
                              <button
                                onClick={() => togglePermission(role.value, perm.key, has)}
                                disabled={isSaving}
                                className={`w-8 h-8 rounded-md transition-all duration-200 flex items-center justify-center mx-auto ${
                                  isSaving ? 'opacity-50 cursor-wait' :
                                  has
                                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                                    : 'bg-white/5 text-slate-600 hover:bg-white/10 border border-white/10'
                                }`}
                                title={has ? `Remove from ${role.name}` : `Add to ${role.name}`}
                              >
                                {isSaving ? (
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : has ? '✓' : '—'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Admin Info */}
          <div className="glass rounded-xl border border-white/10 p-5 bg-white/5">
            <h3 className="text-md font-medium text-slate-300 mb-2">Admin Role</h3>
            <p className="text-sm text-slate-400">
              The ADMIN role uses the <code className="text-blue-400 bg-blue-500/10 px-1 rounded">ALL</code> wildcard — it has every permission.
              Admin permissions cannot be toggled individually.
            </p>
          </div>
        </div>
      </div>
  );
}
