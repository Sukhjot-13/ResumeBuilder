/**
 * Indeed Apply Test — standalone test for a single Indeed job.
 *
 * Usage (from worker/ directory):  node src/test-indeed-apply.js
 *
 * Set the job URL via env:
 *   JOB_URL="https://ca.indeed.com/viewjob?jk=JOBKEY" node src/test-indeed-apply.js
 *
 * Prerequisites (same as the production apply processor):
 *   - Worker .env configured with RESUME_BUILDER_URL, RESUME_BUILDER_API_KEY, COOKIE_ENCRYPTION_KEY
 *   - Indeed session cookies saved at /automation/settings/accounts (Next.js dashboard)
 *   - Next.js app running on RESUME_BUILDER_URL
 *
 * What it does:
 *   1. Fetches Indeed session cookies from the API (via getSessions() — same as apply.processor.js)
 *   2. Launches Playwright (non-headless, with stealth)
 *   3. Injects cookies so Indeed sees you as logged in
 *   4. Navigates to the Indeed job page
 *   5. Finds and clicks the apply button
 *   6. Detects if it's an Easy Apply (iframe) or external redirect
 *   7. Scrapes all visible form fields
 *   8. Reports what it finds so you can decide next steps
 *   9. Keeps the browser open for 60s so you can inspect/interact
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getSessions } from './db-api.js';

chromium.use(StealthPlugin());

// ── Config ───────────────────────────────────────────────────────────────────

const JOB_URL = process.env.JOB_URL || 'https://ca.indeed.com/viewjob?jk=b2547971aba09d02';

// ── Helpers ──────────────────────────────────────────────────────────────────

const randomDelay = (min, max) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

async function humanLikeMove(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) return;
    const box = await element.boundingBox();
    if (!box) return;
    const startX = 100 + Math.random() * 500;
    const startY = 100 + Math.random() * 500;
    const steps = 5 + Math.floor(Math.random() * 5);
    for (let i = 1; i <= steps; i++) {
      const x = startX + ((box.x + box.width / 2 - startX) * i) / steps + (Math.random() - 0.5) * 10;
      const y = startY + ((box.y + box.height / 2 - startY) * i) / steps + (Math.random() - 0.5) * 10;
      await page.mouse.move(x, y);
      await randomDelay(30, 80);
    }
    await randomDelay(100, 300);
  } catch {
    // ignore
  }
}

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

async function getPageElements(page, target) {
  return target.evaluate(() => {
    const items = [];
    const selectors = 'input, button, select, textarea, [contenteditable], label, legend, h1, h2, h3, p, li, span, a, [role="button"], [role="textbox"], [role="combobox"]';
    const found = document.querySelectorAll(selectors);
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
      });
    }
    return items;
  });
}

function detectTarget(page) {
  const mainUrl = page.url();
  if (mainUrl.includes('indeedapply') || mainUrl.includes('smartapply')) return page;
  const frames = page.frames().filter(f =>
    f.url() !== 'about:blank' && f.url() !== mainUrl &&
    !f.url().includes('recaptcha') && !f.url().includes('hcaptcha')
  );
  return frames.find(f => f.url().includes('smartapply') || f.url().includes('indeedapply')) || frames[0] || page;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════');
  console.log('  Indeed Apply Test');
  console.log('══════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280 + Math.floor(Math.random() * 640), height: 720 + Math.floor(Math.random() * 280) },
    userAgent: getRandomUserAgent(),
    locale: 'en-US',
    timezoneId: 'America/Toronto',
    permissions: ['geolocation'],
    geolocation: { latitude: 43.6532, longitude: -79.3832 },
  });

  await context.addInitScript(() => {
    window.chrome = { runtime: {} };
  });

  // ── Step 0: Get Indeed session from API (same as apply.processor.js) ──
  console.log('[0] Fetching Indeed session cookies...');
  let sessionCookies = [];
  try {
    const sessions = await getSessions();
    const session = sessions.find(s => s.platform === 'indeed');
    if (!session || !session.isValid) {
      console.error('  ✗ No valid Indeed session. Save cookies at /automation/settings/accounts');
      console.error('  Continuing without cookies — apply button may not appear.\n');
    } else {
      sessionCookies = typeof session.cookies === 'string' ? JSON.parse(session.cookies) : session.cookies;
      console.log(`  ✓ Indeed session valid (${sessionCookies.length} cookies)\n`);
    }
  } catch (err) {
    console.error(`  ✗ Failed to get sessions: ${err.message}`);
    console.error('  Ensure RESUME_BUILDER_URL, RESUME_BUILDER_API_KEY, and COOKIE_ENCRYPTION_KEY are set in .env');
    console.error('  Continuing without cookies — apply button may not appear.\n');
  }

  const page = await context.newPage();

  // Inject Indeed session cookies if available
  if (sessionCookies.length > 0) {
    await context.addCookies(
      sessionCookies.map((c) => {
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
    console.log('  ✓ Session cookies injected into browser context\n');
  }
  page.on('dialog', async (dialog) => {
    console.log(`  [Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });

  try {
    // ── Step 1: Navigate ──
    console.log(`[1] Navigating to: ${JOB_URL}`);
    await page.goto(JOB_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay(2000, 4000);
    console.log('    ✓ Page loaded\n');

    // ── Step 2: Page info ──
    const title = await page.title();
    const currentUrl = page.url();
    console.log(`[2] Page info`);
    console.log(`    Title: ${title}`);
    console.log(`    URL:   ${currentUrl}\n`);

    // ── Step 3: Scrape job details ──
    console.log(`[3] Job details from page:`);
    const jobTitle = await page.$eval('h1', (el) => el.textContent?.trim() || 'N/A').catch(() => 'N/A');
    console.log(`    Job Title: ${jobTitle}`);

    const company = await page.$eval('[data-testid="inlineHeader-companyName"], [class*="company"]', (el) => el.textContent?.trim() || 'N/A').catch(() => 'N/A');
    console.log(`    Company:   ${company}`);

    const location = await page.$eval('[data-testid="inlineHeader-companyLocation"], [class*="location"]', (el) => el.textContent?.trim() || 'N/A').catch(() => 'N/A');
    console.log(`    Location:  ${location}\n`);

    // ── Step 4: Find apply button ──
    console.log(`[4] Searching for apply button...`);
    const applySelectors = [
      'button[data-tn-component="apply-button"]',
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

    let applyBtn = null;
    let applySelector = '';
    for (const sel of applySelectors) {
      const btn = await page.$(sel);
      if (btn) {
        applyBtn = btn;
        applySelector = sel;
        break;
      }
    }

    // Fallback: search all buttons by text
    if (!applyBtn) {
      const allButtons = await page.$$('button, a');
      for (const btn of allButtons) {
        const text = await btn.evaluate(el => el.textContent?.toLowerCase() || '');
        if (text.includes('apply now') || text.includes('easy apply') || text === 'apply') {
          applyBtn = btn;
          applySelector = 'text-match';
          break;
        }
      }
    }

    if (applyBtn) {
      const btnText = await applyBtn.evaluate(el => el.textContent?.trim() || '');
      const btnVisible = await applyBtn.isVisible();
      console.log(`    ✓ Found apply button`);
      console.log(`      Text:    "${btnText}"`);
      console.log(`      Visible: ${btnVisible}`);
      console.log(`      Match:   ${applySelector}`);

      // ── Step 5: Click the apply button ──
      console.log(`\n[5] Clicking apply button...`);
      await humanLikeMove(page, applySelector);
      await randomDelay(800, 1500);
      await applyBtn.click();
      await randomDelay(3000, 4000);
      console.log('    ✓ Clicked\n');

      // ── Step 6: Check result ──
      const afterUrl = page.url();
      console.log(`[6] After click URL: ${afterUrl}`);

      const allFrames = page.frames();
      console.log(`    Total frames: ${allFrames.length}`);
      for (const f of allFrames) {
        if (f.url() !== 'about:blank') {
          console.log(`    Frame: ${f.url().substring(0, 120)}`);
        }
      }

      if (!afterUrl.includes('indeed.com')) {
        console.log('\n    ⚠ Redirected EXTERNAL — manual application required.');
      } else {
        console.log('\n    ℹ Still on Indeed — checking for application form...');

        // Look for Easy Apply / smart apply iframe or modal
        let target = detectTarget(page);
        await randomDelay(2000, 3000);

        const formElements = await getPageElements(page, target);
        const inputs = formElements.filter(e => e.tag === 'input' && e.type !== 'hidden');
        const buttons = formElements.filter(e => e.tag === 'button' || e.role === 'button');
        const selects = formElements.filter(e => e.tag === 'select');

        console.log(`\n[7] Form elements detected:`);
        console.log(`    Inputs:  ${inputs.length}`);
        console.log(`    Buttons: ${buttons.length}`);
        console.log(`    Selects: ${selects.length}`);

        if (inputs.length > 0) {
          console.log(`\n    Input fields:`);
          for (const inp of inputs) {
            console.log(`      - name="${inp.name}" placeholder="${inp.placeholder}" ariaLabel="${inp.ariaLabel}" required=${inp.required}`);
          }
        }
        if (buttons.length > 0) {
          console.log(`\n    Buttons:`);
          for (const btn of buttons) {
            console.log(`      - "${btn.textContent}" disabled=${btn.disabled}`);
          }
        }
        if (selects.length > 0) {
          console.log(`\n    Selects:`);
          for (const sel of selects) {
            console.log(`      - name="${sel.name}" ariaLabel="${sel.ariaLabel}"`);
          }
        }
      }
    } else {
      console.log('    ✗ No apply button found on the page');
    }

    // ── Step 7: Keep open for manual inspection ──
    console.log('\n──────────────────────────────────────────────');
    console.log('  ✅ Test complete — browser stays open for 60s');
    console.log('  Inspect the page, check the form, then close');
    console.log('  the browser window to exit.');
    console.log('──────────────────────────────────────────────\n');

    // Wait 60s, checking every 5s if browser still connected
    for (let i = 0; i < 12; i++) {
      try {
        await page.evaluate(() => 1); // ping
        await randomDelay(5000, 5000);
      } catch {
        console.log('  Browser closed by user.');
        break;
      }
    }

  } catch (err) {
    console.error('\n  ✗ Error:', err.message);
  } finally {
    try {
      await browser.close();
      console.log('  Browser closed.');
    } catch {}
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
