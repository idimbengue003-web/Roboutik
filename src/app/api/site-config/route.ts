import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor, errorResponse } from "@/lib/security";

// GET /api/site-config — public, returns theme + branding
export async function GET() {
  let config = await db.siteConfig.findUnique({ where: { id: "default" } });
  if (!config) {
    config = await db.siteConfig.create({ data: { id: "default" } });
  }
  return NextResponse.json({ config });
}

// POST /api/site-config — admin-only, updates theme + branding
export async function POST(req: NextRequest) {
  const { error } = await getActor(req, { requireAdmin: true });
  if (error) return errorResponse(error);

  const body = await req.json();
  const {
    primaryColor,
    accentColor,
    bgColor,
    siteName,
    heroTitle,
    heroSubtitle,
  } = body as {
    primaryColor?: string;
    accentColor?: string;
    bgColor?: string;
    siteName?: string;
    heroTitle?: string;
    heroSubtitle?: string;
  };

  const data: Record<string, string> = {};
  if (typeof primaryColor === "string") {
    const c = primaryColor.replace(/^#/, "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(c))
      return NextResponse.json({ error: "Couleur primaire invalide (hex 6)" }, { status: 400 });
    data.primaryColor = c;
  }
  if (typeof accentColor === "string") {
    const c = accentColor.replace(/^#/, "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(c))
      return NextResponse.json({ error: "Couleur accent invalide (hex 6)" }, { status: 400 });
    data.accentColor = c;
  }
  if (typeof bgColor === "string") {
    const c = bgColor.replace(/^#/, "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(c))
      return NextResponse.json({ error: "Couleur fond invalide (hex 6)" }, { status: 400 });
    data.bgColor = c;
  }
  if (typeof siteName === "string" && siteName.trim()) data.siteName = siteName.trim().slice(0, 50);
  if (typeof heroTitle === "string") data.heroTitle = heroTitle.trim().slice(0, 120);
  if (typeof heroSubtitle === "string") data.heroSubtitle = heroSubtitle.trim().slice(0, 200);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const config = await db.siteConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, config });
}
