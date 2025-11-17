"use client";

import { useState } from "react";
import ResumePreview from "@/components/preview/ResumePreview";
import TemplateSelector from "@/components/home/TemplateSelector";

export default function TemplateViewer({ resume }) {
  const [selectedTemplate, setSelectedTemplate] =
    useState("ClassicTemplate.js");

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
          />
        )}
      </div>
    </div>
  );
}
