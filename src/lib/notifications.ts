// Notification service: sends Email (Resend) and WhatsApp (Twilio) to users.
// Falls back to logging when API keys are not configured.

import { db } from "@/lib/db";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "Roboutik <notifications@roboutik.sn>";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // Twilio sandbox default

export type NotificationType =
  | "NEW_MESSAGE"
  | "NEW_ORDER"
  | "ORDER_PAID"
  | "ORDER_DELIVERED"
  | "ORDER_VALIDATED"
  | "WITHDRAWAL_PENDING"
  | "WITHDRAWAL_VALIDATED"
  | "WITHDRAWAL_REJECTED"
  | "TICKET_BOT_REPLY"
  | "TICKET_ADMIN_REPLY"
  | "SELLER_REPORTED"
  | "USER_BANNED";

type NotificationPayload = {
  userId: string;
  type: NotificationType;
  subject: string;
  body: string;
  // Optional WhatsApp-preferred short message (max 1024 chars)
  whatsappBody?: string;
  refType?: string;
  refId?: string;
};

/**
 * Send email + WhatsApp notifications to a user.
 * Always logs to NotificationLog (audit trail), even when API keys are missing.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user) return;

  // Banned users get no notifications (privacy + spam prevention)
  if (user.isBanned) return;

  const emailEnabled = !!RESEND_API_KEY && !!user.email;
  const whatsappEnabled = !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN;
  // For WhatsApp we need a phone number — for now we don't store phone numbers per user.
  // Future: add User.phoneNumber field. Until then, WhatsApp is skipped silently.
  const whatsappBody = payload.whatsappBody ?? payload.body;

  // Email send
  let emailStatus = "SKIPPED";
  let emailError: string | null = null;
  if (emailEnabled) {
    try {
      await sendEmailViaResend(user.email, payload.subject, payload.body);
      emailStatus = "SENT";
    } catch (e) {
      emailStatus = "FAILED";
      emailError = e instanceof Error ? e.message : "Unknown error";
      console.error("Email send failed:", emailError);
    }
  }

  await db.notificationLog.create({
    data: {
      channel: "EMAIL",
      type: payload.type,
      recipientUserId: user.id,
      recipientEmail: user.email,
      subject: payload.subject,
      body: payload.body,
      status: emailStatus,
      errorMessage: emailError,
      refType: payload.refType,
      refId: payload.refId,
    },
  });

  // WhatsApp send (only if enabled AND user has a phone — for now skipped)
  let whatsappStatus = "SKIPPED";
  let whatsappError: string | null = null;
  if (whatsappEnabled && user.email) {
    // Future: replace with user.phoneNumber when added
    whatsappStatus = "SKIPPED";
    whatsappError = "User has no phone number on file";
  }

  await db.notificationLog.create({
    data: {
      channel: "WHATSAPP",
      type: payload.type,
      recipientUserId: user.id,
      recipientEmail: user.email,
      subject: payload.subject,
      body: whatsappBody,
      status: whatsappStatus,
      errorMessage: whatsappError,
      refType: payload.refType,
      refId: payload.refId,
    },
  });
}

async function sendEmailViaResend(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API ${res.status}: ${text}`);
  }
}

// Twilio WhatsApp send (placeholder — activated when TWILIO_* env vars are set)
export async function sendWhatsAppViaTwilio(
  to: string,
  body: string
): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials missing");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      Body: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio API ${res.status}: ${text}`);
  }
}

/**
 * Format a phone number to E.164 (+221... for Senegal).
 * Input: 761234567 or "76 123 45 67" → "+221761234567"
 */
export function formatPhoneE164(phone: string, defaultCountryCode = "221"): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith(defaultCountryCode)) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return `+${defaultCountryCode}${digits}`;
}

/**
 * Build an HTML email body with Roboutik branding.
 */
export function buildEmailHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fdf2f8; padding: 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c026d3, #f97316); padding: 24px; color: white; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800;">🎮 Roboutik</h1>
      <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Achats Roblox sécurisés avec Wave</p>
    </div>
    <div style="padding: 28px;">
      <h2 style="margin: 0 0 12px; color: #1e293b; font-size: 18px;">${title}</h2>
      <div style="color: #475569; line-height: 1.6; font-size: 15px;">
        ${body}
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Cet email a été envoyé par Roboutik. Si tu penses que c'est une erreur, ignore ce message.
        Pour toute question, ouvre un ticket dans l'onglet Support de l'app.
      </p>
    </div>
  </div>
</body>
</html>
`;
}
