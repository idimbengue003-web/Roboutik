import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizePlainText } from "@/lib/sanitize";

// PATCH /api/listings/[id]
// body: {
//   userId: string,
//   active?: boolean,
//   title?: string,
//   description?: string,
//   sellerNetPrice?: number,
//   stock?: number,
//   images?: string | null,
// }
// - sellerNetPrice: when changed, the buyer `price` is recomputed (= sellerNetPrice, no commission)
// - images: JSON string array of base64 data URLs (max 4) — pass null/empty to clear
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      userId,
      active,
      title,
      description,
      sellerNetPrice,
      stock,
      images,
    } = body as {
      userId?: string;
      active?: boolean;
      title?: string;
      description?: string;
      sellerNetPrice?: number;
      stock?: number;
      images?: string | null;
    };

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

    // Build the update payload from provided fields
    const update: Record<string, unknown> = {};

    if (typeof active === "boolean") {
      update.active = active;
    }

    if (typeof title === "string") {
      const t = sanitizePlainText(title).trim();
      if (t.length >= 5 && t.length <= 80) {
        update.title = t;
      } else if (t.length > 0) {
        return NextResponse.json(
          { error: "Titre entre 5 et 80 caractères" },
          { status: 400 }
        );
      }
    }

    if (typeof description === "string") {
      const d = sanitizePlainText(description).trim();
      if (d.length >= 10 && d.length <= 500) {
        update.description = d;
      } else if (d.length > 0) {
        return NextResponse.json(
          { error: "Description entre 10 et 500 caractères" },
          { status: 400 }
        );
      }
    }

    if (typeof sellerNetPrice === "number" && Number.isFinite(sellerNetPrice)) {
      const net = Math.floor(sellerNetPrice);
      if (net < 100 || net > 1_000_000) {
        return NextResponse.json(
          { error: "Prix entre 100 et 1 000 000 FCFA" },
          { status: 400 }
        );
      }
      // sellerNetPrice here = what the seller wants the buyer to pay (displayed price)
      // Seller actually receives 84% (16% commission kept by platform)
      update.price = net; // displayed price = buyer price
      update.sellerNetPrice = Math.round(net * 0.84); // seller receives 84%
    }

    if (typeof stock === "number" && Number.isFinite(stock)) {
      update.stock = Math.max(0, Math.min(9999, Math.floor(stock)));
    }

    // Images: optional JSON string of base64 data URLs array
    if (images !== undefined) {
      let imagesJson: string | null = null;
      if (typeof images === "string" && images.length > 0) {
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (item) => typeof item === "string" && item.startsWith("data:image/")
            );
            if (valid.length > 0) {
              imagesJson = JSON.stringify(valid.slice(0, 1));
            }
          }
        } catch {
          // Invalid JSON — ignore images
        }
      }
      update.images = imagesJson;
    }

    const updated = await db.listing.update({
      where: { id },
      data: update,
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
