"use client";

import { useState } from "react";
import ResumePreview from "@/components/preview/ResumePreview";
import TemplateSelector from "@/components/home/TemplateSelector";

// Default template id — matches TemplateSelector option values (filename with extension)
const DEFAULT_TEMPLATE_ID = "ClassicTemplate.js";

export default function TemplateViewer({ resume, user }) {
  const [selectedTemplate, setSelectedTemplate] =
    useState(DEFAULT_TEMPLATE_ID);

  return (
    <div>
      <TemplateSelector
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
      />
      <div className="mt-8">
        {resume && (
          <ResumePreview
            tailoredResume={resume}
            selectedTemplate={selectedTemplate}
            user={user}
          />
        )}
      </div>
    </div>
  );
}
