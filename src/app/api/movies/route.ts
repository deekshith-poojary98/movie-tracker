import { NextRequest, NextResponse } from "next/server";
import { isAdminFromRequest, unauthorizedJson } from "@/lib/auth";
import {
  createMovie,
  getDistinctGenres,
  getDistinctLanguages,
  listMovies,
} from "@/lib/db";
import { normalizeGenres, parseWatchedDate } from "@/lib/normalize";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const movies = await listMovies({
    q: searchParams.get("q") || undefined,
    language: searchParams.get("language") || undefined,
    genre: searchParams.get("genre") || undefined,
    year: searchParams.get("year") || undefined,
  });

  const [languages, genres] = await Promise.all([
    getDistinctLanguages(),
    getDistinctGenres(),
  ]);

  return NextResponse.json({
    movies,
    meta: {
      languages,
      genres,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminFromRequest(request)) return unauthorizedJson();

  const body = await request.json();
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  let watchedAt = body.watchedAt ?? null;
  let watchedRaw = body.watchedRaw ?? null;

  if (typeof body.watchedDate === "string" && body.watchedDate.trim()) {
    const parsed = parseWatchedDate(body.watchedDate);
    watchedAt = parsed.watchedAt;
    watchedRaw = parsed.watchedRaw;
  } else if (
    typeof body.watchedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.watchedAt)
  ) {
    watchedAt = body.watchedAt;
    watchedRaw = body.watchedAt;
  }

  const movie = await createMovie({
    title,
    watchedAt,
    watchedRaw,
    language: String(body.language || ""),
    genres: normalizeGenres(String(body.genres || "")),
    posterPath: body.posterPath ?? null,
    backdropPath: body.backdropPath ?? null,
    overview: body.overview ?? null,
    tagline: body.tagline ?? null,
    director: body.director ?? null,
    castJson: body.castJson ?? null,
    trailerKey: body.trailerKey ?? null,
    tmdbId: body.tmdbId ?? null,
    releaseYear: body.releaseYear ?? null,
    runtime: body.runtime ?? null,
    voteAverage: body.voteAverage ?? null,
  });

  return NextResponse.json({ movie }, { status: 201 });
}
