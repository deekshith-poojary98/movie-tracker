import { NextRequest, NextResponse } from "next/server";
import { isAdminFromRequest, unauthorizedJson } from "@/lib/auth";
import { findDuplicateMovies } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminFromRequest(request)) return unauthorizedJson();

  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "";
  const tmdbRaw = searchParams.get("tmdbId");
  const tmdbId = tmdbRaw ? Number(tmdbRaw) : null;
  const excludeRaw = searchParams.get("excludeId");
  const excludeId = excludeRaw ? Number(excludeRaw) : undefined;

  if (!title.trim() && !tmdbId) {
    return NextResponse.json({ movies: [] });
  }

  const movies = await findDuplicateMovies({
    title,
    tmdbId: Number.isFinite(tmdbId) ? tmdbId : null,
    excludeId: Number.isFinite(excludeId) ? excludeId : undefined,
  });

  return NextResponse.json({ movies });
}
