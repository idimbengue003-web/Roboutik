import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";
import { classifyMessage } from "@/lib/support-bot";
import { parseBody, reportSellerSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";
import { maybeAutoBanSeller, AUTO_BAN_THRESHOLD } from "@/lib/auto-ban";

// POST /api/orders/[id]/report
// body: { userId, reason, details }
// Creates a URGENT support ticket + notifies all admins + escalates
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(reportSellerSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { userId } = data!;
    const reason = sanitizeMessage(data!.reason);
    const details = data!.details ? sanitizeMessage(data!.details) : "";

    const { user: reporter, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Only the buyer of the order can report
    if (order.buyerId !== reporter!.id) {
      return NextResponse.json(
        { error: "Seul l'acheteur peut signaler cette commande" },
        { status: 403 }
      );
    }

    const fullReason = `${reason}${details ? ` — ${details}` : ""}`;

    // Classify (will be URGENT because we include "arnaque" / "fraude" keyword in subject)
    const bot = classifyMessage(`signaler vendeur arnaque ${fullReason}`);

    // Create a URGENT ticket
    const ticket = await db.$transaction(async (tx) => {
      const t = await tx.supportTicket.create({
        data: {
          openerId: reporter!.id,
          subject: `Signalement vendeur : ${order.seller?.username ?? "inconnu"}`,
          category: "SELLER",
          priority: "URGENT",
          orderId: order.id,
          status: "ADMIN_HANDLED", // escalate immediately
        },
      });

      // User message with context
      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: reporter!.id,
          senderRole: "USER",
          content: `🚨 SIGNALEMENT DE VENDEUR\n\nVendeur signalé : ${order.seller?.username} (${order.seller?.email})\nCommande : ${order.listing?.title} — ${order.listing?.game?.name}\nMontant : ${order.amount} FCFA\nStatut commande : ${order.status}\n\nMotif : ${reason}\n${details ? `Détails : ${details}` : ""}`,
          isAuto: false,
        },
      });

      // Bot auto-response
      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: null,
          senderRole: "BOT",
          content: `🚨 Ton signalement a bien été reçu et classé URGENT. Un administrateur va l'examiner en priorité (sous 1h en journée). En attendant, NE VALIDE PAS la commande. Garde toutes les captures d'écran de tes échanges avec le vendeur.`,
          isAuto: true,
        },
      });

      return t;
    });

    // Notify ALL admins
    const admins = await db.user.findMany({ where: { isAdmin: true } });
    await Promise.all(
      admins.map((admin) =>
        sendNotification({
          userId: admin.id,
          type: "SELLER_REPORTED",
          subject: `🚨 SIGNALEMENT URGENT : ${order.seller?.username}`,
          body: buildEmailHtml(
            "Signalement vendeur en attente",
            `<p>🚨 <strong>Signalement URGENT</strong> reçu de ${reporter!.username} :</p>
             <p style="background:#fee2e2; padding:12px; border-radius:8px; border-left:3px solid #ef4444;">
               <strong>Vendeur signalé :</strong> ${order.seller?.username}<br>
               <strong>Commande :</strong> ${order.listing?.title} (${order.listing?.game?.name})<br>
               <strong>Montant :</strong> ${order.amount} FCFA<br>
               <strong>Statut :</strong> ${order.status}
             </p>
             <p><strong>Motif :</strong> ${reason}</p>
             ${details ? `<p><strong>Détails :</strong> ${details}</p>` : ""}
             <p style="margin-top:16px;">Connecte-toi au panel admin → onglet Support pour traiter ce ticket.</p>`
          ),
          whatsappBody: `🚨 Roboutik : signalement URGENT de ${order.seller?.username} par ${reporter!.username}. Va sur le panel admin pour traiter.`,
          refType: "TICKET",
          refId: ticket.id,
        })
      )
    );

    // Check for auto-ban: if seller has 3+ confirmed reports, ban them automatically
    let autoBanned = false;
    if (order.sellerId) {
      const result = await maybeAutoBanSeller(order.sellerId);
      autoBanned = result.banned;
      if (autoBanned) {
        // Notify all admins that seller was auto-banned
        await Promise.all(
          admins.map((admin) =>
            sendNotification({
              userId: admin.id,
              type: "USER_BANNED",
              subject: `🤖 Auto-ban : ${order.seller?.username} (${AUTO_BAN_THRESHOLD}+ signalements)`,
              body: buildEmailHtml(
                "Vendeur auto-banni",
                `<p>🤖 <strong>Auto-ban déclenché</strong> pour <strong>${order.seller?.username}</strong>.</p>
                 <p>Le vendeur a atteint le seuil de ${AUTO_BAN_THRESHOLD} signalements confirmés.
                 Il est désormais banni et ne peut plus vendre ni retirer tant qu'un admin ne le débannit pas.</p>
                 <p style="margin-top:16px;">Vérifie les signalements dans le panel admin → Support. Si le vendeur a fait appel, examine son cas.</p>`
              ),
              whatsappBody: `🤖 Roboutik : ${order.seller?.username} a été auto-banni (${AUTO_BAN_THRESHOLD}+ signalements). Vérifie le panel admin.`,
              refType: "TICKET",
              refId: ticket.id,
            })
          )
        );
      }
    }

    return NextResponse.json({ ticket, ok: true, autoBanned });
  } catch (e) {
    console.error("Report seller error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
