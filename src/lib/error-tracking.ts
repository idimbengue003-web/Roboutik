/**
 * Lightweight error tracking system (Sentry-like, self-hosted).
 *
 * Captures errors:
 *  - Client-side: window.onerror + unhandledrejection → POST /api/errors
 *  - Server-side: API routes wrap their catch blocks with captureError()
 *
 * All errors are logged to the ErrorLog table and visible in admin panel.
 * High-severity errors (500) also notify admins via email.
 */

import { db } from "@/lib/db";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";

type ErrorSeverity = "low" | "medium" | "high" | "critical";

type CaptureErrorInput = {
  message: string;
  stack?: string;
  severity?: ErrorSeverity;
  // Optional context
  userId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  // Arbitrary metadata
  metadata?: Record<string, unknown>;
};

/**
 * Server-side error capture. Logs to DB + notifies admins for critical errors.
 *
 * Usage in API routes:
 *   } catch (e) {
 *     await captureError({
 *       message: e instanceof Error ? e.message : "Unknown",
 *       stack: e instanceof Error ? e.stack : undefined,
 *       severity: "high",
 *       path: req.url,
 *       method: req.method,
 *     });
 *     return NextResponse.json({ error: "..." }, { status: 500 });
 *   }
 */
export async function captureError(input: CaptureErrorInput): Promise<void> {
  const severity = input.severity ?? "medium";

  try {
    // Truncate stack to 4000 chars to avoid DB bloat
    const stack = (input.stack ?? "").slice(0, 4000);
    const message = input.message.slice(0, 1000);

    await db.errorLog.create({
      data: {
        message,
        stack,
        severity,
        userId: input.userId ?? null,
        path: input.path?.slice(0, 500) ?? null,
        method: input.method ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 4000) : null,
      },
    });

    // For critical errors, notify admins
    if (severity === "critical" || severity === "high") {
      const admins = await db.user.findMany({
        where: { isAdmin: true, isBanned: false },
        select: { id: true },
      });

      await Promise.all(
        admins.map((admin) =>
          sendNotification({
            userId: admin.id,
            type: "TICKET_ADMIN_REPLY", // reuse; could add ERROR_ALERT type
            subject: `🚨 Erreur ${severity} : ${message.slice(0, 80)}`,
            body: buildEmailHtml(
              `Erreur ${severity} détectée`,
              `<p>Une erreur <strong>${severity}</strong> s'est produite sur Roboutik :</p>
               <p style="background:#fee2e2; padding:12px; border-radius:8px; border-left:3px solid #ef4444;">
                 <strong>Message :</strong> ${message}<br>
                 ${input.path ? `<strong>Path :</strong> ${input.path}<br>` : ""}
                 ${input.method ? `<strong>Méthode :</strong> ${input.method}<br>` : ""}
                 <strong>Sévérité :</strong> ${severity}
               </p>
               ${stack ? `<p style="margin-top:12px;"><strong>Stack trace :</strong></p>
               <pre style="background:#1e293b; color:#e2e8f0; padding:12px; border-radius:8px; font-size:11px; overflow-x:auto;">${stack.slice(0, 2000)}</pre>` : ""}
               <p style="margin-top:16px;">Vérifie le panel admin → Journal pour plus de détails.</p>`
            ),
            whatsappBody: `🚨 Roboutik : erreur ${severity} sur ${input.path ?? "?"}. Vérifie le panel admin.`,
            refType: "ERROR",
          })
        )
      );
    }
  } catch (loggingError) {
    // If error logging itself fails, just console.error (don't infinite loop)
    console.error("Failed to log error:", loggingError);
  }
}
