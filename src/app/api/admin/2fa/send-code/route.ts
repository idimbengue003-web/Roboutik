import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";

// POST /api/admin/2fa/send-code
// body: { adminId }
// Generates a 6-digit code, stores it on the admin user (10 min expiry),
// and emails it via sendNotification().
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const adminId = body?.adminId;
    const { user: admin, error } = await getActorById(adminId, {
      requireAdmin: true,
    });
    if (error) return errorResponse(error);

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.user.update({
      where: { id: admin!.id },
      data: {
        twoFactorCode: code,
        twoFactorCodeExpiresAt: expiresAt,
      },
    });

    // Send the code via email using sendNotification (type TICKET_ADMIN_REPLY for email channel)
    await sendNotification({
      userId: admin!.id,
      type: "TICKET_ADMIN_REPLY",
      subject: "🔒 Code de sécurité admin",
      body: buildEmailHtml(
        "Code de sécurité admin",
        `<p>Bonjour <strong>${admin!.username}</strong>,</p>
         <p>Tu as demandé à effectuer une action sensible sur le panel admin Roboutik.</p>
         <p style="background:#fdf2f8; padding:16px; border-radius:12px; border-left:4px solid #c026d3; font-size:28px; font-weight:800; letter-spacing:8px; text-align:center; color:#c026d3; margin:16px 0;">
           ${code}
         </p>
         <p>Ce code expire dans <strong>10 minutes</strong>. Ne le partage avec personne — même un autre admin.</p>
         <p style="margin-top:16px; font-size:12px; color:#94a3b8;">Si tu n'es pas à l'origine de cette demande, ignore cet email et vérifie ton compte.</p>`
      ),
      whatsappBody: `🔒 Roboutik : ton code de sécurité admin est ${code} (expire dans 10 min). Ne le partage pas.`,
      refType: "ADMIN_2FA",
      refId: admin!.id,
    });

    return NextResponse.json({ ok: true, expiresAt });
  } catch (e) {
    console.error("2FA send-code error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
