import { NextResponse } from "next/server";

/**
 * GET /api/cron/auto-validate
 *
 * DISABLED — auto-validation was removed to prevent scams.
 *
 * Previously, this cron would auto-validate orders 24h after payment,
 * releasing the seller's funds even if the buyer didn't confirm reception.
 * This was a security risk: a fraudulent seller could deliver nothing,
 * wait 24h, and still get paid.
 *
 * Now: buyers MUST manually click "Valider la commande" to release payment.
 * Admins can also force-validate via /api/admin/orders/[id]/validate.
 *
 * This endpoint is kept as a no-op to avoid breaking the Vercel Cron
 * configuration if it's still set in vercel.json.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Auto-validation disabled — buyers must validate manually.",
  });
}
