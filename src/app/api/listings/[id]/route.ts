import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/listings/[id]  body: { userId, active? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId, active } = body as { userId?: string; active?: boolean };

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const listing = await db.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
    }
    if (listing.sellerId !== userId) {
      return NextResponse.json({ error: "Pas ton annonce" }, { status: 403 });
    }

    const updated = await db.listing.update({
      where: { id },
      data: { active: typeof active === "boolean" ? active : listing.active },
      include: { game: true },
    });

    return NextResponse.json({ listing: updated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/listings/[id]?userId=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const listing = await db.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
    }
    if (listing.sellerId !== userId) {
      return NextResponse.json({ error: "Pas ton annonce" }, { status: 403 });
    }

    await db.listing.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
