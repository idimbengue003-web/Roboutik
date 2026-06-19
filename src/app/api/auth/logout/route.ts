import { NextResponse } from "next/server";

// POST /api/auth/logout - stateless logout (client clears the session)
export async function POST() {
  return NextResponse.json({ ok: true });
}
