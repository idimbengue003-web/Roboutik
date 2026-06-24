import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * PATCH /api/admin/games/[id]?adminId=...
 * Body: { name?, image?, description?, isFavorite?, sortOrder?, active? }
 *
 * Updates an existing game. If name changes, slug is regenerated (uniquely).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const { id } = await params;
  const existing = await db.game.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const { name, image, description, isFavorite, sortOrder } = body as {
    name?: string;
    image?: string;
    description?: string;
    isFavorite?: boolean;
    sortOrder?: number;
  };

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim() && name !== existing.name) {
    const trimmedName = name.trim().slice(0, 80);
    const slug = trimmedName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    let finalSlug = slug;
    let i = 1;
    while (
      (await db.game.findFirst({ where: { slug: finalSlug, NOT: { id } } }))
    ) {
      finalSlug = `${slug}-${i++}`;
    }
    data.name = trimmedName;
    data.slug = finalSlug;
  }
  if (typeof image === "string") data.image = image.slice(0, 5000);
  if (typeof description === "string") data.description = description.slice(0, 500);
  if (typeof isFavorite === "boolean") data.isFavorite = isFavorite;
  if (typeof sortOrder === "number") data.sortOrder = Math.max(0, Math.floor(sortOrder));

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const game = await db.game.update({ where: { id }, data });
  return NextResponse.json({ ok: true, game });
}

/**
 * DELETE /api/admin/games/[id]?adminId=...
 *
 * Deletes a game. Will fail if it still has listings (foreign key).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const { id } = await params;
  const existing = await db.game.findUnique({
    where: { id },
    include: { _count: { select: { listings: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });
  }
  if (existing._count.listings > 0) {
    return NextResponse.json(
      {
        error: `Impossible de supprimer : ${existing._count.listings} annonce(s) existent dans cette catégorie. Supprime ou déplace d'abord les annonces.`,
      },
      { status: 400 }
    );
  }

  await db.game.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
