/**
 * Minimal session holder shared by the HTTP client and the mock backend.
 * The auth store writes it; services read it. Kept outside React on purpose.
 */
export const session: { token: string | null; adminId: string | null } = { token: null, adminId: null };

export function setSession(token: string | null, adminId: string | null) {
  session.token = token;
  session.adminId = adminId;
}
