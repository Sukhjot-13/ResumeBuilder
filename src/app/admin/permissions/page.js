'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
              <p className="text-xs sm:text-sm text-slate-400">Manage granular permissions across subscriber and user roles</p>
            </div>
          </div>

          <nav className="flex gap-2 mt-6 border-b border-white/[0.08] pb-3">
            <Link
              href="/admin/dashboard"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Users Directory
            </Link>
            <Link
              href="/admin/permissions"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
            >
              Role Matrix
            </Link>
          </nav>
        </header>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-xs font-medium ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
            message.type === 'warning' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
            'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {nonAdminRoles.map(role => (
            <div key={role.value} className="glass-card p-5 rounded-2xl border border-white/[0.08] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white mb-0.5">{role.name}</h2>
                <p className="text-xs text-slate-400">{role.description}</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {role.permissions.length} active
              </span>
            </div>
          ))}
        </div>

        {/* Permission Grid by Category */}
        {Object.entries(grouped).map(([group, perms]) => (
          <div key={group} className="mb-6 glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="bg-white/[0.02] px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{group}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.01] text-slate-400 uppercase tracking-wider text-[11px] border-b border-white/[0.04]">
                  <tr>
                    <th className="p-3.5 font-semibold">Permission</th>
                    {nonAdminRoles.map(role => (
                      <th key={role.value} className="p-3.5 font-semibold text-center">{role.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {perms.map(perm => (
                    <tr key={perm.key} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="text-xs font-semibold text-white">{perm.name}</div>
                        <div className="text-[11px] text-slate-400">{perm.description}</div>
                        <code className="text-[10px] text-indigo-300 font-mono mt-0.5 block">{perm.key}</code>
                      </td>
                      {nonAdminRoles.map(role => {
                        const has = role.permissions.includes(perm.key);
                        const savingKey = `${role.value}-${perm.key}`;
                        const isSaving = saving[savingKey];
                        return (
                          <td key={role.value} className="p-3.5 text-center">
                            <button
                              onClick={() => togglePermission(role.value, perm.key, has)}
                              disabled={isSaving}
                              className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center mx-auto text-xs font-bold ${
                                isSaving ? 'opacity-50 cursor-wait' :
                                has
                                  ? 'bg-indigo-500/20 text-cyan-300 hover:bg-indigo-500/30 border border-indigo-500/30'
                                  : 'bg-white/[0.03] text-slate-600 hover:bg-white/[0.06] border border-white/[0.06]'
                              }`}
                              title={has ? `Remove from ${role.name}` : `Add to ${role.name}`}
                            >
                              {isSaving ? (
                                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
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
        <div className="glass-card rounded-2xl border border-white/[0.08] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Super Admin Note</h3>
          <p className="text-xs text-slate-400">
            The <span className="font-mono text-cyan-400">ADMIN</span> role uses the <code className="text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded text-[11px]">ALL</code> wildcard and is granted full access across all operations.
          </p>
        </div>
      </div>
    </div>
  );
}

