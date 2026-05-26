"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function SchedulerPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [form, setForm] = useState({
    enabled: false,
    pipelineMode: "scrape_only",
    startHour: 9,
    endHour: 18,
    timezone: "America/Toronto",
    activeDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
    maxPerDay: 20,
    maxPerWeek: 80,
    maxPerRun: 5,
    minDelaySeconds: 60,
    maxDelaySeconds: 180,
    gatekeeperThreshold: 75,
    reviewQueueThreshold: 40,
    pauseOnError: true,
    pauseOnSessionExpiry: true,
    dailyRateLimit: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/automation/scheduler");
      const data = res.ok ? await res.json() : null;
      if (data) {
        setForm((prev) => ({
          ...prev,
          enabled: data.enabled ?? false,
          pipelineMode: data.pipelineMode || "scrape_only",
          startHour: data.startHour ?? 9,
          endHour: data.endHour ?? 18,
          timezone: data.timezone || "America/Toronto",
          activeDays: data.activeDays || prev.activeDays,
          maxPerDay: data.maxPerDay ?? 20,
          maxPerWeek: data.maxPerWeek ?? 80,
          maxPerRun: data.maxPerRun ?? 5,
          minDelaySeconds: data.minDelaySeconds ?? 60,
          maxDelaySeconds: data.maxDelaySeconds ?? 180,
          gatekeeperThreshold: data.gatekeeperThreshold ?? 75,
          reviewQueueThreshold: data.reviewQueueThreshold ?? 40,
          pauseOnError: data.pauseOnError ?? true,
          pauseOnSessionExpiry: data.pauseOnSessionExpiry ?? true,
          dailyRateLimit: data.dailyRateLimit ?? 100,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch scheduler settings", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setForm({ ...form, activeDays: { ...form.activeDays, [day]: !form.activeDays[day] } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await apiClient("/api/automation/scheduler", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Scheduler settings saved" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save settings" });
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
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Scheduler</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure when and how often the Automation Worker should search for and apply to jobs.
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
        {/* Master Toggle */}
        <div className="glass-card p-6 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Automation {form.enabled ? "Enabled" : "Disabled"}</p>
              <p className="text-sm text-slate-500">Master on/off switch for all automation</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.enabled ? "bg-blue-600" : "bg-slate-700"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.enabled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>

        {/* Pipeline Mode */}
        <div className="glass-card p-6 rounded-2xl border border-white/5">
          <h3 className="text-sm font-medium text-slate-200 mb-3">Pipeline Mode</h3>
          <p className="text-xs text-slate-500 mb-4">Control what the automation pipeline does when it runs.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "scrape_only", label: "Scrape Only", desc: "Find jobs but don't evaluate or apply" },
              { value: "scrape_gate", label: "Scrape & Review", desc: "Find and evaluate jobs, review results manually" },
              { value: "full", label: "Full Pipeline", desc: "Scrape, evaluate, and auto-apply to matching jobs" },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setForm({ ...form, pipelineMode: mode.value })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.pipelineMode === mode.value
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-white/5 bg-transparent hover:border-white/20"
                }`}
              >
                <p className={`text-sm font-medium mb-1 ${
                  form.pipelineMode === mode.value ? "text-blue-400" : "text-slate-200"
                }`}>{mode.label}</p>
                <p className="text-xs text-slate-500">{mode.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Time Window */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Time Window
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Hour (0-23)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={form.startHour}
                onChange={(e) => setForm({ ...form, startHour: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Hour (0-23)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={form.endHour}
                onChange={(e) => setForm({ ...form, endHour: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Timezone</label>
            <input
              type="text"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Active Days */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-sm font-medium text-slate-200">Active Days</h3>
          <div className="flex gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  form.activeDays[day]
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-white/10"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Limits */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </span>
            Application Limits
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Per Day</label>
              <input
                type="number"
                min={1}
                value={form.maxPerDay}
                onChange={(e) => setForm({ ...form, maxPerDay: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Per Week</label>
              <input
                type="number"
                min={1}
                value={form.maxPerWeek}
                onChange={(e) => setForm({ ...form, maxPerWeek: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Per Run</label>
              <input
                type="number"
                min={1}
                value={form.maxPerRun}
                onChange={(e) => setForm({ ...form, maxPerRun: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Daily API Limit</label>
              <input
                type="number"
                min={1}
                value={form.dailyRateLimit}
                onChange={(e) => setForm({ ...form, dailyRateLimit: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Delay Range */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200">Delay Between Applications</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Min Delay (seconds)</label>
              <input
                type="number"
                min={10}
                value={form.minDelaySeconds}
                onChange={(e) => setForm({ ...form, minDelaySeconds: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Max Delay (seconds)</label>
              <input
                type="number"
                min={10}
                value={form.maxDelaySeconds}
                onChange={(e) => setForm({ ...form, maxDelaySeconds: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Thresholds */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-medium text-slate-200">Gatekeeper Thresholds</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Auto-apply confidence</span>
                <span className="font-medium text-slate-200">{form.gatekeeperThreshold}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={form.gatekeeperThreshold}
                onChange={(e) => setForm({ ...form, gatekeeperThreshold: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <p className="text-xs text-slate-500 mt-1">Only auto-apply if AI confidence is above this</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Manual review threshold</span>
                <span className="font-medium text-slate-200">{form.reviewQueueThreshold}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={form.reviewQueueThreshold}
                onChange={(e) => setForm({ ...form, reviewQueueThreshold: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <p className="text-xs text-slate-500 mt-1">Jobs below this go to manual review queue</p>
            </div>
          </div>
        </div>

        {/* Pause Settings */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-sm font-medium text-slate-200">Pause Automation</h3>
          {[
            { key: "pauseOnError", label: "Pause if an application fails" },
            { key: "pauseOnSessionExpiry", label: "Pause if LinkedIn/Indeed session expires" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setForm({ ...form, [item.key]: !form[item.key] })}
                className={`w-4 h-4 rounded border transition-colors ${
                  form[item.key]
                    ? "bg-blue-600 border-blue-600"
                    : "bg-slate-800 border-white/20"
                }`}
              >
                {form[item.key] && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-slate-400">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={fetchSettings}
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
            ) : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
