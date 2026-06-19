import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/seller/withdrawals  body: { userId, amount, waveNumber }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, amount, waveNumber } = body as {
      userId?: string;
      amount?: number;
      waveNumber?: string;
    };

    if (!userId || !amount || !waveNumber) {
      return NextResponse.json(
        { error: "userId, amount, waveNumber requis" },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: validate amount type
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount)
    ) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (amount < 500) {
      return NextResponse.json(
        { error: "Retrait minimum : 500 FCFA" },
        { status: 400 }
      );
    }

    if (amount > 5_000_000) {
      return NextResponse.json(
        { error: "Retrait maximum : 5 000 000 FCFA. Contacte le support." },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: validate Wave number format (Senegal: 7X XXX XX XX = 9 digits starting with 7)
    const cleanedNumber = waveNumber.replace(/\s+/g, "");
    if (!/^7\d{8}$/.test(cleanedNumber)) {
      return NextResponse.json(
        { error: "Numéro Wave invalide. Format attendu : 76 123 45 67" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ANTI-FRAUD: banned users cannot withdraw
    if (user.isBanned) {
      return NextResponse.json(
        { error: "Ton compte est banni. Contacte le support.", banned: true },
        { status: 403 }
      );
    }

    if (amount > user.balance) {
      return NextResponse.json(
        { error: `Solde insuffisant. Disponible : ${user.balance} FCFA` },
        { status: 400 }
      );
    }

    // ANTI-FRAUD: limit to 1 pending withdrawal at a time
    const pendingCount = await db.withdrawal.count({
      where: { sellerId: userId, status: "PENDING" },
    });
    if (pendingCount >= 3) {
      return NextResponse.json(
        { error: "Tu as déjà 3 retraits en attente. Patiente qu'ils soient traités." },
        { status: 429 }
      );
    }

    // Deduct balance immediately, create withdrawal request
    const [withdrawal] = await db.$transaction([
      db.withdrawal.create({
        data: {
          sellerId: userId,
          amount,
          waveNumber: cleanedNumber,
          status: "PENDING",
        },
      }),
      db.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      }),
    ]);

    return NextResponse.json({ withdrawal });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
