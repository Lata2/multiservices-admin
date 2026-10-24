import { describe, expect, it } from 'vitest';
import { createSeed } from '@/mocks/seed';

describe('seed data integrity', () => {
  const s = createSeed();
  it('is deterministic', () => {
    const again = createSeed();
    expect(again.bookings.length).toBe(s.bookings.length);
    expect(again.bookings[10].code).toBe(s.bookings[10].code);
  });
  it('generates a realistic volume', () => {
    expect(s.bookings.length).toBeGreaterThan(700);
    expect(s.customers.length).toBe(160);
    expect(s.reviews.length).toBeGreaterThan(150);
  });
  it('links every booking to an existing customer, provider and service', () => {
    for (const b of s.bookings) {
      expect(s.customers.some((c) => c.id === b.customerId)).toBe(true);
      expect(s.providers.some((p) => p.id === b.providerId)).toBe(true);
      for (const it of b.items) expect(s.services.some((x) => x.id === it.serviceId)).toBe(true);
    }
  });
  it('prices add up', () => {
    for (const b of s.bookings) {
      const p = b.pricing;
      expect(p.total).toBe(p.subtotal - p.discount + p.visitingCharge + p.tax);
      expect(p.commission).toBeGreaterThanOrEqual(0);
    }
  });
  it('has unique booking codes', () => {
    expect(new Set(s.bookings.map((b) => b.code)).size).toBe(s.bookings.length);
  });
  it('has exactly one super admin role with every permission', () => {
    const sup = s.roles.filter((r) => r.id === 'role_super');
    expect(sup).toHaveLength(1);
    expect(sup[0].permissions.length).toBeGreaterThan(25);
  });
});
