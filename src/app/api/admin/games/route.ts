import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/games?adminId=...
 * Body: { name, image, description, isFavorite?, sortOrder? }
 *
 * Creates a new game category. Slug is auto-generated from name.
 */
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const body = await req.json();
  const { name, image, description, isFavorite, sortOrder } = body as {
    name?: string;
    image?: string;
    description?: string;
    isFavorite?: boolean;
    sortOrder?: number;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nom du jeu requis" }, { status: 400 });
  }

  const trimmedName = name.trim().slice(0, 80);
  const slug = trimmedName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Ensure slug uniqueness
  let finalSlug = slug;
  let i = 1;
  while (await db.game.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${i++}`;
  }

  const game = await db.game.create({
    data: {
      name: trimmedName,
      slug: finalSlug,
      image: typeof image === "string" ? image.slice(0, 5000) : "🎮",
      description: typeof description === "string" ? description.slice(0, 500) : "",
      isFavorite: isFavorite === true,
      sortOrder: typeof sortOrder === "number" ? Math.max(0, Math.floor(sortOrder)) : 0,
    },
  });

  return NextResponse.json({ ok: true, game });
}
