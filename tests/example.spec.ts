import { test, expect } from '@playwright/test';

test('automate mcdonalds survey', async ({ page }) => {
  // Set a longer timeout for this specific test because the site is slow
  test.setTimeout(60000);

  await page.goto('https://www.mcdolistens.com/');
  
  // 1. Initial Agreement
  await page.getByText('I agree with the terms and').click();
  await page.getByRole('button', { name: 'Let’s Begin' }).click();

  // 2. Select Receipt Type (Wait for image to be actionable)
  await page.locator('div:nth-child(3) > .content > .select-receipt > img').click();
  await page.getByRole('link', { name: 'Next' }).click();

  // 3. Survey Code Input
  const surveyInput = page.getByRole('textbox', { name: 'Survey Code #' });
  await surveyInput.fill('1085'); 
  await page.getByRole('link', { name: 'Next' }).click();

  // 4. Order Number
  await page.getByRole('textbox', { name: 'ORD #' }).fill('2072');
  await page.getByRole('link', { name: 'Next' }).click();

  // 5. Ratings Loop
  // Tip: Instead of clicking specific coordinates, we wait for the network to idle
  // so the 'Next' button actually registers the click.
  await page.waitForLoadState('networkidle'); 
  
  await page.getByRole('cell', { name: '5' }).first().click();
  // ... (Your other rating steps here)

  // 6. Final Feedback
  await page.getByRole('textbox', { name: 'Type here...' }).fill('Good service');
  
  // Final 'Next' to get the coupon
  await page.getByRole('link', { name: 'Next' }).click();

  // 7. Wait for the Coupon Code to appear
  // Look for the text that usually accompanies the code
  await expect(page.getByText(/Validation Code/i)).toBeVisible({ timeout: 20000 });
  
  // Take a final screenshot of the coupon!
  await page.screenshot({ path: 'mcdonalds-coupon.png' });
});