"use client";

import { useState } from "react";
import ResumePreview from "@/components/preview/ResumePreview";
import TemplateSelector from "@/components/home/TemplateSelector";

const DEFAULT_TEMPLATE_ID = "ClassicTemplate";

export default function TemplateViewer({ resume, user }) {
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_TEMPLATE_ID);

  if (!resume) return null;

  return (
    <div className="space-y-4">
      <ResumePreview
        tailoredResume={resume}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        user={user}
        templateSelector={
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
          />
        }
      />
    </div>
  );
}

