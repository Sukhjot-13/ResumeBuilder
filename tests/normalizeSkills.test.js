import { describe, it, expect } from 'vitest';
import { normalizeSkills } from '@/lib/resumeFields';

// Regression guard for audit finding H3: skills data exists in several
// historical shapes and every one must render (previously 4 of 6 PDF
// templates read a legacy shape and rendered Skills blank).
describe('normalizeSkills', () => {
  it('passes through arrays of strings', () => {
    expect(normalizeSkills(['React', 'Node'])).toEqual(['React', 'Node']);
  });

  it('maps the current schema shape [{ skill_name, category }] (H3 regression)', () => {
    expect(
      normalizeSkills([
        { skill_name: 'React', category: 'Frontend' },
        { skill_name: 'SQL', category: 'Backend' },
      ])
    ).toEqual(['React', 'SQL']);
  });

  it('unwraps the legacy { list_of_skills: [...] } shape', () => {
    expect(normalizeSkills({ list_of_skills: ['A', 'B'] })).toEqual(['A', 'B']);
    expect(
      normalizeSkills({
        list_of_skills: [
          { skill_name: 'A' },
          { skill_name: 'B' },
        ],
      })
    ).toEqual(['A', 'B']);
  });

  it('splits raw comma-separated strings', () => {
    expect(normalizeSkills('React, Node , SQL')).toEqual(['React', 'Node', 'SQL']);
  });

  it('drops empty entries and returns [] for junk input', () => {
    expect(normalizeSkills([{ skill_name: '' }, {}, null])).toEqual([]);
    expect(normalizeSkills(undefined)).toEqual([]);
    expect(normalizeSkills(null)).toEqual([]);
    expect(normalizeSkills(42)).toEqual([]);
  });
});
