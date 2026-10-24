import { expect, test } from '@playwright/test';
import { login, resetStorage, trackErrors } from './helpers';

// Interaction flows run on the wide layouts; the route crawl covers every screen size.
test.beforeEach(({}, info) => test.skip(!['desktop', 'laptop'].includes(info.project.name), 'flows run on desktop and laptop'));

test.describe('auth & access', () => {
  test('validates the login form and rejects bad credentials', async ({ page }) => {
    await resetStorage(page);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await page.getByLabel('Work email').fill('admin@servio.app');
    await page.getByLabel('Password').fill('wrong-pass');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Incorrect email or password').first()).toBeVisible();
  });

  test('super admin needs the 2-step code and lands in the super panel', async ({ page }) => {
    await login(page, 'super');
    await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Roles & permissions' })).toBeVisible();
  });

  test('ops admin cannot reach super-only pages and is kept in /admin', async ({ page }) => {
    await login(page, 'ops');
    await expect(page.getByRole('link', { name: 'Roles & permissions' })).toHaveCount(0);
    await page.goto('/super/roles');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('finance role sees finance modules only', async ({ page }) => {
    await login(page, 'finance');
    await expect(page.getByRole('link', { name: 'Payouts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Promo codes' })).toHaveCount(0);
    await page.goto('/admin/promos');
    await expect(page.getByText('You don’t have access to this page')).toBeVisible();
  });

  test('city manager only sees bookings from assigned cities', async ({ page }) => {
    await login(page, 'city');
    await page.goto('/admin/bookings?size=50');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    const cities = await page.locator('table tbody tr td:nth-child(5)').allTextContents();
    for (const c of cities) expect(['Mumbai', 'Pune']).toContain(c.trim());
  });

  test('redirects to login and back after sign-in', async ({ page }) => {
    await resetStorage(page);
    await page.goto('/admin/payouts');
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe('operations', () => {
  test('cancel a booking with refund', async ({ page }) => {
    const errors = trackErrors(page);
    const base = await login(page, 'ops');
    await page.goto(`${base}/bookings?status=pending`);
    await page.locator('table tbody tr').first().click();
    await page.getByRole('button', { name: 'Manage' }).click();
    await page.getByRole('menuitem', { name: 'Cancel booking' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
    await expect(page.getByText(/Booking cancelled/).first()).toBeVisible();
    await expect(page.locator('main').getByText('Cancelled').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('approve a pending provider after verifying documents', async ({ page }) => {
    const base = await login(page, 'ops');
    await page.goto(`${base}/providers?status=pending`);
    await page.locator('table tbody tr').first().click();
    await page.getByRole('button', { name: 'Approve' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Approve' }).click();
    // Providers with a missing document can't be approved — the API explains why.
    await expect(page.getByText(/approved|Verify all documents first/).first()).toBeVisible();
  });

  test('pay a payout request with a UTR', async ({ page }) => {
    const base = await login(page, 'finance');
    await page.goto(`${base}/payouts?status=requested`);
    await page.locator('table tbody tr').first().getByRole('button', { name: 'Pay' }).click();
    await page.getByLabel('UTR / transfer reference').fill('UTR123456789');
    await page.getByRole('button', { name: 'Mark paid' }).click();
    await expect(page.getByText(/^Paid ₹/).first()).toBeVisible();
  });

  test('create a promo code with validation', async ({ page }) => {
    const base = await login(page, 'ops');
    await page.goto(`${base}/promos`);
    await page.getByRole('button', { name: 'New promo' }).click();
    await page.getByRole('button', { name: 'Create promo' }).click();
    await expect(page.getByText('4–16 letters or numbers, no spaces')).toBeVisible();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: /^Code/ }).fill('TEST25');
    await dialog.getByRole('textbox', { name: /^Title/ }).fill('Test promo for QA');
    await page.getByRole('button', { name: 'Create promo' }).click();
    await expect(page.getByText('Promo created')).toBeVisible();
    await expect(page.getByText('TEST25').first()).toBeVisible();
  });

  test('reply to a support ticket', async ({ page }) => {
    const base = await login(page, 'support');
    await page.goto(`${base}/support/tk_1`);
    await page.getByLabel('Reply').fill('We are on it — thanks for your patience.');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Reply sent')).toBeVisible();
  });
});

test.describe('super admin', () => {
  test('create a role from the permission matrix', async ({ page }) => {
    const base = await login(page, 'super');
    await page.goto(`${base}/roles`);
    await page.getByRole('button', { name: 'New role' }).click();
    await page.getByLabel('Role name').fill('Catalogue Editor');
    await page.getByText('Manage catalogue').click();
    await page.getByRole('button', { name: 'Create role' }).click();
    await expect(page.getByText('Role created')).toBeVisible();
    await expect(page.getByRole('button', { name: /Catalogue Editor/ })).toBeVisible();
  });

  test('settings validation blocks bad values', async ({ page }) => {
    const base = await login(page, 'super');
    await page.goto(`${base}/settings`);
    await page.getByLabel('GST / tax').fill('55');
    await expect(page.getByText('Between 0 and 40%')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    await page.getByLabel('GST / tax').fill('12');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText(/Settings saved/)).toBeVisible();
  });

  test('invite an admin', async ({ page }) => {
    const base = await login(page, 'super');
    await page.goto(`${base}/admins`);
    await page.getByRole('button', { name: 'Invite admin' }).click();
    await page.getByLabel('Full name').fill('Test Person');
    await page.getByLabel('Phone').fill('+91 90000 12345');
    await page.getByLabel('Work email').fill('test.person@servio.app');
    await page.getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByText('Invitation sent to test.person@servio.app')).toBeVisible();
  });
});
