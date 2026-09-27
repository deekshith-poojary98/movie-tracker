import { NextRequest, NextResponse } from "next/server";
import { isAdminFromRequest, unauthorizedJson } from "@/lib/auth";
import { hasTmdbKey, searchTmdbMovies } from "@/lib/tmdb";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminFromRequest(request)) return unauthorizedJson();

  const q = request.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  if (!hasTmdbKey()) {
    return NextResponse.json(
      { results: [], error: "TMDB_API_KEY not configured" },
      { status: 200 }
    );
  }

  const yearRaw = request.nextUrl.searchParams.get("year");
  const year = yearRaw ? Number(yearRaw) : undefined;
  const language = request.nextUrl.searchParams.get("language") || undefined;

  try {
    const results = await searchTmdbMovies(q, 10, {
      year: year && Number.isFinite(year) ? year : undefined,
      language,
    });
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[tmdb/search]", q, err);
    return NextResponse.json(
      {
        results: [],
        error:
          "TMDB is temporarily unreachable. Wait a moment and try again.",
      },
      { status: 502 }
    );
  }
}
