/**
 * 2FA verification for admin actions.
 *
 * Currently STUBBED — always returns null (no 2FA required).
 * To enable real 2FA, implement code generation + storage + email sending
 * in /api/admin/2fa/send-code and verification here.
 *
 * Used by sensitive admin routes (ban, validate withdrawal, reject withdrawal)
 * to enforce 2FA before destructive actions.
 */

/**
 * Verify a 2FA code for an admin user.
 * Returns null if valid, or an error object to send back as 403.
 *
 * STUB: always returns null (2FA disabled for now).
 */
export async function verify2FA(
  _adminId: string,
  _code: string | undefined | null
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  // TODO: implement real 2FA verification
  // For now, 2FA is disabled — all admin actions are allowed without code
  return null;
}
