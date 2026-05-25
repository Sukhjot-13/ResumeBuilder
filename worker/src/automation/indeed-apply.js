import { randomDelay, humanLikeMove } from './anti-detection.js';

/**
 * Apply to a job on Indeed.
 */
export async function indeedApply(context, applyUrl, cookies) {
  const page = await context.newPage();
  let success = false;

  try {
    // Inject Indeed session cookies if provided
    if (cookies.length > 0) {
      await context.addCookies(
        cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || '.indeed.com',
          path: c.path || '/',
          httpOnly: c.httpOnly ?? true,
          secure: c.secure ?? true,
          sameSite: c.sameSite || 'Lax',
        }))
      );
    }

    await page.goto(applyUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay(2000, 4000);

    // Click apply button
    const applyBtn = await page.$('button[data-tn-component="apply-button"], button:has-text("Apply now")');
    if (!applyBtn) {
      console.log('[Indeed Apply] No apply button found');
      return false;
    }

    await humanLikeMove(page, 'button[data-tn-component="apply-button"]');
    await randomDelay(500, 1500);
    await applyBtn.click();
    await page.waitForTimeout(3000);

    // Check if redirected to external site (not Indeed Easy Apply)
    const currentUrl = page.url();
    if (!currentUrl.includes('indeed.com')) {
      console.log('[Indeed Apply] External apply (redirected away from Indeed)');
      success = true;
      return success;
    }

    // Fill Indeed application form
    const firstName = await page.$('input[name="firstName"], input[aria-label*="first name"]');
    if (firstName) {
      await randomDelay(300, 800);
      await firstName.fill('John');
      await randomDelay(200, 500);
    }

    const lastName = await page.$('input[name="lastName"], input[aria-label*="last name"]');
    if (lastName) {
      await randomDelay(300, 800);
      await lastName.fill('Doe');
      await randomDelay(200, 500);
    }

    // Fill phone
    const phone = await page.$('input[type="tel"], input[name="phoneNumber"]');
    if (phone) {
      await randomDelay(300, 800);
      await phone.fill('416-555-0198');
      await randomDelay(200, 500);
    }

    // Click submit
    const submitBtn = await page.$('button[type="submit"], button:has-text("Submit"), button:has-text("Continue")');
    if (submitBtn) {
      await randomDelay(1000, 2000);
      await submitBtn.click();
      await page.waitForTimeout(3000);
      success = true;
      console.log('[Indeed Apply] Application submitted');
    }

    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('[Indeed Apply] Error:', err);
  } finally {
    await page.close();
  }

  return success;
}
