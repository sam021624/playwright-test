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
  // Global timeout for the entire test (2 minutes)
  test.setTimeout(120000);

  const orderNum = getNextOrderNumber();
  const randomHour = getRandomHour();
  const todayDay = new Date().getDate().toString();

  console.log(`🚀 BOT START | Order: ${orderNum} | Day: ${todayDay} | Time: ${randomHour}:00 AM`);

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

  // 5. DYNAMIC DATE & TIME (Improved for Latency and Duplicates)
  await page.locator('input[placeholder="mm/dd/yyyy"]').click();
  
  // Fix: .first() prevents "Strict Mode Violation" when next month's preview is visible
  await page.getByRole('cell', { name: todayDay, exact: true }).first().click();

  await page.getByPlaceholder(':00').click();
  await page.getByText(randomHour, { exact: true }).click();
  await page.getByText('00').nth(2).click(); 

  await page.getByRole('link', { name: 'Next' }).click(); 
  
//   // Fix: Extended timeout and Network Waiting for the slow "Next" transition
//   await Promise.all([
//     page.waitForResponse(resp => resp.url().includes('getquestionforsurvey'), { timeout: 60000 }),
//     page.getByRole('link', { name: 'Next' }).click({ timeout: 60000 })
//   ]);

  // 6. Ratings Sequence
  await page.waitForLoadState('networkidle');
  
  const firstRating = page.getByRole('cell', { name: '5' }).first();
  if (await firstRating.isVisible()) {
    await firstRating.click();
    await page.getByRole('link', { name: 'Next' }).click();
  }

  const satisfiedOption = page.locator('.rating-option.mratingslide_4');
  const nextBtn = page.getByRole('link', { name: 'Next' });

  while (await nextBtn.isVisible()) {
    if (await satisfiedOption.first().isVisible()) {
      await satisfiedOption.first().click();
    }
    
    // Using a try-catch for individual 'Next' clicks in case one hangs
    try {
        await nextBtn.click({ timeout: 45000 });
    } catch (e) {
        console.log("Click timed out, retrying...");
        await nextBtn.click({ timeout: 45000 });
    }

    if (await page.getByRole('textbox', { name: 'Type here...' }).isVisible()) break;
    if (await page.getByText('Extremely likely').isVisible()) break;
  }

  // 7. Likelihood Slider
  if (await page.getByText('Extremely likely').isVisible()) {
    await page.getByText('Extremely likely', { exact: true }).click();
    await page.getByRole('link', { name: 'Next' }).click();
  }

  // 8. Text Feedback
  const feedbackBox = page.getByRole('textbox', { name: 'Type here...' });
  if (await feedbackBox.isVisible()) {
    await feedbackBox.fill('Everything was great. Service was fast and the food was hot.');
    await page.getByRole('link', { name: 'Next' }).click();
  }

  // 9. Skip Optional Demographics
  const skipBtn = page.getByText('Skip');
  while (await skipBtn.isVisible()) {
    await skipBtn.click();
  }

  // 10. Final Verification
  await page.waitForSelector('text=/Validation Code|Coupon/i', { timeout: 45000 });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `coupon-${orderNum}-${timestamp}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log(`✅ SUCCESS: Order #${orderNum} completed. Coupon saved to ${screenshotPath}`);
});