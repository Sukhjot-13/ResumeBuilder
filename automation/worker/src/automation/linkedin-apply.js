import { randomDelay, humanLikeMove, randomScroll } from './anti-detection.js';

/**
 * Apply to a job on LinkedIn via Easy Apply or external redirect.
 */
export async function linkedInApply(context, applyUrl, cookies) {
  const page = await context.newPage();
  let success = false;

  try {
    // Inject LinkedIn session cookies if provided
    if (cookies.length > 0) {
      await context.addCookies(
        cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || '.linkedin.com',
          path: c.path || '/',
          httpOnly: c.httpOnly ?? true,
          secure: c.secure ?? true,
          sameSite: c.sameSite || 'None',
        }))
      );
    }

    // Navigate to job posting
    await page.goto(applyUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay(2000, 4000);
    await randomScroll(page);

    // Click Easy Apply button
    const easyApplyBtn = await page.$('button[data-jobapplication-trigger="easy-apply"], button:has-text("Easy Apply")');
    if (!easyApplyBtn) {
      // External apply — redirect to company site
      const externalBtn = await page.$('button:has-text("Apply"), a:has-text("Apply")');
      if (externalBtn) {
        console.log('[LinkedIn Apply] External apply link found');
        success = true; // Count as navigated (handled by generic apply)
      }
      return success;
    }

    // Click Easy Apply
    await humanLikeMove(page, 'button[data-jobapplication-trigger="easy-apply"]');
    await randomDelay(500, 1500);
    await easyApplyBtn.click();
    await randomDelay(2000, 3000);

    // Fill multi-step form
    let step = 0;
    const maxSteps = 5;

    while (step < maxSteps) {
      step++;

      // Fill text inputs
      const inputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"], textarea');
      for (const input of inputs) {
        const isFilled = await input.evaluate((el) => el.value && el.value.length > 0);
        if (!isFilled) {
          await input.click();
          await randomDelay(100, 300);
          const placeholder = await input.getAttribute('placeholder') || '';
          if (placeholder.toLowerCase().includes('phone')) {
            await input.fill('416-555-0198');
          } else if (placeholder.toLowerCase().includes('email')) {
            // Email is auto-filled
          } else {
            await input.fill('See resume for details');
          }
          await randomDelay(200, 500);
        }
      }

      // Click Next or Review
      const nextBtn = await page.$('button[aria-label="Next"], button:has-text("Next")');
      const reviewBtn = await page.$('button[aria-label="Review"], button:has-text("Review")');
      const submitBtn = await page.$('button[aria-label="Submit"], button:has-text("Submit application")');

      if (submitBtn) {
        await humanLikeMove(page, 'button[aria-label="Submit"]');
        await randomDelay(1000, 2000);
        await submitBtn.click();
        await page.waitForTimeout(3000);
        success = true;
        console.log('[LinkedIn Apply] Application submitted');
        break;
      }

      if (nextBtn) {
        await randomDelay(1000, 2000);
        await nextBtn.click();
        await page.waitForTimeout(2000);
      } else if (reviewBtn) {
        await randomDelay(1000, 2000);
        await reviewBtn.click();
        await page.waitForTimeout(2000);
      } else {
        // Check for discard/close — form may be done
        break;
      }
    }
  } catch (err) {
    console.error('[LinkedIn Apply] Error:', err);
  } finally {
    await page.close();
  }

  return success;
}
