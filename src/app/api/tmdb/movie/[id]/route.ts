import { NextRequest, NextResponse } from "next/server";
import { isAdminFromRequest, unauthorizedJson } from "@/lib/auth";
import { getTmdbMovieDetails, hasTmdbKey } from "@/lib/tmdb";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!isAdminFromRequest(request)) return unauthorizedJson();

  if (!hasTmdbKey()) {
    return NextResponse.json(
      { error: "TMDB_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const movie = await getTmdbMovieDetails(tmdbId);
    if (!movie) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ movie });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
