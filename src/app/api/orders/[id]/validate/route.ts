import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/orders/[id]/validate - buyer validates, balance goes to seller
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: { listing: { include: { game: true } }, seller: true, buyer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (order.status === "VALIDATED") {
      return NextResponse.json({ error: "Commande déjà validée" }, { status: 400 });
    }

    if (order.status !== "DELIVERED" && order.status !== "PAID") {
      return NextResponse.json(
        { error: "Le vendeur doit d'abord confirmer la livraison" },
        { status: 400 }
      );
    }

    const now = new Date();
    const netAmount = order.sellerNetAmount;
    await db.$transaction([
      db.order.update({
        where: { id },
        data: { status: "VALIDATED", validatedAt: now },
      }),
      db.user.update({
        where: { id: order.sellerId },
        data: { balance: { increment: netAmount } },
      }),
      db.message.create({
        data: {
          orderId: order.id,
          senderId: order.sellerId,
          content: `🛡️ ROBLOX BOUTIK — Commande validée. Le vendeur a reçu ${netAmount} FCFA sur son solde. Merci pour votre achat !`,
          isAuto: true,
        },
      }),
    ]);

    // 🔔 Notify the SELLER that their balance has been credited
    try {
      const { sendNotification, buildEmailHtml } = await import("@/lib/notifications");
      await sendNotification({
        userId: order.sellerId,
        type: "ORDER_VALIDATED",
        subject: `✅ Vente validée — ${netAmount} FCFA crédités`,
        body: buildEmailHtml(
          "Vente validée ✅",
          `<p>Bonjour <strong>${order.seller.username}</strong>,</p>
           <p>Ta vente a été validée par l'acheteur. Ton solde a été crédité :</p>
           <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:16px 0;">
             <p style="margin:0;font-size:16px;"><strong>${order.listing.title}</strong></p>
             <p style="margin:8px 0 0;font-size:20px;color:#16a34a;font-weight:800;">+${netAmount} FCFA</p>
           </div>
           <p>Tu peux maintenant retirer ton solde vers Wave depuis ton espace vendeur.</p>
           <p style="margin-top:24px;"><a href="https://robloxboutik.com" style="background:#c026d3;color:white;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:bold;">Voir mon solde</a></p>`
        ),
        whatsappBody: `✅ Vente validée: +${netAmount} FCFA crédités sur ton solde RobloxBoutik. Tu peux retirer vers Wave.`,
        refType: "ORDER",
        refId: order.id,
      });
    } catch (e) {
      console.error("Seller notification (validated) failed:", e);
    }

    // 🔔 Ask the BUYER to leave a review
    try {
      const { sendNotification, buildEmailHtml } = await import("@/lib/notifications");
      sendNotification({
        userId: order.buyerId,
        type: "ORDER_VALIDATED",
        subject: `⭐ Comment s'est passée ta commande ?`,
        body: buildEmailHtml(
          "Laisse un avis ⭐",
          `<p>Bonjour <strong>${order.buyer?.username ?? ""}</strong>,</p>
           <p>Ta commande a été validée ! On espère que tu es satisfait·e de ton achat :</p>
           <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;">
             <p style="margin:0;font-size:16px;"><strong>${order.listing.title}</strong></p>
             <p style="margin:4px 0 0;color:#475569;">${order.listing.game?.name} · ${order.amount} FCFA</p>
           </div>
           <p>Ton avis aide les autres acheteurs à faire confiance à <strong>${order.seller.username}</strong> et à RobloxBoutik.</p>
           <p>Ça prend 10 secondes :</p>
           <p style="margin-top:24px;">
             <a href="https://robloxboutik.com" style="background:#f59e0b;color:white;padding:14px 28px;border-radius:9999px;text-decoration:none;font-weight:bold;font-size:16px;">
               ⭐ Noter ma commande
             </a>
           </p>
           <p style="margin-top:16px;font-size:12px;color:#94a3b8;">
             Connecte-toi, ouvre l'onglet Commandes, clique sur ta commande puis sur "Noter".
           </p>`
        ),
        whatsappBody: `⭐ RobloxBoutik : ta commande "${order.listing.title}" est validée ! Laisse un avis en te connectant sur robloxboutik.com`,
        refType: "REVIEW_REQUEST",
        refId: order.id,
      }).catch((e) => console.error("Review request failed:", e));
    } catch (e) {
      console.error("Review request setup failed:", e);
    }

    const updated = await db.order.findUnique({
      where: { id },
      include: {
        listing: { include: { game: true, ratings: true } },
        seller: true,
        buyer: true,
        messages: { orderBy: { createdAt: "asc" } },
        rating: true,
      },
    });

    return NextResponse.json({ order: updated });
  } catch (e) {
    console.error("Validate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
