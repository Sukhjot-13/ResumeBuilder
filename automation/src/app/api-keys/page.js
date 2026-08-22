"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";
import { API_ENDPOINTS, PERMISSIONS } from "@/lib/constants";
import PermissionGate from "@/components/common/PermissionGate";

export default function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth();
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
      const res = await apiClient(API_ENDPOINTS.AUTOMATION.API_KEYS);
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
      const res = await apiClient(API_ENDPOINTS.AUTOMATION.API_KEYS, {
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
      const res = await apiClient(API_ENDPOINTS.AUTOMATION.API_KEY_BY_ID(keyId), {
        method: "DELETE",
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  };

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <PermissionGate user={user} permission={PERMISSIONS.MANAGE_API_KEYS}>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">API Keys</h1>
        <p className="text-gray-600 mb-6">
          API keys allow the Automation Worker to generate resumes on your behalf.
          Keep your keys secure — they grant access to your account.
        </p>

        {newKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="font-semibold text-yellow-800 mb-1">Key created — save it now</p>
            <p className="text-yellow-700 text-sm mb-2">This key will not be shown again.</p>
            <code className="block bg-yellow-100 p-3 rounded text-sm break-all font-mono">
              {newKey.key}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey.key);
                alert("Copied!");
              }}
              className="mt-2 text-sm text-yellow-800 underline"
            >
              Copy to clipboard
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="ml-4 mt-2 text-sm text-yellow-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex gap-3 mb-8">
          <input
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g. Automation Worker"
            className="flex-1 border rounded-lg px-4 py-2"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !keyName.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Key"}
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {loading ? (
          <p className="text-gray-500">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-gray-500">No API keys yet.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key._id} className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-sm text-gray-500 font-mono">{key.keyPrefix}...</p>
                  <p className="text-xs text-gray-400">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key._id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
