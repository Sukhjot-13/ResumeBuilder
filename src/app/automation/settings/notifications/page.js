"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApiClient } from "@/hooks/useApiClient";

const TOGGLES = [
  { key: "emailOnApply", label: "Application submitted", desc: "Email me when the worker successfully submits an application" },
  { key: "emailOnError", label: "Application errors", desc: "Email me if an application fails due to an error" },
  { key: "emailOnCaptcha", label: "CAPTCHA detected", desc: "Email me if a CAPTCHA is detected and needs manual intervention" },
  { key: "emailOnSchedulerStop", label: "Scheduler stopped", desc: "Email me if the automation scheduler stops unexpectedly" },
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const apiClient = useApiClient();
  const [form, setForm] = useState({
    emailOnApply: true,
    emailOnError: true,
    emailOnCaptcha: true,
    emailOnSchedulerStop: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/automation/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setForm({
            emailOnApply: data.emailOnApply ?? true,
            emailOnError: data.emailOnError ?? true,
            emailOnCaptcha: data.emailOnCaptcha ?? true,
            emailOnSchedulerStop: data.emailOnSchedulerStop ?? true,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch notification preferences", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setForm({ ...form, [key]: !form[key] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await apiClient("/api/automation/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Notification preferences saved" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save preferences" });
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
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Notifications</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure which events the Automation Worker should notify you about via email.
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

      <form onSubmit={handleSubmit} className="space-y-3">
        {TOGGLES.map((item) => (
          <div key={item.key} className="glass-card p-5 rounded-2xl border border-white/5">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(item.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                  form[item.key] ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form[item.key] ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </label>
          </div>
        ))}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={fetchPrefs}
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
            ) : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}
