import { NextResponse } from "next/server";
import { isAdminFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await isAdminFromCookies();
  return NextResponse.json({ admin });
}
