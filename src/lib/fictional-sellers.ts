/**
 * Fictional seller configuration.
 *
 * These 7 sellers are fake accounts used to populate the marketplace.
 * All their incoming messages and orders are forwarded to the real admin
 * (the user who created them) so the admin can handle support, deliveries,
 * and payments without the buyers knowing.
 *
 * Fictional sellers are identified by their email domain '@robloxboutik.sn'.
 */

const FICTIONAL_EMAIL_DOMAIN = "robloxboutik.sn";

/**
 * Check if a user is a fictional seller.
 * Fictional sellers are identified by their email ending with @robloxboutik.sn
 */
export function isFictionalSeller(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${FICTIONAL_EMAIL_DOMAIN}`);
}

/**
 * Get the admin user ID to forward fictional seller messages to.
 * This is set via ADMIN_FORWARD_USER_ID env var, or defaults to the
 * known admin ID (idimbengue003@gmail.com).
 */
export function getAdminForwardUserId(): string | null {
  return process.env.ADMIN_FORWARD_USER_ID || "cmqqyxk010000jo04ci1x7aku";
}
