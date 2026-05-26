"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

export default function ApplyInstructionsPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/automation/apply-instructions");
      if (res.ok) {
        const data = await res.json();
        setInstructions(data.instructions || "");
      }
    } catch (err) {
      console.error("Failed to fetch instructions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await apiClient("/api/automation/apply-instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Instructions saved" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save instructions" });
    } finally {
      setSaving(false);
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
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Apply Instructions</h2>
        <p className="text-sm text-slate-400 mt-1">
          Write instructions in plain English for the AI to follow when filling out job applications. The AI reads these before filling each form.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card p-6 rounded-2xl border border-white/5">
          <label className="block text-sm font-medium text-slate-200 mb-2">Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={10}
            className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 font-mono"
            placeholder={`e.g.
- Always use 647-555-0101 for phone number
- Set salary expectation to $75,000
- Skip questions about work authorization — I am a citizen
- For "how did you hear about us", select "LinkedIn"
- If asked for portfolio URL, leave it blank`}
          />
          <p className="text-xs text-slate-500 mt-2">
            Write one instruction per line. The AI receives these as rules to follow.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={fetchInstructions}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
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
            ) : "Save Instructions"}
          </button>
        </div>
      </form>
    </div>
  );
}
