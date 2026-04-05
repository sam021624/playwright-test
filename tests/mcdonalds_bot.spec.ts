import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION & HELPERS ---
const ORDER_FILE = path.join(__dirname, 'last_order.txt');

function getNextOrderNumber() {
  try {
    if (!fs.existsSync(ORDER_FILE)) {
      fs.writeFileSync(ORDER_FILE, '2072');
    }
    const lastOrder = parseInt(fs.readFileSync(ORDER_FILE, 'utf-8'));
    const newOrder = lastOrder + 1;
    fs.writeFileSync(ORDER_FILE, newOrder.toString());
    return newOrder.toString();
  } catch (e) {
    return "3000"; 
  }
}

function getRandomHour() {
  return (Math.floor(Math.random() * 6) + 1).toString();
}

// --- THE TEST ---
test('automate mcdonalds survey with human-like clicks', async ({ page }) => {
  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const orderNum = getNextOrderNumber();
    const randomHour = getRandomHour();
    const todayDay = new Date().getDate().toString();

    console.log(`🚀 Attempt ${attempt}/${MAX_RETRIES} | Order: ${orderNum} | Day: ${todayDay} | Time: ${randomHour}:00 AM`);

    try {
      // 1. Landing & Agreement
      await page.goto('https://www.mcdolistens.com/', { waitUntil: 'networkidle' });
      await page.getByText('I agree with the terms and').click();
      await page.getByRole('button', { name: 'Let’s Begin' }).click();

      // 2. Receipt Selection
      await page.waitForSelector('img', { state: 'visible' });
      await page.locator('div:nth-child(3) > .content > .select-receipt > img').click();
      await page.getByRole('link', { name: 'Next' }).click();

      // 3. Store Code
      await page.getByRole('textbox', { name: 'Survey Code #' }).fill('1085');
      await page.getByRole('link', { name: 'Next' }).click();

      // 4. Incremental Order Number
      await page.getByRole('textbox', { name: 'ORD #' }).fill(orderNum);
      await page.getByRole('link', { name: 'Next' }).click();

      // 5. DYNAMIC DATE & TIME
      await page.locator('input[placeholder="mm/dd/yyyy"]').click();
      await page.getByRole('cell', { name: todayDay, exact: true }).first().click();

      await page.getByPlaceholder(':00').click();
      await page.getByText(randomHour, { exact: true }).click();
      await page.getByText('00').nth(2).click(); 
      await page.getByRole('link', { name: 'Next' }).click();

      // 6. SUBMIT DATE/TIME — retry entire flow if this times out
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('getquestionforsurvey'), { timeout: 60000 }),
        page.getByRole('link', { name: 'Next' }).click({ timeout: 60000 })
      ]);

      // ✅ Past the critical point — continue normally
      console.log(`✅ Survey response received on attempt ${attempt}`);

      // MANDATORY: I WAS ALONE
      const aloneOption = page.getByText('I was alone');
      if (await aloneOption.isVisible({ timeout: 5000 })) {
        await aloneOption.click();
        await page.getByRole('link', { name: 'Next' }).click();
      }

      await page.waitForLoadState('networkidle');
      const nextBtn = page.getByRole('link', { name: 'Next' });

      while (await nextBtn.isVisible()) {
        const rating5 = page.locator('div, td, span').filter({ hasText: /^5$/ }).first();
        if (await rating5.isVisible()) {
          await rating5.click();
          await page.waitForTimeout(500);
        }

        const satisfiedOption = page.locator('.rating-option.mratingslide_4');
        if (await satisfiedOption.first().isVisible()) {
          await satisfiedOption.first().click();
          await page.waitForTimeout(500);
        }
        
        const likeBtn = page.locator('.like-btn');
        if (await likeBtn.isVisible()) { 
          await likeBtn.click(); 
          await page.waitForTimeout(300);
        }

        try {
          await nextBtn.click({ timeout: 45000 });
        } catch (e) {
          await nextBtn.click({ timeout: 45000, force: true });
        }

        if (await page.getByRole('textbox', { name: 'Type here...' }).isVisible()) break;
        if (await page.getByText('Extremely likely').isVisible()) break;
        if (await page.getByText('No', { exact: true }).isVisible()) {
          await page.getByText('No', { exact: true }).click();
          await page.waitForTimeout(300);
          await nextBtn.click();
        }
      }

      // 7. FINAL STEPS
      if (await page.getByText('Extremely likely').isVisible()) {
        await page.getByText('Extremely likely', { exact: true }).click();
        await page.getByRole('link', { name: 'Next' }).click();
      }

      const feedbackBox = page.getByRole('textbox', { name: 'Type here...' });
      if (await feedbackBox.isVisible()) {
        await feedbackBox.fill('The service was excellent, food was hot and staff were friendly.');
        await page.getByRole('link', { name: 'Next' }).click();
      }

// const skipBtn = page.getByText('Skip');
// while (await skipBtn.isVisible()) { await skipBtn.click(); }

// Wait for the final page to fully load after all skips
await page.waitForLoadState('networkidle');

// 8. VERIFICATION
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
await page.screenshot({ path: `coupon-${orderNum}-${timestamp}.png`, fullPage: true });
console.log(`✅ SUCCESS: Order #${orderNum} complete.`);

      break; // 🎉 Done — exit the retry loop

    } catch (e) {
   console.warn(`⚠️ Attempt ${attempt} failed: ${(e as Error).message}`);

      if (attempt === MAX_RETRIES) {
        console.error(`❌ All ${MAX_RETRIES} attempts failed. Giving up.`);
        throw e; // Re-throw so Playwright marks the test as failed
      }

      console.log(`🔄 Retrying from the beginning...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
});