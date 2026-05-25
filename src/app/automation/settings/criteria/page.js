"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "indeed", label: "Indeed" },
];

export default function CriteriaPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [form, setForm] = useState({
    titles: "",
    locations: "",
    remote: true,
    hybrid: true,
    onSite: false,
    minSalary: "",
    maxSalary: "",
    platforms: ["linkedin", "indeed"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchCriteria();
  }, []);

  const fetchCriteria = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/automation/criteria");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setForm({
            titles: (data.titles || []).join("\n"),
            locations: (data.locations || []).join("\n"),
            remote: data.remote ?? true,
            hybrid: data.hybrid ?? true,
            onSite: data.onSite ?? false,
            minSalary: data.minSalary || "",
            maxSalary: data.maxSalary || "",
            platforms: data.platforms || ["linkedin", "indeed"],
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch criteria", err);
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
        titles: form.titles.split("\n").map((s) => s.trim()).filter(Boolean),
        locations: form.locations.split("\n").map((s) => s.trim()).filter(Boolean),
        remote: form.remote,
        hybrid: form.hybrid,
        onSite: form.onSite,
        minSalary: form.minSalary ? Number(form.minSalary) : undefined,
        maxSalary: form.maxSalary ? Number(form.maxSalary) : undefined,
        platforms: form.platforms,
      };
      const res = await apiClient("/api/automation/criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Criteria saved successfully" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save criteria" });
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platform) => {
    setForm({
      ...form,
      platforms: form.platforms.includes(platform)
        ? form.platforms.filter((p) => p !== platform)
        : [...form.platforms, platform],
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Job Search Criteria</h2>
        <p className="text-sm text-slate-400 mt-1">
          Set the types of jobs you want to search for. The scraper and gatekeeper use these criteria.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Titles */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            Job Titles & Locations
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Target Job Titles (one per line)</label>
              <textarea
                value={form.titles}
                onChange={(e) => setForm({ ...form, titles: e.target.value })}
                rows={3}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                placeholder="Frontend Developer&#10;React Engineer&#10;Full Stack Developer"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Target Locations (one per line, leave empty for any)</label>
              <textarea
                value={form.locations}
                onChange={(e) => setForm({ ...form, locations: e.target.value })}
                rows={2}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                placeholder="Remote&#10;Toronto, ON&#10;New York, NY"
              />
            </div>
          </div>
        </div>

        {/* Work Mode */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Work Mode
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "remote", label: "Remote" },
              { key: "hybrid", label: "Hybrid" },
              { key: "onSite", label: "On-site" },
            ].map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setForm({ ...form, [mode.key]: !form[mode.key] })}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  form[mode.key]
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-slate-800 border-white/10 text-slate-400 hover:border-white/20"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Salary Range */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Salary Range (optional)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={form.minSalary}
                  onChange={(e) => setForm({ ...form, minSalary: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                  placeholder="Min"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={form.maxSalary}
                  onChange={(e) => setForm({ ...form, maxSalary: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            Platforms
          </h3>
          <div className="flex gap-3">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  form.platforms.includes(p.id)
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-slate-800 border-white/10 text-slate-400 hover:border-white/20"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={fetchCriteria}
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
            ) : "Save Criteria"}
          </button>
        </div>
      </form>
    </div>
  );
}
