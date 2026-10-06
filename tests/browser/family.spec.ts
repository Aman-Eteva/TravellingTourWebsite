import { test, expect } from '@playwright/test';

test('family booking saves all four travelers and updates the price on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Family Lead');
  await page.getByLabel('Email address', { exact: true }).fill(`family-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Family-test-password!');
  await page.getByRole('button', { name: 'Start my next chapter' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/tours?search=Goa');
  await page.locator('.tour-card h3').first().click();
  await page.getByRole('link', { name: 'Make this my next chapter' }).click();
  await page.getByRole('button', { name: /places left/ }).last().click();
  await page.getByRole('button', { name: 'Meet your travel party' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add family member' }).click();
  const fields = page.locator('.traveler-fields');
  await expect(fields).toHaveCount(4);
  for (const [index, name, age] of [[1, 'Family Partner', '32'], [2, 'Family Child', '8'], [3, 'Family Toddler', '3']] as const) {
    await fields.nth(index).getByLabel('Full name').fill(name);
    await fields.nth(index).getByLabel('Age', { exact: true }).fill(age);
  }
  await page.getByRole('button', { name: 'Add family member' }).click();
  await page.getByRole('button', { name: 'Remove traveler 5', exact: true }).click();
  await expect(fields).toHaveCount(4);
  await expect(fields.nth(2).getByLabel('Full name')).toHaveValue('Family Child');
  await expect(page.locator('.family-summary-count')).toContainText('4 travelers');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Review my adventure' }).click();
  await expect(page.locator('.review-details')).toContainText('Family Toddler');
  const saved = page.waitForResponse(response => response.url().endsWith('/api/bookings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue to demo payment' }).click();
  const response = await saved;
  expect(response.ok()).toBe(true);
  const booking = await response.json();
  expect(booking.count).toBe(4);
  expect(booking.travelers).toHaveLength(4);
  expect(booking.total).toBe(booking.tour.price * 4);
  await page.getByRole('button', { name: /Simulate .* payment/ }).click();
  await page.getByRole('link', { name: 'See my adventure' }).click();
  await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible();
  await expect(page.getByText('Family Toddler · 3 years', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel this booking' }).click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();
});
