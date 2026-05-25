import { getPendingJobListings, getSessions, getSchedulerSettings, saveApplication } from '../../db-api.js';
import { createBrowserContext } from '../../automation/browser.js';
import { randomDelay } from '../../automation/anti-detection.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = 'deepseek-chat';

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    for (const e of education) {
      const parts = [e.institution, e.degree, e.field_of_study].filter(Boolean);
      if (parts.length > 0) lines.push(`\n${parts.join(' — ')}`);
      if (e.relevant_coursework) lines.push(`  Relevant Coursework: ${e.relevant_coursework}`);
      const bullets = e.bullets || [];
      for (const b of bullets) lines.push(`  • ${b}`);
    }
  }
  const skills = resumeContent.skills || [];
  if (skills.length > 0) {
    lines.push('\n--- Skills ---');
    const byCategory = {};
    for (const s of skills) {
      const cat = s.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s.skill_name);
    }
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

// ── Page content extraction (with shadow DOM, re-detects iframe) ────────

async function getFormContent(page, target) {
  // Re-detect target in case frame changed
  if (page !== target) {
    const frames = page.frames();
    if (!frames.includes(target)) {
      target = detectTarget(page);
    }
  }
  try {
    await target.waitForSelector('input, button, select, textarea, [contenteditable], label', { timeout: 5000 });
  } catch { /* timeout OK */ }
  return target.evaluate(() => {
    function collect(root, items) {
      const found = root.querySelectorAll('input, button, select, textarea, [contenteditable], label, legend, h1, h2, h3, p, li, span, a, [role="button"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"]');
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
      const all = root.querySelectorAll('*');
      for (const child of all) {
        if (child.shadowRoot) collect(child.shadowRoot, items);
      }
    }
    const items = [];
    collect(document, items);
    return items;
  });
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter(i => {
    const key = `${i.tag}:${i.type}:${i.name}:${i.id}:${i.placeholder}:${i.ariaLabel}:${i.textContent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── AI actions executor (works on both Page and Frame) ───────────────────

async function executeActions(target, actions) {
  for (const act of actions) {
    const { action, selector, value, reason } = act;
    console.log(`  [Apply AI] ${action}${selector ? ` "${selector}"` : ''}${value ? ` = "${value}"` : ''}${reason ? ` — ${reason}` : ''}`);

    switch (action) {
      case 'click': {
        let clicked = false;
        if (selector.startsWith('text:')) {
          const text = selector.slice(5).trim();
          let loc = target.locator('button, a, [role="button"], input[type="submit"], input[type="button"], span, label')
            .filter({ hasText: new RegExp(`^${escapeRegex(text)}$`, 'i') });
          if (await loc.count() === 0) {
            loc = target.locator('button, a, [role="button"], input[type="submit"], input[type="button"], span, label')
              .filter({ hasText: new RegExp(escapeRegex(text), 'i') });
          }
          if (await loc.count() > 0) {
            const el = loc.first();
            try { await el.scrollIntoViewIfNeeded({ timeout: 2000 }); await randomDelay(200, 500); } catch {}
            try { await el.click({ timeout: 5000 }); } catch { await el.evaluate(el => el.click()); }
            clicked = true;
            console.log('    ✓ clicked by text');
          }
        } else if (selector.startsWith('//') || selector.startsWith('./')) {
          const els = await target.$x(selector);
          if (els.length > 0) {
            try { await els[0].scrollIntoViewIfNeeded(); } catch {}
            await randomDelay(200, 500);
            await els[0].click();
            clicked = true;
          }
        } else {
          const el = await target.$(selector);
          if (el) {
            try { await el.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch {}
            try { await el.click({ timeout: 5000 }); } catch { await el.evaluate(el => el.click()); }
            clicked = true;
          }
        }
        if (clicked) {
          console.log('    ✓ clicked');
        } else if (!selector.startsWith('text:')) {
          try { await target.click(selector); console.log('    ✓ clicked via page.click'); } catch { console.log('    ✗ could not click'); }
        }
        break;
      }
      case 'fill': {
        let filled = false;
        const strategies = [
          () => target.$(selector),
          () => target.$(`input[name="${selector}"]`),
          () => target.$(`input[placeholder*="${selector}"]`),
          () => target.$(`textarea[name="${selector}"]`),
          () => target.$(`[aria-label*="${selector}"]`),
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
              break;
            }
          } catch {}
        }
        if (!filled) { try { await target.fill(selector, value); filled = true; } catch {} }
        console.log(`    ${filled ? '✓' : '✗'} filled`);
        break;
      }
      case 'select':
        try { await target.selectOption(selector, value); console.log('    ✓ selected'); } catch { console.log('    ✗ select'); }
        break;
      case 'scroll':
        await target.evaluate(() => window.scrollBy(0, 500));
        await randomDelay(300, 600);
        break;
      case 'wait':
        await randomDelay(1500, 3000);
        break;
      case 'done':
        console.log('  ✓ Application submitted!');
        return 'done';
      case 'stop':
        return 'stop';
    }
    await randomDelay(500, 1000);
  }
  return 'continue';
}

// ── Frame / CAPTCHA detection ──────────────────────────────────────────────

function detectTarget(page) {
  const mainUrl = page.url();
  if (mainUrl.includes('indeedapply') || mainUrl.includes('smartapply')) return page;
  const frames = page.frames().filter(f =>
    f.url() !== 'about:blank' && f.url() !== mainUrl &&
    !f.url().includes('recaptcha') && !f.url().includes('hcaptcha')
  );
  return frames.find(f => f.url().includes('smartapply') || f.url().includes('indeedapply')) || frames[0] || page;
}

async function waitForApplyFrame(page) {
  for (let i = 0; i < 20; i++) {
    await randomDelay(1000, 1200);
    const target = detectTarget(page);
    if (target !== page) return target;
    if (page.url().includes('indeedapply') || page.url().includes('smartapply')) return page;
  }
  return null;
}

// ── Main processor ─────────────────────────────────────────────────────────

export async function applyJobProcessor(job) {
  const { jobId, resumeId } = job.data;
  console.log(`[Apply] Starting application for job ${jobId}`);

  const settings = await getSchedulerSettings();
  if (!settings || !settings.enabled) return;

  const listings = await getPendingJobListings();
  const listing = listings.find(l => l._id === jobId);
  if (!listing) { console.log(`[Apply] Job ${jobId} not found`); return; }

  const sessions = await getSessions();
  const session = sessions.find(s => s.platform === listing.platform);
  if (!session || !session.isValid) {
    console.log(`[Apply] No valid session for ${listing.platform}`);
    return;
  }

  if (!DEEPSEEK_API_KEY) {
    console.log(`[Apply] DEEPSEEK_API_KEY not set — can't do AI form filling, skipping apply`);
    return;
  }

  // Fetch master resume for AI form filling
  let resumeText = '';
  try {
    const BASE = process.env.RESUME_BUILDER_URL || 'http://localhost:3000';
    const HEADERS = {
      'Authorization': `Bearer ${process.env.RESUME_BUILDER_API_KEY}`,
      'Content-Type': 'application/json',
    };
    const profileRes = await fetch(`${BASE}/api/user/profile`, { method: 'GET', headers: HEADERS });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      const masterResume = profile.mainResume;
      if (masterResume) {
        resumeText = formatResumeAsText(masterResume.content || masterResume);
        console.log(`[Apply] Master resume loaded`);
      }
    }
  } catch (err) {
    console.log(`[Apply] Could not fetch resume: ${err.message} — will try without AI`);
  }

  let browser;
  try {
    browser = await createBrowserContext();
    const page = await browser.newPage();
    await randomDelay(settings.minDelaySeconds * 1000, settings.maxDelaySeconds * 1000);

    // Inject platform session cookies
    if (session.cookies) {
      const cookies = typeof session.cookies === 'string' ? JSON.parse(session.cookies) : session.cookies;
      await browser.addCookies(
        cookies.map((c) => {
          const raw = (c.sameSite || '').toLowerCase();
          const sameSite = raw === 'none' ? 'None' : raw === 'strict' ? 'Strict' : 'Lax';
          return {
            name: c.name,
            value: c.value,
            domain: c.domain || `.${listing.platform}.com`,
            path: c.path || '/',
            httpOnly: c.httpOnly ?? true,
            secure: c.secure ?? true,
            sameSite,
          };
        })
      );
    }

    if (!listing.applyUrl) throw new Error('No apply URL');
    await page.goto(listing.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[Apply] Navigated to ${listing.applyUrl}`);

    // ── Find and click the apply button ──
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
        try { await btn.scrollIntoViewIfNeeded(); } catch {}
        await randomDelay(300, 600);
        try { await btn.click({ timeout: 5000 }); } catch { await btn.evaluate(el => el.click()); }
        applyClicked = true;
        console.log(`[Apply] Apply button clicked`);
        await randomDelay(2000, 3000);
        break;
      }
    }

    if (!applyClicked) {
      const allButtons = await page.$$('button, a');
      for (const btn of allButtons) {
        const text = (await btn.evaluate(el => el.textContent)).toLowerCase();
        if (text.includes('apply now') || text.includes('apply') || text.includes('easy apply')) {
          await randomDelay(1000, 2000);
          try { await btn.scrollIntoViewIfNeeded(); } catch {}
          try { await btn.click({ timeout: 5000 }); } catch { await btn.evaluate(el => el.click()); }
          applyClicked = true;
          console.log(`[Apply] Apply button clicked (found by text)`);
          await randomDelay(2000, 3000);
          break;
        }
      }
    }

    if (!applyClicked) {
      const applyTexts = ['Apply with Indeed', 'Apply now', 'Easy Apply', 'Apply'];
      for (const text of applyTexts) {
        let btn = page.getByRole('button', { name: text, exact: true });
        if (await btn.count() === 0) {
          btn = page.getByText(text, { exact: false }).first();
        }
        if (await btn.count() > 0) {
          try { await btn.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch {}
          await randomDelay(300, 600);
          try { await btn.click({ timeout: 5000 }); } catch { await btn.evaluate(el => el.click()); }
          console.log(`[Apply] Clicked "${text}" button`);
          applyClicked = true;
          await randomDelay(2000, 3000);
          break;
        }
      }
    }

    if (!applyClicked) {
      console.log(`[Apply] No apply button found — page may already show the apply form`);
    }

    // ── Wait for the form to load ──
    await randomDelay(2000, 3000);
    let target = await waitForApplyFrame(page);
    if (!target) target = page;

    // Wait for preloader to finish and form content to render
    if (target !== page) {
      console.log(`[Apply] Waiting for form content...`);
      for (let i = 0; i < 20; i++) {
        await randomDelay(1000, 1200);
        const frames = page.frames();
        const formFrame = frames.find(f =>
          f.url().includes('smartapply') || f.url().includes('indeedapply')
        );
        if (formFrame && !formFrame.url().includes('preload')) {
          target = formFrame;
          console.log(`[Apply] Form loaded: ${target.url().substring(0, 100)}`);
          break;
        }
        const testContent = await getFormContent(page, target);
        if (testContent.length > 5) break;
      }
    }

    // ── AI-assisted form filling loop ──
    if (resumeText) {
      const systemPrompt = buildSystemPrompt(resumeText);
      let pageContent = await getFormContent(page, target);
      let previousActions = [];
      let stuckCount = 0;
      let maxSteps = 30;
      const totalSteps = 30;

      while (maxSteps-- > 0) {
        const deduped = deduplicate(pageContent);
        if (deduped.length === 0) {
          console.log(`[Apply] No form elements detected, waiting...`);
          await randomDelay(2000, 3000);
          pageContent = await getFormContent(page, target);
          continue;
        }

        console.log(`  [Step ${totalSteps - maxSteps}] Target has ${deduped.length} visible interactive elements`);

        const userMessage = JSON.stringify({
          instruction: 'Analyze the current page state and tell me what to do next.',
          pageElements: deduped.slice(0, 150),
          previousActions: previousActions.slice(-5),
        });

        let responseText;
        try {
          responseText = await askDeepSeek(systemPrompt, [userMessage], 'json');
        } catch (err) {
          console.log(`[Apply] DeepSeek error: ${err.message}`);
          break;
        }

        let decision;
        try {
          decision = JSON.parse(responseText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim());
        } catch {
          console.log(`[Apply] Could not parse AI response`);
          await randomDelay(2000, 3000);
          pageContent = await getFormContent(page, target);
          continue;
        }

        console.log(`  💭 ${decision.thought || 'No thought provided'}`);

        if (!decision.actions || decision.actions.length === 0) {
          await randomDelay(2000, 3000);
          pageContent = await getFormContent(page, target);
          continue;
        }

        previousActions.push(...decision.actions.map(a => ({ action: a.action, selector: a.selector, value: a.value })));

        const result = await executeActions(target, decision.actions);
        await randomDelay(1500, 2500);

        if (result === 'done') {
          await saveApplication({ jobId, resumeId, status: 'submitted', platform: listing.platform });
          console.log(`[Apply] ✅ Submitted for ${listing.title}`);
          return;
        }

        if (result === 'stop') {
          console.log(`  ⚠ Possible CAPTCHA — waiting 4s to see if more content loads...`);
          await randomDelay(4000, 4500);
          target = detectTarget(page);
          const afterWait = await getFormContent(page, target);
          if (afterWait.length > 0) {
            const hash = JSON.stringify(afterWait.slice(0, 30).map(i => `${i.tag}:${i.textContent}`));
            if (hash !== JSON.stringify(pageContent.slice(0, 30).map(i => `${i.tag}:${i.textContent}`))) {
              stuckCount = 0;
              pageContent = afterWait;
              console.log(`  Content loaded after wait — resuming.`);
              continue;
            }
          }
          // Still blocked — give user time to solve manually
          console.log(`\n⚠ BLOCKER DETECTED (CAPTCHA or manual step needed)`);
          console.log(`  Waiting 5s for you to resolve it...\n`);
          await randomDelay(5000, 5500);
          // Check if the main page URL changed (e.g., redirected to homepage after CAPTCHA)
          const currentUrl = page.url();
          const onApplyForm = currentUrl.includes('indeedapply') || currentUrl.includes('smartapply');
          const lostJob = !currentUrl.includes(listing.applyUrl) && !currentUrl.includes('viewjob') && !currentUrl.includes('indeed.com/jobs');
          if (lostJob && !onApplyForm) {
            console.log(`  URL changed — re-navigating to job...`);
            await page.goto(listing.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await randomDelay(2000, 3000);
          }
          // Re-check after wait
          target = detectTarget(page);
          const recheck = await getFormContent(page, target);
          if (recheck.length > 0) {
            stuckCount = 0;
            pageContent = recheck;
            console.log(`  Page changed — resuming automation.`);
            continue;
          }
          console.log(`  Still blocked. Giving you another 5s...\n`);
          await randomDelay(5000, 5500);
          const currentUrl2 = page.url();
          const lostJob2 = !currentUrl2.includes(listing.applyUrl) && !currentUrl2.includes('viewjob') && !currentUrl2.includes('indeed.com/jobs');
          if (lostJob2 && !currentUrl2.includes('indeedapply') && !currentUrl2.includes('smartapply')) {
            console.log(`  URL still wrong — re-navigating...`);
            await page.goto(listing.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await randomDelay(2000, 3000);
          }
          target = detectTarget(page);
          pageContent = await getFormContent(page, target);
          stuckCount = 0;
          continue;
        }

        // Re-detect target and get fresh content
        target = detectTarget(page);
        const newContent = await getFormContent(page, target);

        // Loop detection
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
    } else {
      // No AI available — simple click + wait approach
      await randomDelay(3000, 5000);
    }

    await saveApplication({ jobId, resumeId, status: 'submitted', platform: listing.platform });
    console.log(`[Apply] Submitted for ${listing.title}`);
  } catch (err) {
    console.error(`[Apply] Failed:`, err.message);
    await saveApplication({ jobId, status: 'failed', platform: listing.platform, errorMessage: err.message });
  } finally {
    if (browser) await browser.close();
  }
}
