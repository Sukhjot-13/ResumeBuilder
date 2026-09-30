import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: null }));
const mocks = vi.hoisted(() => ({
  ai: vi.fn(), track: vi.fn(), refund: vi.fn(), create: vi.fn(), link: vi.fn(),
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), complete: vi.fn(),
}));

vi.mock('@/lib/ai/client', () => ({ callAI: mocks.ai }));
vi.mock('@/lib/mongodb', () => ({ default: async () => {} }));
vi.mock('@/models/User', () => ({ default: {
  findById: () => ({ populate: async () => state.user }),
} }));
vi.mock('@/models/Role', () => ({ default: { find: () => ({ lean: async () => [
  { value: 70, permissions: ['generate_resume', 'use_special_instructions'] },
  { value: 99, permissions: ['generate_resume', 'use_special_instructions'] },
  { value: 100, permissions: ['generate_resume'] },
] }) } }));
vi.mock('@/services/userService', () => ({ UserService: {
  getUserById: async () => state.user, addGeneratedResume: mocks.link,
} }));
vi.mock('@/services/resumeService', () => ({ ResumeService: { createResume: mocks.create } }));
vi.mock('@/services/subscriptionService', () => ({ SubscriptionService: {
  trackUsage: mocks.track, refundUsage: mocks.refund,
} }));
vi.mock('@/lib/logger', () => ({ logger: {
  info: mocks.info, warn: mocks.warn, error: mocks.error, debug: vi.fn(),
} }));
vi.mock('@/lib/manager/server', () => ({
  withManagerRequest: (_, handler) => handler(), scheduleManagerFlush: mocks.complete,
}));

import { POST } from '@/app/api/generate-content/route';
import { invalidateRoleCache } from '@/lib/accessControl';
import { ROLES } from '@/lib/constants';

const USER_ID = 'a'.repeat(24);
const RESUME_ID = 'c'.repeat(24);
const output = { resume: { profile: { full_name: 'Generated Test' } }, metadata: { jobTitle: 'Engineer', companyName: 'Fixture' } };

beforeEach(() => {
  vi.resetAllMocks();
  invalidateRoleCache();
  state.user = { _id: USER_ID, role: ROLES.ADMIN, mainResume: { content: { profile: { full_name: 'Master Test' } } } };
  mocks.ai.mockResolvedValue(output);
  mocks.track.mockResolvedValue(true);
  mocks.refund.mockResolvedValue(true);
  mocks.create.mockResolvedValue({ _id: RESUME_ID });
  mocks.link.mockResolvedValue(undefined);
});

function request(body = {}, userId = USER_ID) {
  return new Request('http://localhost/api/generate-content', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
    body: JSON.stringify({ jobDescription: 'Engineer wanted at Fixture', ...body }),
  });
}

describe('resume generation route and real prompt builder', () => {
  it.each([
    [ROLES.ADMIN, 'world-class executive resume strategist'],
    [ROLES.DEVELOPER, 'world-class executive resume strategist'],
    [ROLES.SUBSCRIBER, 'expert ATS-optimized resume writer'],
    [ROLES.USER, 'professional resume writer'],
  ])('generates successfully with the stored role %i', async (role, promptText) => {
    state.user.role = role;
    const response = await POST(request({ save: false }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ resumeId: null, ...output });
    expect(mocks.ai).toHaveBeenCalledWith('RESUME_GENERATION', expect.stringContaining(promptText), { parseJson: true });
    expect(mocks.info).toHaveBeenCalledWith('Resume content generated successfully', { userId: USER_ID, role });
    expect(mocks.refund).not.toHaveBeenCalled();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('uses database role and special-instruction policy instead of caller role claims', async () => {
    state.user.role = ROLES.USER;
    const response = await POST(request({ role: ROLES.ADMIN, userRole: ROLES.ADMIN, specialInstructions: 'PRIVATE_ADMIN_INSTRUCTION', save: false }));
    expect(response.status).toBe(200);
    const prompt = mocks.ai.mock.calls[0][1];
    expect(prompt).toContain('professional resume writer');
    expect(prompt).not.toContain('world-class executive');
    expect(prompt).not.toContain('PRIVATE_ADMIN_INSTRUCTION');
  });

  it('uses the master resume and persists generated content and its metadata within one credit', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).resumeId).toBe(RESUME_ID);
    expect(mocks.ai.mock.calls[0][1]).toContain('Master Test');
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith(USER_ID, 1);
    expect(mocks.create).toHaveBeenCalledWith(USER_ID, output.resume, output.metadata, { returnPopulated: false });
    expect(mocks.link).toHaveBeenCalledWith(USER_ID, RESUME_ID);
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it('supports explicit input and preview generation without persistence', async () => {
    const response = await POST(request({ resume: { profile: { full_name: 'Provided Test' } }, save: false }));
    expect(response.status).toBe(200);
    expect(mocks.ai.mock.calls[0][1]).toContain('Provided Test');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.link).not.toHaveBeenCalled();
  });

  it('refunds exactly once and logs the provider failure without saving', async () => {
    const error = new Error('synthetic provider failure');
    mocks.ai.mockRejectedValue(error);
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: 'Error generating resume content. Please try again.' });
    expect(mocks.refund).toHaveBeenCalledExactlyOnceWith(USER_ID, 1);
    expect(mocks.error).toHaveBeenCalledWith('Error generating content', error, { userId: USER_ID });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });

  it('returns usable generated content and a save warning when persistence fails', async () => {
    const error = new Error('synthetic save failure');
    mocks.create.mockRejectedValue(error);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ resumeId: null, ...output });
    expect(mocks.error).toHaveBeenCalledWith('Failed to save generated resume document', error, { userId: USER_ID });
    expect(mocks.link).not.toHaveBeenCalled();
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it('rejects missing authentication and permissions before credits or AI usage', async () => {
    expect((await POST(request({}, null))).status).toBe(401);
    state.user.role = 1234;
    expect((await POST(request())).status).toBe(403);
    expect(mocks.track).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });

  it('rejects missing job descriptions or credits without calling the provider', async () => {
    expect((await POST(request({ jobDescription: '' }))).status).toBe(400);
    expect(mocks.track).not.toHaveBeenCalled();
    mocks.track.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(mocks.refund).not.toHaveBeenCalled();
  });

  it('rejects oversized or malformed JSON before credits or AI usage', async () => {
    for (const [body, status] of [['{', 400], [JSON.stringify({ jobDescription: 'x'.repeat(300 * 1024) }), 413]]) {
      const response = await POST(new Request('http://localhost/api/generate-content', {
        method: 'POST', headers: { 'x-user-id': USER_ID }, body,
      }));
      expect(response.status).toBe(status);
    }
    expect(mocks.track).not.toHaveBeenCalled();
    expect(mocks.ai).not.toHaveBeenCalled();
  });
});
