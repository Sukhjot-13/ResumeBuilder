"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

const PLATFORM_CONFIG = {
  linkedin: {
    label: "LinkedIn",
    cookieDomain: "www.linkedin.com",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  indeed: {
    label: "Indeed",
    cookieDomain: "secure.indeed.com",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.02 4.5c.77.008 1.54.176 2.23.528l-2.23 4.28-2.2-4.28c.68-.352 1.43-.528 2.2-.528zm-3.74.99c.792-.264 1.628-.396 2.464-.396.44 0 .88.044 1.32.132L12 10.2l-3.72-4.71zm7.48.044c.22.132.44.286.638.44 1.144.924 1.892 2.332 1.892 3.916 0 .968-.264 1.892-.748 2.684-.22.352-.484.66-.792.924l.044.044c.22.22.418.462.572.726.792 1.364.836 3.036.044 4.444L12 20.34l-5.058-6.072c-.836-1.408-.792-3.08 0-4.444.154-.264.352-.506.572-.726l.044-.044c-.308-.264-.572-.572-.792-.924-.484-.792-.748-1.716-.748-2.684 0-1.584.748-2.992 1.892-3.916.198-.154.418-.308.638-.44l3.784 4.796 3.828-4.84z" />
      </svg>
    ),
  },
};

export default function AccountsPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [sessions, setSessions] = useState({ linkedin: null, indeed: null });
  const [loading, setLoading] = useState(true);
  const [linkedinCookies, setLinkedinCookies] = useState("");
  const [indeedCookies, setIndeedCookies] = useState("");
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/automation/sessions");
      if (res.ok) {
        const data = await res.json();
        const map = {};
        (data || []).forEach((s) => {
          map[s.platform] = s;
        });
        setSessions(map);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (platform) => {
    const cookies = platform === "linkedin" ? linkedinCookies : indeedCookies;
    if (!cookies.trim()) return;

    setSaving(platform);
    setMessage({ type: "", text: "" });
    try {
      const res = await apiClient("/api/automation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, cookies }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `${PLATFORM_CONFIG[platform].label} cookies saved` });
        if (platform === "linkedin") setLinkedinCookies("");
        else setIndeedCookies("");
        fetchSessions();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save cookies" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (platform) => {
    if (!confirm(`Remove ${PLATFORM_CONFIG[platform].label} session?`)) return;
    try {
      const res = await apiClient(`/api/automation/sessions?platform=${platform}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => ({ ...prev, [platform]: null }));
        setMessage({ type: "success", text: `${PLATFORM_CONFIG[platform].label} session removed` });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to remove session" });
    }
  };

  const copyExample = (platform) => {
    const domain = PLATFORM_CONFIG[platform].cookieDomain;
    const example = JSON.stringify([
      { name: "sessionid", value: "your-session-id", domain: `.${domain.replace("www.", "")}`, path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
      { name: "csrf_token", value: "your-csrf-token", domain: `.${domain.replace("www.", "")}`, path: "/", httpOnly: false, secure: true, sameSite: "Lax" },
    ], null, 2);
    navigator.clipboard.writeText(example);
    setMessage({ type: "success", text: "Example JSON copied to clipboard" });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Platform Accounts</h2>
        <p className="text-sm text-slate-400 mt-1">
          Add your LinkedIn and Indeed session cookies so the Automation Worker can apply to jobs on your behalf.
          Cookies are AES-256 encrypted before storage and only decrypted by the Worker at apply time.
        </p>
      </div>

      {message.text && (
        <div className={`text-sm rounded-lg p-3 ${
          message.type === "success"
            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            : "bg-red-500/15 border border-red-500/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* LinkedIn */}
      <SessionCard
        config={PLATFORM_CONFIG.linkedin}
        session={sessions.linkedin}
        cookieValue={linkedinCookies}
        onChange={setLinkedinCookies}
        onSave={() => handleSave("linkedin")}
        onRemove={() => handleRemove("linkedin")}
        onCopyExample={() => copyExample("linkedin")}
        saving={saving === "linkedin"}
      />

      {/* Indeed */}
      <SessionCard
        config={PLATFORM_CONFIG.indeed}
        session={sessions.indeed}
        cookieValue={indeedCookies}
        onChange={setIndeedCookies}
        onSave={() => handleSave("indeed")}
        onRemove={() => handleRemove("indeed")}
        onCopyExample={() => copyExample("indeed")}
        saving={saving === "indeed"}
      />
    </div>
  );
}

function SessionCard({ config, session, cookieValue, onChange, onSave, onRemove, onCopyExample, saving }) {
  const [showCookies, setShowCookies] = useState(false);

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-200">{config.label}</h3>
            {session ? (
              <p className="text-xs text-emerald-400 font-medium">
                Session active {session.lastRefreshed ? `· last refreshed ${new Date(session.lastRefreshed).toLocaleDateString()}` : ""}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Not configured</p>
            )}
          </div>
        </div>
        {session && (
          <button
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
        <p className="font-medium text-slate-200">How to export cookies from {config.label}:</p>
        <ol className="text-slate-400 space-y-1.5 list-decimal list-inside">
          <li>Open {config.label} in your browser and log in</li>
          <li>Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono text-slate-300">F12</kbd> → <strong className="text-slate-300">Application</strong> tab → <strong className="text-slate-300">Cookies</strong> → <code className="text-blue-400 text-xs">{config.cookieDomain}</code></li>
          <li>Select every cookie row (<kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono text-slate-300">Ctrl+A</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono text-slate-300">Cmd+A</kbd>)</li>
          <li>Copy them as JSON (right-click → <strong className="text-slate-300">Copy as JSON</strong> or use the Export button)</li>
          <li>Paste the JSON array below and click <strong className="text-slate-300">Save Session</strong></li>
        </ol>
      </div>

      {/* JSON input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cookie JSON</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCopyExample}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Copy example
            </button>
            {cookieValue && (
              <button
                type="button"
                onClick={() => setShowCookies(!showCookies)}
                className="text-xs text-slate-500 hover:text-slate-400 font-medium transition-colors"
              >
                {showCookies ? "Hide" : "Preview"}
              </button>
            )}
          </div>
        </div>
        <textarea
          value={cookieValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder='[{"name": "sessionid", "value": "your-session-id", ...}]'
          rows={6}
          className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y placeholder-slate-500"
          spellCheck={false}
        />
      </div>

      {/* Parsed preview */}
      {showCookies && cookieValue.trim() && (
        <div className="bg-slate-800/50 rounded-lg p-3 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto">
          {(() => {
            try {
              const parsed = JSON.parse(cookieValue.trim());
              if (!Array.isArray(parsed)) return <span className="text-red-400">Not a valid JSON array</span>;
              return parsed.map((c, i) => (
                <div key={i} className="truncate">
                  <span className="text-blue-400">{c.name}</span>
                  <span className="text-slate-600"> = </span>
                  <span className="text-emerald-400">{(c.value || "").substring(0, 40)}{(c.value || "").length > 40 ? "..." : ""}</span>
                </div>
              ));
            } catch {
              return <span className="text-red-400">Invalid JSON — paste a valid array of cookie objects</span>;
            }
          })()}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center justify-end">
        <button
          onClick={onSave}
          disabled={saving || !cookieValue.trim()}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          ) : "Save Session"}
        </button>
      </div>
    </div>
  );
}
