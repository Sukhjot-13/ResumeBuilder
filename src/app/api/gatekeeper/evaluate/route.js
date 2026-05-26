import { callAI } from '@/lib/ai/client';
import dbConnect from '@/lib/mongodb';
import { authenticateRequest, checkRateLimit } from '@/lib/apiKeyAuth';
import GatekeeperRules from '@/models/GatekeeperRules';
import JobCriteria from '@/models/JobCriteria';
import GatekeeperDecision from '@/models/GatekeeperDecision';
import SchedulerSettings from '@/models/SchedulerSettings';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

const GATEKEEPER_SYSTEM_PROMPT = `
You are a job application gatekeeper. Evaluate job listings against
the user's rules and decide whether they should apply.

Rules for evaluation:
- Experience gaps of 1 year are acceptable. 3+ years gap = reject.
- "Must have" vs "nice to have" — distinguish these in job descriptions.
- If salary is listed and below user's minimum, reject.
- Respect all excluded companies and keywords strictly.
- Apply custom instructions literally and carefully.

Return ONLY valid JSON, no other text, no markdown:
{
  "apply": boolean,
  "confidence": number (0-100),
  "reason": "1-2 sentences",
  "flags": [{ "type": "warning|info|block", "message": "string" }],
  "keywordsFound": ["string"],
  "keywordsMissing": ["string"]
}
`;

export const POST = withErrorHandler(async (request) => {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  await dbConnect();

  // Rate limiting — use user's configured daily limit from scheduler settings
  const scheduler = await SchedulerSettings.findOne({ userId: user._id });
  const rateLimit = scheduler?.dailyRateLimit ?? 100;
  const rateLimitError = await checkRateLimit(user._id.toString(), rateLimit);
  if (rateLimitError) return rateLimitError.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { jobId, jobTitle, company, location, salary, description, platform, isEasyApply } = body;
  if (!jobTitle || !description) {
    return fail('jobTitle and description are required', 400);
  }

  const rules = await GatekeeperRules.findOne({ userId: user._id });
  const criteria = await JobCriteria.findOne({ userId: user._id });

  // Merge GatekeeperRules (filtering rules) with JobCriteria (salary/work-mode)
  const mergedRules = {
    targetTitles: rules?.targetTitles || [],
    excludeCompanies: rules?.excludeCompanies || [],
    excludeKeywords: rules?.excludeKeywords || [],
    requiredKeywords: rules?.requiredKeywords || [],
    seniorityLevels: rules?.seniorityLevels || [],
    excludeSeniorityLevels: rules?.excludeSeniorityLevels || [],
    customInstructions: rules?.customInstructions || '',
    minSalary: criteria?.minSalary,
    allowRemote: criteria?.remote ?? true,
    allowHybrid: criteria?.hybrid ?? true,
    allowOnSite: criteria?.onSite ?? false,
  };

  const rulesBlock = rules || criteria
    ? JSON.stringify(mergedRules, null, 2)
    : 'No user-defined rules — evaluate based on general best practices.';

  const userPrompt = `
USER RULES:
${rulesBlock}

JOB:
Title: ${jobTitle}
Company: ${company || 'Not disclosed'}
Location: ${location || 'Not disclosed'}
Salary: ${salary || 'Not disclosed'}
Easy Apply: ${isEasyApply ? 'Yes' : 'No'}
Platform: ${platform || 'Not specified'}

Full Description:
${description}

Evaluate and return JSON.
`;

  // Retry once if AI parse fails (Gemini sometimes returns non-JSON)
  let result;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      result = await callAI('GATEKEEPER', GATEKEEPER_SYSTEM_PROMPT + '\n\n' + userPrompt, { parseJson: true });
      break;
    } catch (aiErr) {
      if (attempt === 0) {
        console.log(`[Gatekeeper] AI error (attempt 1): ${aiErr.message} — retrying...`);
        continue;
      }
      throw aiErr;
    }
  }

  // Persist the decision for audit trail
  if (jobId) {
    try {
      await GatekeeperDecision.create({
        jobId,
        apply: result.apply,
        confidence: result.confidence,
        reason: result.reason,
        flags: result.flags || [],
        keywordsFound: result.keywordsFound || [],
        keywordsMissing: result.keywordsMissing || [],
      });
    } catch (saveErr) {
      // Non-fatal — the decision was still made
      console.error('[Gatekeeper] Failed to persist decision:', saveErr.message);
    }
  }

  return ok(result);
});
