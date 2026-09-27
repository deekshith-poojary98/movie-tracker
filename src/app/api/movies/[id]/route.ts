import { NextRequest, NextResponse } from "next/server";
import { isAdminFromRequest, unauthorizedJson } from "@/lib/auth";
import { deleteMovie, getMovie, updateMovie } from "@/lib/db";
import { normalizeGenres, parseWatchedDate } from "@/lib/normalize";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const movie = await getMovie(Number(id));
  if (!movie) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ movie });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAdminFromRequest(request)) return unauthorizedJson();

  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.language !== undefined) patch.language = String(body.language);
  if (body.genres !== undefined)
    patch.genres = normalizeGenres(String(body.genres));
  if (body.posterPath !== undefined) patch.posterPath = body.posterPath;
  if (body.backdropPath !== undefined) patch.backdropPath = body.backdropPath;
  if (body.overview !== undefined) patch.overview = body.overview;
  if (body.tagline !== undefined) patch.tagline = body.tagline;
  if (body.director !== undefined) patch.director = body.director;
  if (body.castJson !== undefined) patch.castJson = body.castJson;
  if (body.trailerKey !== undefined) patch.trailerKey = body.trailerKey;
  if (body.tmdbId !== undefined) patch.tmdbId = body.tmdbId;
  if (body.releaseYear !== undefined) patch.releaseYear = body.releaseYear;
  if (body.runtime !== undefined) patch.runtime = body.runtime;
  if (body.voteAverage !== undefined) patch.voteAverage = body.voteAverage;

  if (typeof body.watchedDate === "string") {
    const parsed = parseWatchedDate(body.watchedDate);
    patch.watchedAt = parsed.watchedAt;
    patch.watchedRaw = parsed.watchedRaw;
  } else {
    if (body.watchedAt !== undefined) patch.watchedAt = body.watchedAt;
    if (body.watchedRaw !== undefined) patch.watchedRaw = body.watchedRaw;
  }

  const movie = await updateMovie(Number(id), patch);
  if (!movie) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ movie });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminFromRequest(request)) return unauthorizedJson();

  const { id } = await params;
  const ok = await deleteMovie(Number(id));
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
