import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

/**
 * POST /api/admin/rename-sellers?adminId=...
 *
 * Renames the 7 fictional sellers to user-provided names + matching avatars.
 * Maps by creation order (oldest first).
 */

const NEW_NAMES: { username: string; avatar: string }[] = [
  { username: "Robloxking", avatar: "👑" },
  { username: "Abou Diarra", avatar: "🦁" },
  { username: "Momo", avatar: "🎮" },
  { username: "Brtking", avatar: "⚡" },
  { username: "Hibou_thebest", avatar: "🦉" },
  { username: "Vendeur Legit", avatar: "✅" },
  { username: "Itachii", avatar: "🥷" },
];

// Old emails (in creation order) to map by
const OLD_EMAILS = [
  "sengameshop@robloxboutik.sn",
  "robloxdakar@robloxboutik.sn",
  "gaming221@robloxboutik.sn",
  "pixelstore@robloxboutik.sn",
  "fastitemssn@robloxboutik.sn",
  "dakargaming@robloxboutik.sn",
  "brainrotking@robloxboutik.sn",
];

export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const renamed: string[] = [];
  let notFound: string[] = [];

  for (let i = 0; i < OLD_EMAILS.length; i++) {
    const oldEmail = OLD_EMAILS[i];
    const { username, avatar } = NEW_NAMES[i];

    const seller = await db.user.findUnique({ where: { email: oldEmail } });
    if (!seller) {
      notFound.push(oldEmail);
      continue;
    }

    // Generate a new email based on the new username (slugified)
    const slug = username
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 30);
    const newEmail = `${slug}@robloxboutik.sn`;

    // Check if a user with the new email already exists (shouldn't, but defensive)
    const existing = await db.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== seller.id) {
      // Skip rename if target email already used by another user
      renamed.push(`${oldEmail} → SKIPPED (email ${newEmail} already taken)`);
      continue;
    }

    // Check username uniqueness
    const existingUsername = await db.user.findFirst({
      where: { username, NOT: { id: seller.id } },
    });
    if (existingUsername) {
      renamed.push(`${oldEmail} → SKIPPED (username ${username} already taken)`);
      continue;
    }

    await db.user.update({
      where: { id: seller.id },
      data: {
        username,
        avatar,
        email: newEmail,
      },
    });

    renamed.push(`${oldEmail} → ${username} (${newEmail}, ${avatar})`);
  }

  return NextResponse.json({
    ok: true,
    renamed,
    notFound,
    summary: {
      renamedCount: renamed.filter((r) => !r.includes("SKIPPED")).length,
      skippedCount: renamed.filter((r) => r.includes("SKIPPED")).length,
      notFoundCount: notFound.length,
    },
  });
}
