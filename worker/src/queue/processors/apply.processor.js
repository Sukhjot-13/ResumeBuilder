import { getPendingJobListings, getSessions, getSchedulerSettings, saveApplication } from '../../db-api.js';
import { createBrowserContext } from '../../automation/browser.js';
import { randomDelay } from '../../automation/anti-detection.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = 'deepseek-chat';

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function askDeepSeek(systemPrompt, userMessages) {
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...userMessages.map(m => ({ role: 'user', content: m })),
    ],
    max_tokens: 4096,
    temperature: 0.1,
    response_format: { type: 'json_object' },
  };

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

function formatResumeAsText(resume) {
  if (!resume) return 'No resume available.';
  const lines = [];
  const profile = resume.profile || {};
  if (profile.full_name) lines.push(`Name: ${profile.full_name}`);
  if (profile.email) lines.push(`Email: ${profile.email}`);
  if (profile.phone) lines.push(`Phone: ${profile.phone}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.generic_summary) lines.push(`\nProfessional Summary:\n${profile.generic_summary}`);
  const work = resume.work_experience || [];
  if (work.length > 0) {
    lines.push('\n--- Work Experience ---');
    for (const job of work) {
      const t = job.job_title || '';
      const c = job.company || '';
      const d = [job.start_date, job.end_date].filter(Boolean).join(' – ');
      if (t || c) lines.push(`\n${t} at ${c}${d ? ` (${d})` : ''}`);
      for (const r of (job.responsibilities || [])) lines.push(`  • ${r}`);
    }
  }
  const edu = resume.education || [];
  if (edu.length > 0) {
    lines.push('\n--- Education ---');
    for (const e of edu) {
      lines.push(`\n${[e.institution, e.degree, e.field_of_study].filter(Boolean).join(' — ')}`);
      for (const b of (e.bullets || [])) lines.push(`  • ${b}`);
    }
  }
  const skills = resume.skills || [];
  if (skills.length > 0) {
    lines.push('\n--- Skills ---');
    const byCat = {};
    for (const s of skills) {
      const cat = s.category || 'Other';
      (byCat[cat] ||= []).push(s.skill_name);
    }
    for (const [cat, names] of Object.entries(byCat)) lines.push(`  ${cat}: ${names.join(', ')}`);
  }
  const addl = resume.additional_info || {};
  if (addl.languages?.length) lines.push(`\nLanguages: ${addl.languages.join(', ')}`);
  if (addl.certifications?.length) lines.push(`Certifications: ${addl.certifications.join(', ')}`);
  return lines.join('\n');
}

function buildSystemPrompt(resumeText) {
  return `You are an AI assistant that automates job applications on Indeed/LinkedIn.

RESUME DATA:
${resumeText}

RULES:
- Only interact with visible elements.
- For text inputs: fill with matching data from the resume.
- For selects: choose the best matching option.
- For checkboxes: check if relevant.
- Skip optional fields if you don't have the data.
- If you hit a CAPTCHA or phone verification, STOP.
- If you see an "Easy Apply" modal, work through it step by step.

Respond with JSON:
{
  "thought": "brief explanation",
  "actions": [
    {
      "action": "click" | "fill" | "select" | "wait" | "scroll" | "done" | "stop",
      "selector": "text:EXACT VISIBLE TEXT for buttons/links, or CSS selector for inputs",
      "value": "value to fill",
      "reason": "why this action"
    }
  ]
}
- "done" when application appears submitted (confirmation/success).
- "stop" for CAPTCHA or can't proceed.
- For clicks use "text:VISIBLE TEXT" format.
- Check if buttons are disabled before clicking.`;
}

// ── Page content extraction (with shadow DOM) ────────────────────────────

async function getFormContent(page) {
  try {
    await page.waitForSelector('input, button, select, textarea, [contenteditable], label, [role="button"]', { timeout: 5000 });
  } catch { /* timeout OK */ }
  return page.evaluate(() => {
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
          textContent: (e.textContent || '').trim().substring(0, 200),
          value: (e.value || '').substring(0, 100),
          required: e.hasAttribute('required'),
          disabled: e.disabled || e.hasAttribute('disabled'),
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
    console.log(`  [Apply AI] ${action}${selector ? ` "${selector}"` : ''}${value ? ` = "${value}"` : ''}`);

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
            try { await el.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch {}
            try { await el.click({ timeout: 5000 }); } catch { await el.evaluate(el => el.click()); }
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
        console.log(`    ${clicked ? '✓' : '✗'} clicked`);
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
      'button[indeed-apply]', 'button[id*="apply"]', 'button[class*="apply"]',
      'a[id*="apply"]', 'button:has-text("Apply now")', 'button:has-text("Apply")',
      'button:has-text("Easy Apply")', 'a:has-text("Apply now")', 'a:has-text("Apply")',
      '[data-testid*="apply"]', '.jobsearch-IndeedApplyButton', '.icl-IndeedApplyButton',
    ];
    let submitBtn = null;
    for (const sel of applySelectors) {
      submitBtn = await page.$(sel);
      if (submitBtn) break;
    }

    if (!submitBtn) {
      const textBtn = page.getByRole('button', { name: /^Apply/i }).or(
        page.getByText('Apply with Indeed', { exact: false })
      ).first();
      if (await textBtn.count() > 0) {
        try { await textBtn.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch {}
        try { await textBtn.click({ timeout: 5000 }); } catch { await textBtn.evaluate(el => el.click()); }
        console.log(`[Apply] Apply button clicked (text match)`);
        submitBtn = true;
      }
    }

    if (submitBtn && typeof submitBtn.click === 'function') {
      await randomDelay(1000, 2000);
      try { await submitBtn.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch {}
      try { await submitBtn.click({ timeout: 5000 }); } catch { await submitBtn.evaluate(el => el.click()); }
      await page.waitForTimeout(3000);
      console.log(`[Apply] Apply button clicked`);
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
        const testContent = await getFormContent(target);
        if (testContent.length > 5) break;
      }
    }

    // ── AI-assisted form filling loop ──
    if (resumeText) {
      const systemPrompt = buildSystemPrompt(resumeText);
      let pageContent = await getFormContent(target);
      let previousActions = [];
      let stuckCount = 0;
      let maxSteps = 20;

      while (maxSteps-- > 0) {
        const deduped = deduplicate(pageContent);
        if (deduped.length === 0) {
          console.log(`[Apply] No form elements detected, waiting...`);
          await randomDelay(2000, 3000);
          pageContent = await getFormContent(target);
          continue;
        }

        const userMessage = JSON.stringify({
          pageElements: deduped.slice(0, 150),
          previousActions: previousActions.slice(-5),
        });

        let responseText;
        try {
          responseText = await askDeepSeek(systemPrompt, [userMessage]);
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
          pageContent = await getFormContent(target);
          continue;
        }

        console.log(`  💭 ${decision.thought?.substring(0, 100) || ''}`);

        if (!decision.actions || decision.actions.length === 0) {
          await randomDelay(2000, 3000);
          pageContent = await getFormContent(target);
          continue;
        }

        previousActions.push(...decision.actions.map(a => ({ action: a.action, selector: a.selector })));

        const result = await executeActions(target, decision.actions);
        await randomDelay(1500, 2500);

        if (result === 'done') {
          await saveApplication({ jobId, resumeId, status: 'submitted', platform: listing.platform });
          console.log(`[Apply] ✅ Submitted for ${listing.title}`);
          return;
        }

        if (result === 'stop') {
          console.log(`  ⚠ CAPTCHA/blocker — waiting 10s for manual resolution...`);
          for (let i = 0; i < 10; i++) {
            await randomDelay(1000, 1200);
            // Re-detect target in case iframe changed
            target = detectTarget(page);
            const newContent = await getFormContent(target);
            if (newContent.length > 0 && JSON.stringify(newContent.slice(0, 10)) !== JSON.stringify(pageContent.slice(0, 10))) {
              stuckCount = 0;
              pageContent = newContent;
              console.log(`  Content changed — resuming.`);
              break;
            }
          }
          // If still blocked after 10s, give up
          const finalCheck = await getFormContent(target);
          if (finalCheck.length === 0 || finalCheck.length === pageContent.length) {
            await saveApplication({ jobId, status: 'failed', platform: listing.platform, errorMessage: 'CAPTCHA not resolved in time' });
            console.log(`[Apply] ❌ Blocked by CAPTCHA`);
            return;
          }
          continue;
        }

        // Re-detect target and get fresh content
        target = detectTarget(page);
        const newContent = await getFormContent(target);

        // Loop detection
        const newHash = JSON.stringify(newContent.slice(0, 20).map(i => `${i.tag}:${i.textContent}`));
        const oldHash = JSON.stringify(pageContent.slice(0, 20).map(i => `${i.tag}:${i.textContent}`));

        if (newHash === oldHash) {
          stuckCount++;
          if (stuckCount >= 3) {
            console.log(`[Apply] Stuck on form — saving and moving on`);
            break;
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
