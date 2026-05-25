import { callAI } from '@/lib/ai/client';
import dbConnect from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/apiKeyAuth';
import GatekeeperRules from '@/models/GatekeeperRules';
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

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { jobTitle, company, location, salary, description, platform, isEasyApply } = body;
  if (!jobTitle || !description) {
    return fail('jobTitle and description are required', 400);
  }

  await dbConnect();
  const rules = await GatekeeperRules.findOne({ userId: user._id });

  const userPrompt = `
USER RULES:
${JSON.stringify(rules ? rules.toObject() : {}, null, 2)}

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

  const result = await callAI('GATEKEEPER', GATEKEEPER_SYSTEM_PROMPT + '\n\n' + userPrompt, { parseJson: true });

  return ok(result);
});
