"use client";

import { useEffect, useState } from "react";

/**
 * A component for selecting a resume template.
 * Lists templates from /api/resume/templates (the single canonical listing —
 * friendly names + ids accepted by the PDF generator).
 * @param {object} props - The component's props.
 * @param {string} props.selectedTemplate - The currently selected template.
 * @param {function} props.setSelectedTemplate - The function to call when the template changes.
 * @returns {JSX.Element} The rendered component.
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
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">Select a Template</h2>
        <div>Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">Select a Template</h2>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Select a Template</h2>
      <select
        value={selectedTemplate}
        onChange={(e) => setSelectedTemplate(e.target.value)}
        className="w-full bg-gray-700 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  );
}
