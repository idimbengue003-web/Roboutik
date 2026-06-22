import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActorById, errorResponse } from "@/lib/security";
import { sendNotification, buildEmailHtml } from "@/lib/notifications";
import { parseBody, reportListingSchema } from "@/lib/validation";
import { sanitizeMessage } from "@/lib/sanitize";
import { maybeAutoBanSeller, AUTO_BAN_THRESHOLD } from "@/lib/auto-ban";

// POST /api/listings/[id]/report
// body: { userId, reason, details }
// Creates a HIGH priority SELLER ticket (no money lost yet since pre-sale),
// notifies admins, and triggers the auto-ban check.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const [data, parseErr] = parseBody(reportListingSchema, body);
    if (parseErr) return errorResponse(parseErr);
    const { userId } = data!;
    const reason = sanitizeMessage(data!.reason);
    const details = data!.details ? sanitizeMessage(data!.details) : "";

    const { user: reporter, error } = await getActorById(userId);
    if (error) return errorResponse(error);

    const listing = await db.listing.findUnique({
      where: { id },
      include: { game: true, seller: true },
    });
    if (!listing) {
      return NextResponse.json(
        { error: "Annonce introuvable" },
        { status: 404 }
      );
    }

    // Can't report your own listing
    if (listing.sellerId === reporter!.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas signaler ta propre annonce" },
        { status: 400 }
      );
    }

    // Create a HIGH priority SELLER ticket (pre-sale, no money lost yet)
    const ticket = await db.$transaction(async (tx) => {
      const t = await tx.supportTicket.create({
        data: {
          openerId: reporter!.id,
          subject: `Signalement annonce : ${listing.title}`,
          category: "SELLER",
          priority: "HIGH", // not URGENT since no money lost yet
          status: "ADMIN_HANDLED", // escalate immediately to a human
        },
      });

      // User message with context (no order, just the listing snapshot)
      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: reporter!.id,
          senderRole: "USER",
          content: `🚩 SIGNALEMENT D'ANNONCE (avant achat)\n\nAnnonce : ${listing.title}\nJeu : ${listing.game?.name ?? "inconnu"}\nVendeur : ${listing.seller?.username ?? "inconnu"} (${listing.seller?.email ?? ""})\nPrix affiché : ${listing.price} FCFA\n\nMotif : ${reason}\n${details ? `Détails : ${details}` : ""}`,
          isAuto: false,
        },
      });

      // Bot auto-response
      await tx.ticketMessage.create({
        data: {
          ticketId: t.id,
          senderId: null,
          senderRole: "BOT",
          content: `🚩 Ton signalement a bien été reçu. Un administrateur va l'examiner. Comme tu n'as pas encore payé, ce signalement est classé HIGH (priorité haute). NE PROCÈDE PAS À L'ACHAT tant que l'admin n'a pas vérifié le vendeur. Garde les captures d'écran si tu as des preuves.`,
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
          subject: `🚩 Signalement annonce : ${listing.seller?.username ?? "vendeur"}`,
          body: buildEmailHtml(
            "Signalement d'annonce (avant achat)",
            `<p>🚩 <strong>Signalement d'annonce</strong> reçu de ${reporter!.username} :</p>
             <p style="background:#fef3c7; padding:12px; border-radius:8px; border-left:3px solid #f59e0b;">
               <strong>Vendeur signalé :</strong> ${listing.seller?.username}<br>
               <strong>Annonce :</strong> ${listing.title}<br>
               <strong>Jeu :</strong> ${listing.game?.name}<br>
               <strong>Prix :</strong> ${listing.price} FCFA
             </p>
             <p><strong>Motif :</strong> ${reason}</p>
             ${details ? `<p><strong>Détails :</strong> ${details}</p>` : ""}
             <p style="margin-top:16px;">Connecte-toi au panel admin → onglet Support pour traiter ce ticket.</p>`
          ),
          whatsappBody: `🚩 Roboutik : signalement d'annonce de ${reporter!.username} contre ${listing.seller?.username}. Vérifie le panel admin.`,
          refType: "TICKET",
          refId: ticket.id,
        })
      )
    );

    // Check for auto-ban: if the seller has 3+ confirmed reports, ban them automatically
    let autoBanned = false;
    if (listing.sellerId) {
      const result = await maybeAutoBanSeller(listing.sellerId);
      autoBanned = result.banned;
      if (autoBanned) {
        await Promise.all(
          admins.map((admin) =>
            sendNotification({
              userId: admin.id,
              type: "USER_BANNED",
              subject: `🤖 Auto-ban : ${listing.seller?.username} (${AUTO_BAN_THRESHOLD}+ signalements)`,
              body: buildEmailHtml(
                "Vendeur auto-banni",
                `<p>🤖 <strong>Auto-ban déclenché</strong> pour <strong>${listing.seller?.username}</strong>.</p>
                 <p>Le vendeur a atteint le seuil de ${AUTO_BAN_THRESHOLD} signalements confirmés.
                 Il est désormais banni et ne peut plus vendre ni retirer tant qu'un admin ne le débannit pas.</p>`
              ),
              whatsappBody: `🤖 Roboutik : ${listing.seller?.username} a été auto-banni (${AUTO_BAN_THRESHOLD}+ signalements).`,
              refType: "TICKET",
              refId: ticket.id,
            })
          )
        );
      }
    }

    return NextResponse.json({ ticket, ok: true, autoBanned });
  } catch (e) {
    console.error("Report listing error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
