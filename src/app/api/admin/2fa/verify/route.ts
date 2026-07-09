import { NextRequest, NextResponse } from "next/server";
import { getActorById, errorResponse } from "@/lib/security";
import { verify2FA } from "@/lib/two-factor";

// POST /api/admin/2fa/verify
// body: { adminId, code }
// Verifies the 6-digit code against the admin's stored twoFactorCode.
// Returns { valid: boolean }.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const adminId = body?.adminId;
    const code = typeof body?.code === "string" ? body.code : undefined;

    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    const err = await verify2FA(admin!.id, code);
    const valid = !err;

    return NextResponse.json({ valid });
  } catch (e) {
    console.error("2FA verify error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
