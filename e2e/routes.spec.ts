import { expect, test } from '@playwright/test';
import { login, noHorizontalOverflow, trackErrors } from './helpers';

const ADMIN = ['/', '/bookings', '/bookings/bk_5', '/dispatch', '/support', '/support/tk_1', '/customers', '/customers/cus_1', '/providers', '/providers/prov_10', '/partners', '/categories', '/services', '/payments', '/payouts', '/reports', '/promos', '/banners', '/broadcasts', '/reviews', '/content', '/notifications', '/profile'];
const SUPER = ['/', '/analytics', '/admins', '/roles', '/cities', '/settings', '/system', '/audit', '/bookings', '/providers/prov_1', '/reports'];

test('every admin route renders without errors or overflow', async ({ page }) => {
  const errors = trackErrors(page);
  const base = await login(page, 'ops');
  for (const r of ADMIN) {
    await page.goto(base + (r === '/' ? '' : r));
    await expect(page.locator('main :is(h1,h2):visible').first()).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Couldn’t load' })).toHaveCount(0);
    await noHorizontalOverflow(page);
  }
  expect(errors).toEqual([]);
});

test('every super admin route renders without errors or overflow', async ({ page }) => {
  const errors = trackErrors(page);
  const base = await login(page, 'super');
  for (const r of SUPER) {
    await page.goto(base + (r === '/' ? '' : r));
    await expect(page.locator('main :is(h1,h2):visible').first()).toBeVisible();
    await noHorizontalOverflow(page);
  }
  expect(errors).toEqual([]);
});
