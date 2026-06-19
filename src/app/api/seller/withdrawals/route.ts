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

    if (amount < 500) {
      return NextResponse.json(
        { error: "Retrait minimum : 500 FCFA" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (amount > user.balance) {
      return NextResponse.json(
        { error: `Solde insuffisant. Disponible : ${user.balance} FCFA` },
        { status: 400 }
      );
    }

    // Deduct balance immediately, create withdrawal request
    const [withdrawal] = await db.$transaction([
      db.withdrawal.create({
        data: {
          sellerId: userId,
          amount,
          waveNumber,
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
