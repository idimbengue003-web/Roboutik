import { db } from "@/lib/db";

/**
 * Verify a 2FA code for an admin user.
 * Returns null if valid, or an error object to send back as 403.
 *
 * Used by sensitive admin routes (ban, validate withdrawal, reject withdrawal)
 * to enforce 2FA before destructive actions.
 */
export async function verify2FA(
  adminId: string,
  code: string | undefined | null
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  if (!code || typeof code !== "string") {
    return {
      status: 403,
      body: {
        error: "Code 2FA invalide ou expiré. Demande un nouveau code.",
      },
    };
  }
  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: { twoFactorCode: true, twoFactorCodeExpiresAt: true },
  });
  if (!admin) {
    return {
      status: 403,
      body: {
        error: "Code 2FA invalide ou expiré. Demande un nouveau code.",
      },
    };
  }
  const now = new Date();
  const valid =
    !!admin.twoFactorCode &&
    admin.twoFactorCode === code.trim() &&
    !!admin.twoFactorCodeExpiresAt &&
    admin.twoFactorCodeExpiresAt.getTime() > now.getTime();
  if (!valid) {
    return {
      status: 403,
      body: {
        error: "Code 2FA invalide ou expiré. Demande un nouveau code.",
      },
    };
  }
  return null;
}
