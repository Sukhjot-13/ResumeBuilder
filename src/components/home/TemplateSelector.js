"use client";

import { useEffect, useState } from "react";

/**
 * A component for selecting a resume template.
 * Lists templates from /api/resume/templates (the single canonical listing —
 * friendly names + ids accepted by the PDF generator).
 */
export default function TemplateSelector({
  selectedTemplate,
  setSelectedTemplate,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/resume/templates");
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading styles...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-400">Failed to load styles</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="template-select" className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap hidden sm:inline-flex items-center gap-1">
        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        Template:
      </label>
      <div className="relative">
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="appearance-none bg-slate-900/80 border border-white/[0.1] hover:border-white/[0.2] text-xs font-medium text-slate-200 py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id} className="bg-slate-900 text-white">
              {template.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

