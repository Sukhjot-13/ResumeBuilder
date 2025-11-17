import React from 'react';

const PdfResumeRenderer = ({ resumeData, Template }) => {
  return <Template resumeData={resumeData} />;
};

export default PdfResumeRenderer;
