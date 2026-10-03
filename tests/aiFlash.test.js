import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callAI } from '@/lib/ai/client';
import { AI_TASKS, getEffectiveConfig } from '@/lib/ai/config';
import { AI_MAX_TOKENS } from '@/lib/ai/runners/deepseek';

vi.mock('@/config/env', () => ({
  default: { deepseekApiKey: 'test-deepseek-key' },
}));

const taskKeys = [
  'RESUME_GENERATION',
  'COVER_LETTER_GENERATION',
  'AI_EDIT',
  'RESUME_PARSING',
  'GATEKEEPER',
];
const result = { ok: true };
const fetchMock = vi.fn();

beforeEach(() => {
  for (const task of taskKeys) vi.stubEnv(`AI_TASK_${task}`, '');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(result) } }],
    }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('DeepSeek Flash task routing', () => {
  it('covers every configured AI task', () => {
    expect(Object.keys(AI_TASKS).sort()).toEqual([...taskKeys].sort());
  });

  it.each(taskKeys)('%s sends a non-thinking Flash request and parses the result', async (task) => {
    expect(await callAI(task, 'Return JSON.', { parseJson: true })).toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test-deepseek-key');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options.body)).toEqual({
      model: 'deepseek-flash',
      messages: [{ role: 'user', content: 'Return JSON.' }],
      max_tokens: AI_MAX_TOKENS,
      thinking: { type: 'disabled' },
    });
  });

  it('preserves an explicit DeepSeek model override without imposing Flash mode', async () => {
    vi.stubEnv('AI_TASK_AI_EDIT', 'deepseek:deepseek-v4-pro');

    expect(await callAI('AI_EDIT', 'Return JSON.', { parseJson: true })).toEqual(result);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: 'Return JSON.' }],
      max_tokens: AI_MAX_TOKENS,
    });
    expect(getEffectiveConfig('RESUME_GENERATION')).toEqual({
      provider: 'deepseek', model: 'deepseek-flash',
    });
  });

  it('preserves an explicit Gemini provider override', () => {
    vi.stubEnv('AI_TASK_RESUME_PARSING', 'gemini:custom-model');

    expect(getEffectiveConfig('RESUME_PARSING')).toEqual({
      provider: 'gemini', model: 'custom-model',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses Flash when an override is incomplete', async () => {
    vi.stubEnv('AI_TASK_RESUME_GENERATION', 'deepseek:');

    expect(await callAI('RESUME_GENERATION', 'Return JSON.')).toBe(JSON.stringify(result));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'deepseek-flash', thinking: { type: 'disabled' },
    });
  });
});
