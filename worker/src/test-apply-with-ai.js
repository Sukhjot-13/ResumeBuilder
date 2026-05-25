/**
 * AI-assisted apply test.
 * Opens the given Indeed URL, fetches your master resume,
 * and uses DeepSeek AI to figure out what to click and fill.
 *
 * Usage: node src/test-apply-with-ai.js <indeed-url>
 * Example: node src/test-apply-with-ai.js 'https://ca.indeed.com/viewjob?jk=...'
 *
 * Prerequisites:
 *   - Worker .env with RESUME_BUILDER_API_KEY and DEEPSEEK_API_KEY
 *   - Next.js app running on RESUME_BUILDER_URL
 *   - Master resume uploaded at /profile
 *   - Indeed session cookies saved at /automation/settings/accounts
 */

import { config } from './config.js';
import { createBrowserContext } from './automation/browser.js';
import { randomDelay } from './automation/anti-detection.js';
import { getSessions } from './db-api.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = 'deepseek-chat';

// ---------------------------------------------------------------------------
// DeepSeek helper
// ---------------------------------------------------------------------------
async function askDeepSeek(systemPrompt, userMessages, responseFormat) {
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...userMessages.map(m => ({ role: 'user', content: m })),
    ],
    max_tokens: 4096,
    temperature: 0.1,
  };
  if (responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ---------------------------------------------------------------------------
// Resume formatting
// ---------------------------------------------------------------------------
function formatResumeAsText(resumeContent) {
  if (!resumeContent) return 'No resume available.';
  const lines = [];

  const profile = resumeContent.profile || {};
  if (profile.full_name) lines.push(`Name: ${profile.full_name}`);
  if (profile.email) lines.push(`Email: ${profile.email}`);
  if (profile.phone) lines.push(`Phone: ${profile.phone}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.website) lines.push(`Website: ${profile.website}`);
  if (profile.generic_summary) lines.push(`\nProfessional Summary:\n${profile.generic_summary}`);

  const work = resumeContent.work_experience || [];
  if (work.length > 0) {
    lines.push('\n--- Work Experience ---');
    for (const job of work) {
      const title = job.job_title || '';
      const company = job.company || '';
      const dates = [job.start_date, job.end_date].filter(Boolean).join(' – ');
      if (title || company) lines.push(`\n${title} at ${company}${dates ? ` (${dates})` : ''}`);
      const responsibilities = job.responsibilities || [];
      for (const r of responsibilities) lines.push(`  • ${r}`);
    }
  }

  const education = resumeContent.education || [];
  if (education.length > 0) {
    lines.push('\n--- Education ---');
    for (const edu of education) {
      const parts = [edu.institution, edu.degree, edu.field_of_study].filter(Boolean);
      if (parts.length > 0) lines.push(`\n${parts.join(' — ')}`);
      if (edu.relevant_coursework) lines.push(`  Relevant Coursework: ${edu.relevant_coursework}`);
      const bullets = edu.bullets || [];
      for (const b of bullets) lines.push(`  • ${b}`);
    }
  }

  const skills = resumeContent.skills || [];
  if (skills.length > 0) {
    const byCategory = {};
    for (const s of skills) {
      const cat = s.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s.skill_name);
    }
    lines.push('\n--- Skills ---');
    for (const [cat, names] of Object.entries(byCategory)) {
      lines.push(`  ${cat}: ${names.join(', ')}`);
    }
  }

  const additional = resumeContent.additional_info || {};
  if (additional.languages?.length) lines.push(`\nLanguages: ${additional.languages.join(', ')}`);
  if (additional.certifications?.length) lines.push(`Certifications: ${additional.certifications.join(', ')}`);
  if (additional.awards_activities?.length) lines.push(`Awards: ${additional.awards_activities.join(', ')}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Page text extraction (visible content only)
// ---------------------------------------------------------------------------
async function getPageContent(page) {
  return page.evaluate(() => {
    // Get all visible text, inputs, buttons, selects, textareas
    const elements = document.querySelectorAll('input, button, select, textarea, [contenteditable], label, legend, fieldset, h1, h2, h3, p, span, li, a');

    const items = [];
    for (const el of elements) {
      // Check visibility
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type') || '';
      const name = el.getAttribute('name') || '';
      const id = el.getAttribute('id') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const textContent = (el.textContent || '').trim().substring(0, 200);
      const value = (el.value || '').substring(0, 100);
      const required = el.hasAttribute('required');
      const className = el.className || '';
      const disabled = el.disabled || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
      const parentText = el.closest('fieldset')?.querySelector('legend')?.textContent?.trim() || '';
      const ariaRequired = el.getAttribute('aria-required') === 'true';

      const item = { tag, type, name, id, placeholder, ariaLabel, textContent, value, required, disabled, ariaRequired, className: className.substring(0, 100), parentText };
      items.push(item);
    }

    return items;
  });
}

// ---------------------------------------------------------------------------
// Remove overlapping/noisy elements
// ---------------------------------------------------------------------------
function deduplicatePageItems(items) {
  // Deduplicate by key attributes
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.tag}:${item.type}:${item.name}:${item.id}:${item.placeholder}:${item.ariaLabel}:${item.textContent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// System prompt for DeepSeek
// ---------------------------------------------------------------------------
function buildSystemPrompt(resumeText) {
  return `You are an AI assistant that helps automate job applications on Indeed.

You have the user's resume data below. Your job is to look at the current page state and decide what to do next.

RESUME DATA:
${resumeText}

RULES:
- Only interact with elements that are actually visible on the page.
- For text inputs: fill with matching data from the resume.
- For selects/dropdowns: choose the best matching option.
- For checkboxes: check if relevant.
- Skip optional fields if you don't have the data.
- If you hit a CAPTCHA or phone verification, report it and STOP.
- If you see an "Easy Apply" modal, work through it step by step.
- If the job redirects to an external site, report what you see.

You must respond with a JSON object:
{
  "thought": "brief explanation of what you see and what you plan to do",
  "actions": [
    {
      "action": "click" | "fill" | "select" | "wait" | "scroll" | "done" | "stop",
      "selector": "CSS selector or 'text:visible text content' for buttons/links",
      "value": "value to fill (for fill/select actions)",
      "reason": "why this action"
    }
  ]
}

- Use "action": "done" when the application appears to be submitted (you see a confirmation/success message).
- Use "action": "stop" when you hit a CAPTCHA, phone verification, or can't proceed.
- For "click" actions: ALWAYS use "text:EXACT VISIBLE TEXT" format (e.g. "text:Apply with Indeed"). NEVER guess attribute selectors — those almost never match.
- For "fill" actions: provide the text value to enter. Use the field's placeholder text or the label text as the selector with "text:" prefix.
- For "wait" actions: wait time in ms (default 2000).
- Be thorough — look for all required fields and fill them.
- CRITICAL: Check if buttons are disabled before clicking them. Look at the page elements — if a "Continue" button exists but is disabled, look for error messages, validation warnings, or missing required fields on the page. Fill in what's missing BEFORE clicking Continue.
- After clicking Continue, check if the page changed. If it didn't, there may be a validation error or required question you missed.
- If there are radio buttons or checkboxes, fill/select them before clicking Continue.
- Look for text inputs, selects, or textareas that are empty but have labels suggesting they're required.`;
}

// ---------------------------------------------------------------------------
// Execute DeepSeek's actions in the browser
// ---------------------------------------------------------------------------
async function executeActions(page, actions) {
  for (const act of actions) {
    const { action, selector, value, reason } = act;
    console.log(`  [AI action] ${action}${selector ? ` "${selector}"` : ''}${value ? ` = "${value}"` : ''}${reason ? ` — ${reason}` : ''}`);

    switch (action) {
      case 'click': {
        let clicked = false;

        // text: prefix → find by visible text content (works on both Page and Frame)
        if (selector.startsWith('text:')) {
          const searchText = selector.slice(5).trim();
          // Exact match first
          let loc = page.locator('button, a, [role="button"], input[type="submit"], input[type="button"], span, label')
            .filter({ hasText: new RegExp(`^${escapeRegex(searchText)}$`, 'i') });
          if (await loc.count() === 0) {
            // Partial match
            loc = page.locator('button, a, [role="button"], input[type="submit"], input[type="button"], span, label')
              .filter({ hasText: new RegExp(escapeRegex(searchText), 'i') });
          }
          if (await loc.count() > 0) {
            const el = loc.first();
            try {
              await el.scrollIntoViewIfNeeded({ timeout: 2000 });
              await randomDelay(200, 500);
            } catch {
              // Element might be covered or not scrollable — try clicking anyway
            }
            await el.click({ timeout: 5000 }).catch(() => {
              // click failed, try force click via evaluate
              return el.evaluate(el => el.click());
            });
            clicked = true;
            console.log('    ✓ clicked by text');
          } else {
            console.log(`    ✗ could not find element with text "${searchText}"`);
          }
          break;
        }

        // XPath
        if (selector.startsWith('//') || selector.startsWith('./')) {
          const els = await page.$x(selector);
          if (els.length > 0) {
            await els[0].scrollIntoViewIfNeeded();
            await randomDelay(200, 500);
            await els[0].click();
            clicked = true;
          }
        } else {
          // CSS selector
          const el = await page.$(selector);
          if (el) {
            await el.scrollIntoViewIfNeeded();
            await randomDelay(200, 500);
            await el.click();
            clicked = true;
          }
        }

        if (clicked) {
          console.log('    ✓ clicked');
        } else if (!selector.startsWith('text:')) {
          // Last resort: try page.click
          console.log('    ✗ element not found, trying page.click');
          try {
            await page.click(selector);
            console.log('    ✓ clicked via page.click');
          } catch {
            console.log('    ✗ could not click');
          }
        }
        break;
      }
      case 'fill': {
        // Try multiple selector strategies
        let filled = false;
        const strategies = [
          () => page.$(selector),
          () => page.$(`input[name="${selector}"]`),
          () => page.$(`input[placeholder*="${selector}"]`),
          () => page.$(`textarea[name="${selector}"]`),
          () => page.$(`[aria-label*="${selector}"]`),
        ];
        for (const strat of strategies) {
          try {
            const el = await strat();
            if (el) {
              await el.click();
              await el.fill('');
              await randomDelay(100, 300);
              await el.fill(value);
              filled = true;
              console.log('    ✓ filled');
              break;
            }
          } catch {}
        }
        if (!filled) {
          try {
            await page.fill(selector, value);
            console.log('    ✓ filled via page.fill');
            filled = true;
          } catch {}
        }
        if (!filled) console.log('    ✗ could not fill — field not found');
        break;
      }
      case 'select': {
        try {
          await page.selectOption(selector, value);
          console.log('    ✓ selected');
        } catch {
          console.log('    ✗ could not select');
        }
        break;
      }
      case 'scroll':
        await page.evaluate(() => window.scrollBy(0, 500));
        await randomDelay(300, 600);
        break;
      case 'wait':
        await randomDelay(1500, 3000);
        break;
      case 'done':
        console.log('  ✓ Application submitted!');
        return 'done';
      case 'stop':
        console.log('  ⚠ Cannot proceed (CAPTCHA/blocker)');
        return 'stop';
    }
    await randomDelay(500, 1000);
  }
  return 'continue';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node src/test-apply-with-ai.js <indeed-job-url>');
    process.exit(1);
  }
  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not set in .env');
    process.exit(1);
  }

  console.log('============================================');
  console.log('  AI-Assisted Apply Test');
  console.log('============================================\n');

  // 1. Fetch master resume
  console.log('[1] Fetching master resume...');
  const BASE = config.resumeBuilderUrl;
  const HEADERS = {
    'Authorization': `Bearer ${config.resumeBuilderApiKey}`,
    'Content-Type': 'application/json',
  };
  const profileRes = await fetch(`${BASE}/api/user/profile`, { method: 'GET', headers: HEADERS });
  if (!profileRes.ok) {
    console.error(`  ✗ Profile API: ${profileRes.status}`);
    process.exit(1);
  }
  const profile = await profileRes.json();
  const masterResume = profile.mainResume;
  if (!masterResume) {
    console.error('  ✗ No master resume found. Upload one at /profile');
    process.exit(1);
  }
  const resumeText = formatResumeAsText(masterResume.content || masterResume);
  console.log('  ✓ Master resume loaded');
  console.log(`  Name: ${masterResume.content?.profile?.full_name || '?'}`);

  // 2. Get platform session
  console.log('\n[2] Fetching Indeed session cookies...');
  const sessions = await getSessions();
  const session = sessions.find(s => s.platform === 'indeed');
  if (!session || !session.isValid) {
    console.error('  ✗ No valid Indeed session. Save cookies at /automation/settings/accounts');
    process.exit(1);
  }
  console.log('  ✓ Indeed session valid');

  // 3. Launch browser
  console.log('\n[3] Launching browser...');
  const { browser, context } = await createBrowserContext();
  const page = await context.newPage();

  // Inject cookies
  if (session.cookies) {
    const cookies = typeof session.cookies === 'string' ? JSON.parse(session.cookies) : session.cookies;
    await context.addCookies(
      cookies.map((c) => {
        const raw = (c.sameSite || '').toLowerCase();
        const sameSite = raw === 'none' ? 'None' : raw === 'strict' ? 'Strict' : 'Lax';
        return {
          name: c.name,
          value: c.value,
          domain: c.domain || '.indeed.com',
          path: c.path || '/',
          httpOnly: c.httpOnly ?? true,
          secure: c.secure ?? true,
          sameSite,
        };
      })
    );
    console.log('  ✓ Session cookies injected');
  }

  // 4. Navigate to the job
  console.log(`\n[4] Navigating to job...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('  ✓ Page loaded');

  // 5. Find and click the apply button on the job page
  console.log('\n[5] Looking for apply button on job page...');
  const applySelectors = [
    'button[indeed-apply*=""]',
    'button[id*="apply"]',
    'button[class*="apply"]',
    'a[id*="apply"]',
    'button:has-text("Apply now")',
    'button:has-text("Apply")',
    'button:has-text("Easy Apply")',
    'a:has-text("Apply now")',
    'a:has-text("Apply")',
    '[data-testid*="apply"]',
    '.jobsearch-IndeedApplyButton',
    '.icl-IndeedApplyButton',
  ];
  let applyClicked = false;
  for (const sel of applySelectors) {
    const btn = await page.$(sel);
    if (btn) {
      await randomDelay(1000, 2000);
      await btn.scrollIntoViewIfNeeded();
      await randomDelay(300, 600);
      await btn.click();
      applyClicked = true;
      console.log('  ✓ Apply button clicked');
      await randomDelay(2000, 3000);
      break;
    }
  }

  if (!applyClicked) {
    // Try finding any button with "apply" in the text
    const allButtons = await page.$$('button, a');
    for (const btn of allButtons) {
      const text = (await btn.evaluate(el => el.textContent)).toLowerCase();
      if (text.includes('apply now') || text.includes('apply') || text.includes('easy apply')) {
        await randomDelay(1000, 2000);
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        applyClicked = true;
        console.log('  ✓ Apply button clicked (found by text)');
        await randomDelay(2000, 3000);
        break;
      }
    }
  }

  if (!applyClicked) {
    console.log('  ℹ No apply button found — page may already show the apply form');
  }

  // 6. Try the standard "Apply with Indeed" button using text matching
  if (!applyClicked) {
    console.log('\n[6] Looking for "Apply with Indeed" button by text...');
    const applyTexts = ['Apply with Indeed', 'Apply now', 'Easy Apply', 'Apply'];
    for (const text of applyTexts) {
      // Exact match (trimmed) first
      let btn = page.getByRole('button', { name: text, exact: true });
      if (await btn.count() === 0) {
        // Partial match on text content
        btn = page.getByText(text, { exact: false }).first();
      }
      if (await btn.count() > 0) {
        await btn.scrollIntoViewIfNeeded();
        await randomDelay(300, 600);
        await btn.click();
        console.log(`  ✓ Clicked "${text}" button`);
        applyClicked = true;
        await randomDelay(2000, 3000);
        break;
      }
    }
  }

  // 7. Helper: detect Indeed apply iframe (prefers smartapply/indeedapply over recaptcha)
  let target = page;

  async function detectTarget() {
    const frames = page.frames();
    const mainUrl = page.url();

    // If main page is already on an Indeed apply form page, use it directly
    if (mainUrl.includes('indeedapply') || mainUrl.includes('smartapply')) {
      target = page;
      console.log(`  ℹ Using main page (apply form URL)`);
      return true;
    }

    const nonBlank = frames.filter(f => f.url() !== 'about:blank' && f.url() !== mainUrl);
    // Exclude known CAPTCHA/ad frames
    const nonCaptcha = nonBlank.filter(f =>
      !f.url().includes('recaptcha') && !f.url().includes('hcaptcha')
    );
    if (nonCaptcha.length > 0) {
      // Prefer Indeed apply frames
      const applyFrame = nonCaptcha.find(f =>
        f.url().includes('smartapply') || f.url().includes('indeedapply')
      );
      target = applyFrame || nonCaptcha[0];
      console.log(`  ℹ Targeting frame: ${target.url().substring(0, 120)}`);
      return true;
    }
    if (target !== page) {
      const pageFrames = page.frames();
      if (!pageFrames.includes(target)) {
        console.log('  ℹ Frame lost — falling back to main page');
        target = page;
      }
    }
    return false;
  }

  // Wait up to 15s for the Indeed apply iframe to appear
  async function waitForApplyFrame() {
    console.log('  Waiting for apply form iframe...');
    for (let i = 0; i < 15; i++) {
      await randomDelay(1000, 1200);
      const frames = page.frames();
      const applyFrame = frames.find(f =>
        f.url().includes('smartapply') || f.url().includes('indeedapply')
      );
      if (applyFrame) {
        target = applyFrame;
        console.log(`  ✓ Apply iframe loaded: ${target.url().substring(0, 100)}`);
        return true;
      }
    }
    console.log('  ℹ Apply iframe not found — falling back to detectTarget');
    return detectTarget();
  }

  // Wait for the preloader to finish and the actual form to render
  async function waitForFormContent() {
    console.log('  Waiting for form content to render...');
    for (let i = 0; i < 20; i++) {
      await randomDelay(1000, 1200);
      // Check if frame URL changed away from preload
      const frames = page.frames();
      const applyFrame = frames.find(f =>
        f.url().includes('smartapply') || f.url().includes('indeedapply')
      );
      if (applyFrame && !applyFrame.url().includes('preload')) {
        target = applyFrame;
        console.log(`  ✓ Form loaded: ${target.url().substring(0, 100)}`);
        return;
      }
      // Even if still on preload, check if content appeared
      const content = await getContent();
      if (content.length > 5) {
        console.log(`  ✓ ${content.length} elements detected`);
        return;
      }
    }
    console.log('  ℹ Form content check timed out — proceeding anyway');
  }

  await waitForApplyFrame();
  await waitForFormContent();

  // Helper: get page content from the current target (re-detects iframes each call)
  async function getContent() {
    // Re-detect target in case an iframe opened since last check
    if (page !== target) {
      const frames = page.frames();
      if (!frames.includes(target)) {
        await detectTarget();
      }
    }
    // Wait up to 5s for any content to appear in the target
    try {
      await target.waitForSelector('input, button, select, textarea, [contenteditable], label', { timeout: 5000 });
    } catch {
      // Timeout is fine — target may still have non-form content
    }
    return target.evaluate(() => {
      // Traverse into shadow roots to catch web component content
      function collect(el, items) {
        // Query light DOM
        const found = el.querySelectorAll('input, button, select, textarea, [contenteditable], label, legend, h1, h2, h3, p, li, span, a, [role="button"], [role="textbox"], [role="combobox"]');
        for (const e of found) {
          const style = window.getComputedStyle(e);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          const rect = e.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          items.push({
            tag: e.tagName.toLowerCase(),
            type: e.getAttribute('type') || '',
            name: e.getAttribute('name') || '',
            id: e.getAttribute('id') || '',
            placeholder: e.getAttribute('placeholder') || '',
            ariaLabel: e.getAttribute('aria-label') || '',
            textContent: (e.textContent || '').trim().substring(0, 150),
            value: (e.value || '').substring(0, 100),
            required: e.hasAttribute('required'),
            disabled: e.disabled || e.hasAttribute('disabled'),
            className: (e.className || '').substring(0, 100),
          });
        }
        // Recurse into shadow roots
        const all = el.querySelectorAll('*');
        for (const child of all) {
          if (child.shadowRoot) collect(child.shadowRoot, items);
        }
      }
      const items = [];
      collect(document, items);
      return items;
    });
  }

  // 8. AI loop — ask DeepSeek what to do
  console.log('\n[8] AI-assisted form filling (DeepSeek)...\n');
  const systemPrompt = buildSystemPrompt(resumeText);
  let maxSteps = 30;
  let pageContent = await getContent();
  let previousActions = [];
  let stuckCount = 0;

  while (maxSteps-- > 0) {
    const deduped = deduplicatePageItems(pageContent);
    console.log(`  [Step ${30 - maxSteps}] Target has ${deduped.length} visible interactive elements`);

    const userMessage = {
      role: 'user',
      content: JSON.stringify({
        instruction: 'Analyze the current page state and tell me what to do next.',
        pageElements: deduped.slice(0, 150),
        previousActions: previousActions.slice(-5),
      })
    };

    const responseText = await askDeepSeek(
      systemPrompt,
      [userMessage.content],
      'json'
    );

    let decision;
    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      decision = JSON.parse(jsonStr);
    } catch {
      console.log(`  ⚠ Could not parse DeepSeek response as JSON, raw:`);
      console.log(`  ${responseText.substring(0, 500)}`);
      await randomDelay(1000, 2000);
      pageContent = await getContent();
      continue;
    }

    console.log(`  💭 ${decision.thought || 'No thought provided'}`);

    if (!decision.actions || decision.actions.length === 0) {
      console.log('  ⚠ No actions returned, waiting...');
      await randomDelay(2000, 3000);
      pageContent = await getContent();
      continue;
    }

    previousActions.push(...decision.actions.map(a => ({ action: a.action, selector: a.selector, value: a.value })));

    const result = await executeActions(target, decision.actions);
    await randomDelay(1500, 2500);

    if (result === 'done') {
      console.log('\n============================================');
      console.log('  ✅ APPLICATION SUBMITTED SUCCESSFULLY');
      console.log('============================================');
      await browser.close();
      process.exit(0);
    }

    if (result === 'stop') {
      // Don't panic — wait a moment, the CAPTCHA might finish loading and reveal the form
      console.log('  ⚠ Possible CAPTCHA — waiting 4s to see if more content loads...');
      await randomDelay(4000, 4500);
      await detectTarget();
      const afterWait = await getContent();
      if (afterWait.length > 0) {
        const hash = JSON.stringify(afterWait.slice(0, 30).map(i => `${i.tag}:${i.textContent}`));
        if (hash !== JSON.stringify(pageContent.slice(0, 30).map(i => `${i.tag}:${i.textContent}`))) {
          stuckCount = 0;
          pageContent = afterWait;
          console.log('  Content loaded after wait — resuming.');
          continue;
        }
      }
      // Still blocked — give user time to solve manually
      console.log('\n⚠ BLOCKER DETECTED (CAPTCHA or manual step needed)');
      console.log('  Waiting 5s for you to resolve it...\n');
      await randomDelay(5000, 5500);
      // Check if the main page URL changed (e.g., redirected to homepage after CAPTCHA)
      // But don't re-navigate if we're already on an Indeed apply form page
      const currentUrl = page.url();
      const onApplyForm = currentUrl.includes('indeedapply') || currentUrl.includes('smartapply');
      const lostJob = !currentUrl.includes(url) && !currentUrl.includes('viewjob') && !currentUrl.includes('indeed.com/jobs');
      if (lostJob && !onApplyForm) {
        console.log(`  URL changed to ${currentUrl.substring(0, 80)} — re-navigating to job...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 3000);
      }
      // Re-check: maybe the blocker was resolved
      await detectTarget();
      const recheck = await getContent();
      if (recheck.length > 0) {
        stuckCount = 0;
        pageContent = recheck;
        console.log('  Page changed — resuming automation.');
        continue;
      }
      console.log('  Still blocked. Giving you another 5s...\n');
      await randomDelay(5000, 5500);
      const currentUrl2 = page.url();
      const lostJob2 = !currentUrl2.includes(url) && !currentUrl2.includes('viewjob') && !currentUrl2.includes('indeed.com/jobs');
      if (lostJob2 && !currentUrl2.includes('indeedapply') && !currentUrl2.includes('smartapply')) {
        console.log(`  URL still wrong — re-navigating...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 3000);
      }
      await detectTarget();
      pageContent = await getContent();
      stuckCount = 0;
      continue;
    }

    // Re-detect iframe target and get updated content
    await detectTarget();
    const newContent = await getContent();

    // Loop detection: check if the page actually changed
    const newHash = JSON.stringify(newContent.slice(0, 30).map(i => `${i.tag}:${i.textContent}`));
    const oldHash = JSON.stringify(pageContent.slice(0, 30).map(i => `${i.tag}:${i.textContent}`));

    if (newHash === oldHash) {
              stuckCount++;
              console.log(`  ⚠ Page didn't change (${stuckCount}/3)`);
              if (stuckCount >= 3) {
                console.log(`  ⚠ Stuck in a loop — trying auto-fix...`);
                // Try auto-fix: unchecked checkboxes or terms
                const autoFixed = await target.evaluate(() => {
                  const cbs = [...document.querySelectorAll('input[type="checkbox"]:not(:checked), [role="checkbox"][aria-checked="false"]')];
                  for (const cb of cbs) {
                    const label = cb.closest('label') || cb.closest('[class*="checkbox"]');
                    if (label) { label.click(); return true; }
                    cb.click(); return true;
                  }
                  const terms = [...document.querySelectorAll('a, button, span, label')].find(el =>
                    /agree|terms|consent/i.test(el.textContent)
                  );
                  if (terms) { terms.click(); return true; }
                  return false;
                });
                if (autoFixed) {
                  console.log(`  ✓ Auto-fixed — resuming`);
                  stuckCount = 0;
                  await randomDelay(1500, 2500);
                  pageContent = await getFormContent(page, target);
                  continue;
                }
                // Log errors for debugging
                const errors = await target.evaluate(() => {
                  return [...document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"]')]
                    .map(el => el.textContent.trim()).filter(Boolean);
                });
                if (errors.length > 0) {
                  console.log(`  Issues: ${errors.join(' | ').substring(0, 200)}`);
                }
                // Give user 10s to fix manually
                console.log(`  ⚠ Giving you 10s to fix in the browser...`);
                for (let i = 0; i < 10; i++) {
                  await randomDelay(1000, 1100);
                  target = detectTarget(page);
                  const freshContent = await getFormContent(page, target);
                  const freshHash = JSON.stringify(freshContent.slice(0, 30).map(i => `${i.tag}:${i.textContent}`));
                  if (freshHash !== newHash) {
                    stuckCount = 0;
                    pageContent = freshContent;
                    console.log(`  ✓ Page changed — resuming`);
                    break;
                  }
                }
                if (stuckCount > 0) {
                  const btnState = await target.evaluate(() => {
                    const btns = [...document.querySelectorAll('button')];
                    const s = btns.find(b => /submit|apply|send/i.test(b.textContent));
                    if (s && !s.disabled) return 'enabled';
                    const c = btns.find(b => /continue|next/i.test(b.textContent));
                    if (c && !c.disabled) return 'enabled';
                    return 'disabled';
                  });
                  console.log(`  Submit button: ${btnState}`);
                  if (btnState === 'enabled') {
                    console.log(`  Submit button is enabled — resuming`);
                    stuckCount = 0;
                    pageContent = await getFormContent(page, target);
                    continue;
                  }
                  console.log(`  Still stuck — moving on`);
                  break;
                }
              }
            } else {
              stuckCount = 0;
            }
            pageContent = newContent;
  }

  console.log('\n============================================');
  console.log('  ⚠ Max steps reached — form may be incomplete');
  console.log('  Check the browser window');
  console.log('============================================');
  await browser.close();
  process.exit(1);
}

main().catch(err => {
  console.error('\nFatal:', err);
  process.exit(1);
});
