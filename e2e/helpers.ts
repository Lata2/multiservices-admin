import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Demo@1234';
export const ACCOUNTS = {
  super: 'superadmin@servio.app',
  ops: 'admin@servio.app',
  finance: 'finance@servio.app',
  support: 'support@servio.app',
  city: 'citymanager@servio.app',
} as const;

/** Fresh demo data per test (mock DB lives in localStorage). */
export async function resetStorage(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
}

export async function login(page: Page, who: keyof typeof ACCOUNTS) {
  await resetStorage(page);
  await page.goto('/login');
  await page.getByLabel('Work email').fill(ACCOUNTS[who]);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  if (who === 'super') {
    await page.getByLabel('Verification code').fill('123456');
    await page.getByRole('button', { name: 'Verify and continue' }).click();
  }
  await expect(page).toHaveURL(who === 'super' ? /\/super/ : /\/admin/);
  return who === 'super' ? '/super' : '/admin';
}

/** Collect runtime errors (ignores blocked external avatar images). */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/**
 * Fails if the page scrolls sideways or any visible element sticks out past the
 * viewport (html uses overflow-x: clip, so scrollWidth alone would hide this).
 * Content inside intentional horizontal scrollers (tabs, wide tables) is ignored.
 */
export async function noHorizontalOverflow(page: Page) {
  const offenders = await page.evaluate(() => {
    const vw = window.innerWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth - vw > 1) out.push(`document ${document.documentElement.scrollWidth}px`);
    const scrolls = (el: Element | null): boolean => {
      for (let p = el?.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      }
      return false;
    };
    document.querySelectorAll('main *, header *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.right > vw + 1 && !scrolls(el) && getComputedStyle(el).position !== 'fixed') out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(r.right)}px`);
    });
    return out.slice(0, 5);
  });
  expect(offenders, 'nothing should overflow the viewport horizontally').toEqual([]);
}
