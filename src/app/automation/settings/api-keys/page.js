"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

export default function AutomationApiKeysPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState(null);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch API keys", err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (user) fetchKeys();
  }, [user, fetchKeys]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await apiClient("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data);
        setKeyName("");
        fetchKeys();
      } else {
        setError(data.error || "Failed to create key");
      }
    } catch (err) {
      setError("Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      const res = await apiClient(`/api/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">API Keys</h2>
        <p className="text-sm text-slate-400 mt-1">
          API keys allow the Automation Worker to generate resumes and interact with this app on your behalf.
          Keep your keys secure.
        </p>
      </div>

      {newKey && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-4">
          <p className="font-semibold text-amber-400 mb-1">Key created — save it now</p>
          <p className="text-amber-400/70 text-sm mb-2">This key will not be shown again.</p>
          <code className="block bg-slate-800 p-3 rounded text-sm break-all font-mono text-slate-200">
            {newKey.key}
          </code>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { navigator.clipboard.writeText(newKey.key); }}
              className="text-sm text-amber-400 hover:text-amber-300 underline"
            >
              Copy to clipboard
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="text-sm text-slate-400 hover:text-slate-300 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          placeholder="e.g. Automation Worker"
          className="flex-1 bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating || !keyName.trim()}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "Create Key"}
        </button>
      </form>

      {error && (
        <div className="text-sm bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg p-3">
          {error}
        </div>
      )}

      {keys.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl border border-white/5 text-center">
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <p className="text-lg mb-2">No API keys yet</p>
            <p className="text-sm">Create a key above to get started.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key._id} className="glass-card p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">{key.name}</p>
                <p className="text-sm text-slate-500 font-mono">{key.keyPrefix}...</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(key._id)}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
