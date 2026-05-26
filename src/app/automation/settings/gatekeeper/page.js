"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

export default function GatekeeperPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [form, setForm] = useState({
    targetTitles: "",
    excludeCompanies: "",
    excludeKeywords: "",
    requiredKeywords: "",
    seniorityLevels: "",
    excludeSeniorityLevels: "",
    customInstructions: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/automation/gatekeeper-rules");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setForm({
            targetTitles: (data.targetTitles || []).join("\n"),
            excludeCompanies: (data.excludeCompanies || []).join("\n"),
            excludeKeywords: (data.excludeKeywords || []).join("\n"),
            requiredKeywords: (data.requiredKeywords || []).join("\n"),
            seniorityLevels: (data.seniorityLevels || []).join("\n"),
            excludeSeniorityLevels: (data.excludeSeniorityLevels || []).join("\n"),
            customInstructions: data.customInstructions || "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch rules", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        targetTitles: form.targetTitles.split("\n").map((s) => s.trim()).filter(Boolean),
        excludeCompanies: form.excludeCompanies.split("\n").map((s) => s.trim()).filter(Boolean),
        excludeKeywords: form.excludeKeywords.split("\n").map((s) => s.trim()).filter(Boolean),
        requiredKeywords: form.requiredKeywords.split("\n").map((s) => s.trim()).filter(Boolean),
        seniorityLevels: form.seniorityLevels.split("\n").map((s) => s.trim()).filter(Boolean),
        excludeSeniorityLevels: form.excludeSeniorityLevels.split("\n").map((s) => s.trim()).filter(Boolean),
        customInstructions: form.customInstructions,
      };
      const res = await apiClient("/api/automation/gatekeeper-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Gatekeeper rules saved" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save rules" });
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
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Gatekeeper Rules</h2>
        <p className="text-sm text-slate-400 mt-1">
          The Gatekeeper AI evaluates each job listing against these rules and decides whether to apply, skip, or flag for review.
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
        {/* Target Titles */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            Target Titles (one per line)
          </h3>
          <textarea
            value={form.targetTitles}
            onChange={(e) => setForm({ ...form, targetTitles: e.target.value })}
            rows={2}
            className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
            placeholder="Frontend Developer&#10;React Engineer"
          />
        </div>

        {/* Exclusion rules */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
            Exclusion Rules
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Exclude Companies</label>
              <textarea
                value={form.excludeCompanies}
                onChange={(e) => setForm({ ...form, excludeCompanies: e.target.value })}
                rows={3}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                placeholder="Meta&#10;Amazon"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Exclude Keywords</label>
              <textarea
                value={form.excludeKeywords}
                onChange={(e) => setForm({ ...form, excludeKeywords: e.target.value })}
                rows={3}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                placeholder="senior&#10;lead&#10;manager"
              />
            </div>
          </div>
        </div>

        {/* Required Keywords */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            Required Keywords
          </h3>
          <textarea
            value={form.requiredKeywords}
            onChange={(e) => setForm({ ...form, requiredKeywords: e.target.value })}
            rows={2}
            className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
            placeholder="React&#10;TypeScript"
          />
        </div>

        {/* Seniority */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </span>
            Seniority Levels
          </h3>
          <p className="text-xs text-slate-500">Salary and work-mode filters are now set in <a href="/automation/settings/criteria" className="text-blue-400 hover:text-blue-300">Job Search Criteria</a>.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Target Levels (one per line)</label>
              <textarea
                value={form.seniorityLevels}
                onChange={(e) => setForm({ ...form, seniorityLevels: e.target.value })}
                rows={2}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                placeholder="junior&#10;mid"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Exclude Levels (one per line)</label>
              <textarea
                value={form.excludeSeniorityLevels}
                onChange={(e) => setForm({ ...form, excludeSeniorityLevels: e.target.value })}
                rows={2}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                placeholder="senior&#10;lead"
              />
            </div>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </span>
            Custom Instructions (plain English)
          </h3>
          <textarea
            value={form.customInstructions}
            onChange={(e) => setForm({ ...form, customInstructions: e.target.value })}
            rows={3}
            className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
            placeholder="e.g. Only apply to companies with 50+ employees. Skip any job requiring 5+ years of experience in a specific framework I don't know."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={fetchRules}
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
            ) : "Save Rules"}
          </button>
        </div>
      </form>
    </div>
  );
}
