import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { uid } from '@/mocks/helpers';
import { panelForRole } from '@/lib/permissions';
import type { SessionAdmin } from '@/types/admin';
import { ApiError, http } from '../http';
import { audit, currentAdmin, mock } from '../mock/server';
import { session } from '../session';

export type LoginResult =
  | { step: 'otp'; challengeId: string; destination: string }
  | { step: 'done'; token: string; admin: SessionAdmin };

export interface ProfileInput {
  name: string;
  phone: string;
  avatar?: string;
}

export interface AuthApi {
  login(email: string, password: string): Promise<LoginResult>;
  verifyOtp(challengeId: string, code: string): Promise<Extract<LoginResult, { step: 'done' }>>;
  me(): Promise<SessionAdmin>;
  logout(): Promise<void>;
  forgotPassword(email: string): Promise<{ sent: boolean }>;
  updateProfile(input: ProfileInput): Promise<SessionAdmin>;
  changePassword(current: string, next: string): Promise<{ ok: true }>;
  setTwoFactor(enabled: boolean): Promise<SessionAdmin>;
}

const challenges = new Map<string, string>();

function resolve(adminId: string): SessionAdmin {
  const admin = db.admins.find((a) => a.id === adminId)!;
  const role = db.roles.find((r) => r.id === admin.roleId)!;
  return { ...admin, role, panel: panelForRole(role) };
}
function issue(adminId: string) {
  const admin = db.admins.find((a) => a.id === adminId)!;
  admin.lastActiveAt = new Date().toISOString();
  const token = `demo.${adminId}.${Date.now().toString(36)}`;
  // The mock backend needs the session immediately for the audit entry.
  session.token = token;
  session.adminId = adminId;
  audit('auth.login', 'Session', 'Signed in');
  return { step: 'done' as const, token, admin: resolve(adminId) };
}

const mockImpl: AuthApi = {
  login: (email, password) =>
    mock<LoginResult>(
      () => {
        const admin = db.admins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
        const expected = admin ? (db.passwords[admin.email] ?? env.demoPassword) : null;
        if (!admin || password !== expected) throw new ApiError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS', { password: 'Incorrect email or password' });
        if (admin.status === 'invited') throw new ApiError('This invitation hasn’t been accepted yet. Check your email for the invite link.', 403);
        if (admin.status === 'suspended') throw new ApiError('Your access has been suspended. Contact a Super Admin.', 403);
        if (admin.twoFactor) {
          const challengeId = uid('otp');
          challenges.set(challengeId, admin.id);
          const [user, domain] = admin.email.split('@');
          return { step: 'otp', challengeId, destination: `${user.slice(0, 2)}•••@${domain}` };
        }
        return issue(admin.id);
      },
      { write: true },
    ),
  verifyOtp: (challengeId, code) =>
    mock(
      () => {
        const adminId = challenges.get(challengeId);
        if (!adminId) throw new ApiError('This code has expired. Please sign in again.', 410);
        if (code !== env.demoOtp) throw new ApiError('Incorrect code. Try again.', 400, 'INVALID_OTP');
        challenges.delete(challengeId);
        return issue(adminId);
      },
      { write: true },
    ),
  me: () => mock(() => currentAdmin(), { latency: 120 }),
  logout: () => mock(() => undefined, { latency: 100 }),
  forgotPassword: (email) =>
    mock(() => {
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError('Enter a valid email address.');
      return { sent: true };
    }),
  updateProfile: (input) =>
    mock(
      () => {
        const me = currentAdmin();
        const admin = db.admins.find((a) => a.id === me.id)!;
        Object.assign(admin, { name: input.name.trim(), phone: input.phone.trim(), avatar: input.avatar || admin.avatar });
        audit('admin.profile', 'Admin', 'Updated own profile', admin.id);
        return resolve(admin.id);
      },
      { write: true },
    ),
  changePassword: (current, next) =>
    mock(
      () => {
        const me = currentAdmin();
        const expected = db.passwords[me.email] ?? env.demoPassword;
        if (current !== expected) throw new ApiError('Current password is incorrect.', 400, 'INVALID', { current: 'Current password is incorrect' });
        db.passwords[me.email] = next;
        audit('admin.password', 'Admin', 'Changed password', me.id, 'warning');
        return { ok: true as const };
      },
      { write: true },
    ),
  setTwoFactor: (enabled) =>
    mock(
      () => {
        const me = currentAdmin();
        const admin = db.admins.find((a) => a.id === me.id)!;
        admin.twoFactor = enabled;
        audit('admin.2fa', 'Admin', `${enabled ? 'Enabled' : 'Disabled'} 2-step verification`, admin.id, 'warning');
        return resolve(admin.id);
      },
      { write: true },
    ),
};

const httpImpl: AuthApi = {
  login: (email, password) => http('/auth/login', { method: 'POST', body: { email, password } }),
  verifyOtp: (challengeId, code) => http('/auth/otp/verify', { method: 'POST', body: { challengeId, code } }),
  me: () => http('/auth/me'),
  logout: () => http('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => http('/auth/password/forgot', { method: 'POST', body: { email } }),
  updateProfile: (input) => http('/auth/me', { method: 'PATCH', body: input }),
  changePassword: (current, next) => http('/auth/password', { method: 'PUT', body: { current, next } }),
  setTwoFactor: (enabled) => http('/auth/2fa', { method: 'PUT', body: { enabled } }),
};

export const authApi: AuthApi = env.useMocks ? mockImpl : httpImpl;
