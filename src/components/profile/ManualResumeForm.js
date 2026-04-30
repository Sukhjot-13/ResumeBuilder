"use client";

/**
 * ManualResumeForm.js
 *
 * Multi-section form for manually entering resume data.
 * Driven entirely by RESUME_FIELD_SCHEMA — add a field there, it appears here.
 * Available to ALL users (no AI parsing required).
 */

import { useState, useCallback } from "react";
import { RESUME_FIELD_SCHEMA, FIELD_TYPES, buildEmptyResume, buildEmptyArrayItem } from "@/lib/resumeFields";
import { useApiClient } from "@/hooks/useApiClient";

// ─── Section icons ────────────────────────────────────────────────────────────
const SECTION_ICONS = {
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  work_experience: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  education: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  skills: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  additional_info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ─── Primitive field renderer ─────────────────────────────────────────────────
function FieldInput({ fieldKey, field, value, onChange }) {
  const baseInput =
    "w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors";

  if (field.type === FIELD_TYPES.CHECKBOX) {
    return (
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">{field.label}</span>
      </label>
    );
  }

  if (field.type === FIELD_TYPES.TEXTAREA) {
    return (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ""}
        rows={4}
        className={`${baseInput} resize-none`}
      />
    );
  }

  if (field.type === FIELD_TYPES.BULLET_LIST) {
    const lines = Array.isArray(value) ? value : [];
    const handleLineChange = (idx, val) => {
      const next = [...lines];
      next[idx] = val;
      onChange(next);
    };
    const addLine = () => onChange([...lines, ""]);
    const removeLine = (idx) => onChange(lines.filter((_, i) => i !== idx));

    return (
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <span className="text-slate-500 text-xs mt-0.5">•</span>
            <input
              type="text"
              value={line}
              onChange={(e) => handleLineChange(idx, e.target.value)}
              placeholder={field.placeholder || "Add bullet point…"}
              className={`${baseInput} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
              aria-label="Remove bullet"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addLine}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add bullet
        </button>
      </div>
    );
  }

  if (field.type === FIELD_TYPES.TAG_LIST) {
    const tags = Array.isArray(value) ? value : [];
    const [draft, setDraft] = useState("");

    const addTag = () => {
      const trimmed = draft.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setDraft("");
    };

    const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-500/30"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="hover:text-red-400 transition-colors ml-0.5"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={field.placeholder || "Type and press Enter…"}
            className={`${baseInput} flex-1`}
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  // Text / email / url / month
  return (
    <input
      type={field.type === FIELD_TYPES.MONTH ? "month" : field.type === FIELD_TYPES.EMAIL ? "email" : field.type === FIELD_TYPES.URL ? "url" : "text"}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || ""}
      className={baseInput}
    />
  );
}

// ─── Object section (profile, additional_info) ────────────────────────────────
function ObjectSection({ sectionKey, section, data, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.entries(section.fields).map(([fieldKey, field]) => {
        // Full-width fields
        const fullWidth =
          field.type === FIELD_TYPES.TEXTAREA ||
          field.type === FIELD_TYPES.TAG_LIST ||
          field.type === FIELD_TYPES.CHECKBOX;

        return (
          <div key={fieldKey} className={fullWidth ? "sm:col-span-2" : ""}>
            {field.type !== FIELD_TYPES.CHECKBOX && (
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
            )}
            <FieldInput
              fieldKey={fieldKey}
              field={field}
              value={data?.[fieldKey]}
              onChange={(val) => onChange(fieldKey, val)}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Array section item (work_experience, education, skills) ─────────────────
function ArrayItemCard({ sectionKey, section, item, index, onUpdate, onRemove }) {
  const isCurrent = sectionKey === "work_experience" && item.is_current;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">
          {item.job_title || item.institution || item.skill_name || `Entry ${index + 1}`}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
          aria-label="Remove entry"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(section.fields).map(([fieldKey, field]) => {
          // Hide end_date when is_current is checked
          if (fieldKey === "end_date" && isCurrent) return null;

          const fullWidth =
            field.type === FIELD_TYPES.BULLET_LIST ||
            field.type === FIELD_TYPES.TEXTAREA ||
            field.type === FIELD_TYPES.CHECKBOX;

          return (
            <div key={fieldKey} className={fullWidth ? "sm:col-span-2" : ""}>
              {field.type !== FIELD_TYPES.CHECKBOX && (
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
              )}
              <FieldInput
                fieldKey={fieldKey}
                field={field}
                value={item[fieldKey]}
                onChange={(val) => onUpdate(fieldKey, val)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Array section wrapper ────────────────────────────────────────────────────
function ArraySection({ sectionKey, section, items, onChange }) {
  const addItem = () => onChange([...items, buildEmptyArrayItem(sectionKey)]);

  const updateItem = (idx, fieldKey, val) => {
    const next = items.map((item, i) =>
      i === idx ? { ...item, [fieldKey]: val } : item
    );
    onChange(next);
  };

  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <ArrayItemCard
          key={idx}
          sectionKey={sectionKey}
          section={section}
          item={item}
          index={idx}
          onUpdate={(fieldKey, val) => updateItem(idx, fieldKey, val)}
          onRemove={() => removeItem(idx)}
        />
      ))}
      <button
        type="button"
        onClick={addItem}
        className="w-full py-2.5 border border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl text-sm transition-all flex items-center justify-center gap-2 hover:bg-blue-500/5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add {section.label} Entry
      </button>
    </div>
  );
}

// ─── Main Form Component ──────────────────────────────────────────────────────
export default function ManualResumeForm({ initialData, onSaved }) {
  const [formData, setFormData] = useState(() => {
    if (initialData) return initialData;
    return buildEmptyResume();
  });
  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const apiClient = useApiClient();

  const sectionKeys = Object.keys(RESUME_FIELD_SCHEMA);

  const updateObjectField = useCallback((sectionKey, fieldKey, val) => {
    setFormData((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [fieldKey]: val },
    }));
  }, []);

  const updateArraySection = useCallback((sectionKey, newItems) => {
    setFormData((prev) => ({ ...prev, [sectionKey]: newItems }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiClient("/api/resumes/master", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: formData }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.details?.length
            ? data.details.join("; ")
            : data.error || "Failed to save resume";
        setError(msg);
      } else {
        setSuccess("Resume saved successfully!");
        if (onSaved) onSaved(data.resume);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const currentSection = RESUME_FIELD_SCHEMA[activeSection];
  const currentData = formData[activeSection];

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-slate-700/50 px-6 py-4">
        <h2 className="text-lg font-bold text-white">Build Your Resume</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Fill in your details — save anytime, edit whenever you want.
        </p>
      </div>

      <div className="flex flex-col md:flex-row min-h-0">
        {/* Sidebar nav */}
        <nav className="md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-slate-700/50 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          {sectionKeys.map((key) => {
            const section = RESUME_FIELD_SCHEMA[key];
            const isActive = key === activeSection;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all text-left w-full ${
                  isActive
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span className={isActive ? "text-blue-400" : "text-slate-500"}>
                  {SECTION_ICONS[key]}
                </span>
                {section.label}
              </button>
            );
          })}
        </nav>

        {/* Section content */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[400px] max-h-[640px]">
          <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <span className="text-blue-400">{SECTION_ICONS[activeSection]}</span>
            {currentSection.label}
          </h3>

          {currentSection.type === "object" ? (
            <ObjectSection
              sectionKey={activeSection}
              section={currentSection}
              data={currentData}
              onChange={(fieldKey, val) =>
                updateObjectField(activeSection, fieldKey, val)
              }
            />
          ) : (
            <ArraySection
              sectionKey={activeSection}
              section={currentSection}
              items={Array.isArray(currentData) ? currentData : []}
              onChange={(newItems) => updateArraySection(activeSection, newItems)}
            />
          )}
        </div>
      </div>

      {/* Footer / Save */}
      <div className="border-t border-slate-700/50 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-400 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </p>
          )}
        </div>

        {/* Section nav buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const idx = sectionKeys.indexOf(activeSection);
              if (idx > 0) setActiveSection(sectionKeys[idx - 1]);
            }}
            disabled={activeSection === sectionKeys[0]}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>
          {activeSection !== sectionKeys[sectionKeys.length - 1] ? (
            <button
              type="button"
              onClick={() => {
                const idx = sectionKeys.indexOf(activeSection);
                setActiveSection(sectionKeys[idx + 1]);
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
            >
              Next →
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Resume
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
