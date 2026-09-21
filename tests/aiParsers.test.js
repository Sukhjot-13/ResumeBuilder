import { describe, it, expect } from 'vitest';
import { parseDeepSeekJson } from '@/lib/ai/runners/deepseek';
import { parseGeminiJson } from '@/lib/ai/runners/gemini';

// Regression guard for 2026-09-11 audit H2: parsers must strip conversational
// preambles before the first `{`, not just trim after the last `}`.
describe('AI JSON parsers strip preambles', () => {
  const payload = { resume: { profile: { full_name: 'Test' } }, metadata: { jobTitle: 'Eng' } };

  it('parseDeepSeekJson handles leading text + code fence', () => {
    const raw = `Certainly! Here is your resume JSON:\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``;
    expect(parseDeepSeekJson(raw)).toEqual(payload);
  });

  it('parseDeepSeekJson handles bare leading text', () => {
    const raw = `Here you go ${JSON.stringify(payload)}`;
    expect(parseDeepSeekJson(raw)).toEqual(payload);
  });

  it('parseGeminiJson handles leading text + code fence', () => {
    const raw = `Sure — parsed result:\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``;
    expect(parseGeminiJson(raw)).toEqual(payload);
  });

  it('parseGeminiJson handles bare leading text', () => {
    const raw = `Output: ${JSON.stringify(payload)} hope this helps`;
    // trailing text after final } is trimmed by lastIndexOf slice
    expect(parseGeminiJson(raw)).toEqual(payload);
  });

  it('both parsers still accept clean JSON', () => {
    const raw = JSON.stringify(payload);
    expect(parseDeepSeekJson(raw)).toEqual(payload);
    expect(parseGeminiJson(raw)).toEqual(payload);
  });
});
