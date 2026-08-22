import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { extractText as extractPdfText } from 'unpdf';

// Regression guard for audit finding H3: every template must RENDER skills
// supplied in the current schema shape ([{ skill_name, category }]) —
// previously 4 of 6 templates read a legacy shape and showed Skills blank.
import ClassicTemplate from '@/components/resume-templates/pdf-templates/ClassicTemplate';
import ClassicTemplate2 from '@/components/resume-templates/pdf-templates/ClassicTemplate2';
import Modern from '@/components/resume-templates/pdf-templates/Modern';
import Professional from '@/components/resume-templates/pdf-templates/Professional';
import Creative from '@/components/resume-templates/pdf-templates/Creative';
import Simple from '@/components/resume-templates/pdf-templates/Simple';

const SCHEMA_SHAPED_RESUME = {
  profile: {
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 000',
    location: 'Toronto, ON',
    website: '',
    headline: 'Engineer',
    generic_summary: 'Solid engineer.',
  },
  work_experience: [
    {
      job_title: 'Software Engineer',
      company: 'Acme',
      start_date: '2021-03',
      end_date: '',
      is_current: true,
      responsibilities: ['Shipped things', 'Led a team'],
    },
  ],
  education: [
    {
      institution: 'U of T',
      degree: 'BSc',
      field_of_study: 'CS',
      start_date: '2016-09',
      end_date: '2020-06',
      is_current: false,
      relevant_coursework: 'Algorithms',
      bullets: [],
    },
  ],
  // Current RESUME_FIELD_SCHEMA shape — NOT the legacy list_of_skills shape
  skills: [
    { skill_name: 'Kubernetes', category: 'DevOps' },
    { skill_name: 'GraphQL', category: 'Backend' },
  ],
  additional_info: {
    languages: ['English'],
    certifications: [],
    awards_activities: [],
  },
};

const TEMPLATES = [
  ['Classic', ClassicTemplate],
  ['Classic2', ClassicTemplate2],
  ['Modern', Modern],
  ['Professional', Professional],
  ['Creative', Creative],
  ['Simple', Simple],
];

describe('PDF templates render schema-shaped skills', () => {
  for (const [name, Template] of TEMPLATES) {
    it(`renders "${name}" with visible skill names`, async () => {
      const doc = React.createElement(Template, { resumeData: SCHEMA_SHAPED_RESUME });
      const pdfString = await pdf(doc).toString();

      expect(pdfString.startsWith('%PDF')).toBe(true);
      expect(pdfString.length).toBeGreaterThan(1000);

      const bytes = Uint8Array.from(Buffer.from(pdfString, 'latin1'));
      const { text } = await extractPdfText(bytes);
      const allText = Array.isArray(text) ? text.join('\n') : String(text);
      expect(allText).toContain('Kubernetes');
      expect(allText).toContain('GraphQL');
    });
  }
});
