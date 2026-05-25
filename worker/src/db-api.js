import crypto from 'crypto';
import { config } from './config.js';

const BASE = config.resumeBuilderUrl;
const HEADERS = {
  'Authorization': `Bearer ${config.resumeBuilderApiKey}`,
  'Content-Type': 'application/json',
};

// AES-256-GCM decryption — mirrors src/lib/encryption.js in the Next.js app
function decryptCookies(encryptedText) {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const tag = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const key = crypto.createHash('sha256').update(String(config.cookieEncryptionKey)).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Failed to decrypt cookies:', err.message);
    return null;
  }
}

async function request(method, path, body) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export function getSchedulerSettings() { return request('GET', '/api/automation/scheduler'); }
export function getPendingJobListings() { return request('GET', '/api/automation/jobs?status=pending'); }
export function saveJobListing(job) { return request('POST', '/api/automation/jobs', job); }
export function evaluateJob(job) {
  return request('POST', '/api/gatekeeper/evaluate', {
    jobTitle: job.title, company: job.company, location: job.location,
    salary: job.salary, description: job.description, platform: job.platform, isEasyApply: job.isEasyApply,
  });
}
export function generateResume(jobDescription, userProfile) {
  return request('POST', '/api/generate-content', { jobDescription, userProfile });
}
export function saveApplication(app) { return request('POST', '/api/automation/applications', app); }
export async function getSessions() {
  const data = await request('GET', '/api/automation/sessions');
  if (!Array.isArray(data)) return [];
  return data.map(s => ({
    ...s,
    cookies: decryptCookies(s.cookiesEncrypted),
  }));
}
export function getDailyCount() { return request('GET', '/api/automation/daily-count'); }
export function incrementDailyCount() { return request('POST', '/api/automation/daily-count'); }
export function getJobCriteria() { return request('GET', '/api/automation/criteria'); }
