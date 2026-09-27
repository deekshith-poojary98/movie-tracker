import type { Collection, WithId } from "mongodb";
import { getMongoDb } from "./mongo";
import type { Movie, MovieFilters, MovieInput } from "./types";
import { toTitleCase } from "./normalize";

export type MovieDoc = {
  id: number;
  title: string;
  watchedAt: string | null;
  watchedRaw: string | null;
  language: string;
  genres: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  tagline: string | null;
  director: string | null;
  castJson: string | null;
  trailerKey: string | null;
  tmdbId: number | null;
  releaseYear: number | null;
  runtime: number | null;
  voteAverage: number | null;
  createdAt: string;
  updatedAt: string;
};

type CounterDoc = { _id: string; seq: number };

async function movies(): Promise<Collection<MovieDoc>> {
  const db = await getMongoDb();
  return db.collection<MovieDoc>("movies");
}

async function counters(): Promise<Collection<CounterDoc>> {
  const db = await getMongoDb();
  return db.collection<CounterDoc>("counters");
}

function docToMovie(doc: WithId<MovieDoc> | MovieDoc): Movie {
  return {
    id: doc.id,
    title: toTitleCase(doc.title),
    watchedAt: doc.watchedAt ?? null,
    watchedRaw: doc.watchedRaw ?? null,
    language: doc.language,
    genres: doc.genres,
    posterPath: doc.posterPath ?? null,
    backdropPath: doc.backdropPath ?? null,
    overview: doc.overview ?? null,
    tagline: doc.tagline ?? null,
    director: doc.director ?? null,
    castJson: doc.castJson ?? null,
    trailerKey: doc.trailerKey ?? null,
    tmdbId: doc.tmdbId ?? null,
    releaseYear: doc.releaseYear ?? null,
    runtime: doc.runtime ?? null,
    voteAverage: doc.voteAverage ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

async function nextMovieId(): Promise<number> {
  const col = await counters();
  const result = await col.findOneAndUpdate(
    { _id: "movies" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  if (!result) throw new Error("Failed to allocate movie id");
  return result.seq;
}

/** Ensure indexes exist (safe to call repeatedly). */
export async function ensureMovieIndexes(): Promise<void> {
  const col = await movies();
  await Promise.all([
    col.createIndex({ id: 1 }, { unique: true, name: "idx_movies_id" }),
    col.createIndex({ title: 1 }, { name: "idx_movies_title" }),
    col.createIndex({ language: 1 }, { name: "idx_movies_language" }),
    col.createIndex({ watchedAt: -1 }, { name: "idx_movies_watchedAt" }),
    col.createIndex({ tmdbId: 1 }, { name: "idx_movies_tmdbId" }),
  ]);
}

export async function listMovies(filters: MovieFilters = {}): Promise<Movie[]> {
  const col = await movies();
  const query: Record<string, unknown> = {};

  if (filters.q) {
    query.title = { $regex: filters.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }
  if (filters.language) {
    query.language = filters.language;
  }
  if (filters.genre) {
    query.genres = {
      $regex: filters.genre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }
  if (filters.year) {
    query.$or = [
      { watchedAt: { $regex: `^${filters.year}` } },
      { watchedRaw: { $regex: filters.year } },
    ];
  }

  const docs = await col
    .find(query)
    .sort({ watchedAt: -1, id: -1 })
    .toArray();

  // Null watchedAt last (Mongo sorts nulls first for descending — fix in JS)
  docs.sort((a, b) => {
    if (!a.watchedAt && !b.watchedAt) return b.id - a.id;
    if (!a.watchedAt) return 1;
    if (!b.watchedAt) return -1;
    const cmp = b.watchedAt.localeCompare(a.watchedAt);
    return cmp !== 0 ? cmp : b.id - a.id;
  });

  return docs.map(docToMovie);
}

export async function getMovie(id: number): Promise<Movie | null> {
  const doc = await (await movies()).findOne({ id });
  return doc ? docToMovie(doc) : null;
}

/** Match by TMDB id, or case-insensitive exact title. */
export async function findDuplicateMovies(opts: {
  title: string;
  tmdbId?: number | null;
  excludeId?: number;
}): Promise<Movie[]> {
  const title = opts.title.trim();
  if (!title && !opts.tmdbId) return [];

  const or: Record<string, unknown>[] = [];
  if (opts.tmdbId) or.push({ tmdbId: opts.tmdbId });
  if (title) {
    or.push({
      title: {
        $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });
  }

  const query: Record<string, unknown> = { $or: or };
  if (opts.excludeId != null) query.id = { $ne: opts.excludeId };

  const docs = await (await movies())
    .find(query)
    .sort({ watchedAt: -1, id: -1 })
    .limit(10)
    .toArray();

  return docs.map(docToMovie);
}

export async function createMovie(input: MovieInput): Promise<Movie> {
  const id = await nextMovieId();
  const stamp = nowIso();
  const doc: MovieDoc = {
    id,
    title: toTitleCase(input.title),
    watchedAt: input.watchedAt ?? null,
    watchedRaw: input.watchedRaw ?? null,
    language: input.language.trim(),
    genres: input.genres.trim(),
    posterPath: input.posterPath ?? null,
    backdropPath: input.backdropPath ?? null,
    overview: input.overview ?? null,
    tagline: input.tagline ?? null,
    director: input.director ?? null,
    castJson: input.castJson ?? null,
    trailerKey: input.trailerKey ?? null,
    tmdbId: input.tmdbId ?? null,
    releaseYear: input.releaseYear ?? null,
    runtime: input.runtime ?? null,
    voteAverage: input.voteAverage ?? null,
    createdAt: stamp,
    updatedAt: stamp,
  };

  await (await movies()).insertOne(doc);
  return docToMovie(doc);
}

export async function updateMovie(
  id: number,
  input: Partial<MovieInput>
): Promise<Movie | null> {
  const existing = await getMovie(id);
  if (!existing) return null;

  const next: MovieDoc = {
    id,
    title: input.title !== undefined ? toTitleCase(input.title) : existing.title,
    watchedAt:
      input.watchedAt !== undefined ? input.watchedAt : existing.watchedAt,
    watchedRaw:
      input.watchedRaw !== undefined ? input.watchedRaw : existing.watchedRaw,
    language: input.language?.trim() ?? existing.language,
    genres: input.genres !== undefined ? input.genres.trim() : existing.genres,
    posterPath:
      input.posterPath !== undefined ? input.posterPath : existing.posterPath,
    backdropPath:
      input.backdropPath !== undefined
        ? input.backdropPath
        : existing.backdropPath,
    overview: input.overview !== undefined ? input.overview : existing.overview,
    tagline: input.tagline !== undefined ? input.tagline : existing.tagline,
    director: input.director !== undefined ? input.director : existing.director,
    castJson: input.castJson !== undefined ? input.castJson : existing.castJson,
    trailerKey:
      input.trailerKey !== undefined ? input.trailerKey : existing.trailerKey,
    tmdbId: input.tmdbId !== undefined ? input.tmdbId : existing.tmdbId,
    releaseYear:
      input.releaseYear !== undefined
        ? input.releaseYear
        : existing.releaseYear,
    runtime: input.runtime !== undefined ? input.runtime : existing.runtime,
    voteAverage:
      input.voteAverage !== undefined
        ? input.voteAverage
        : existing.voteAverage,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  };

  await (await movies()).updateOne({ id }, { $set: next });
  return docToMovie(next);
}

export async function deleteMovie(id: number): Promise<boolean> {
  const result = await (await movies()).deleteOne({ id });
  return result.deletedCount > 0;
}

export async function clearMovies(): Promise<void> {
  await (await movies()).deleteMany({});
}

export async function getDistinctLanguages(): Promise<string[]> {
  const langs = await (await movies()).distinct("language");
  return langs
    .filter((l): l is string => typeof l === "string" && l !== "")
    .sort((a, b) => a.localeCompare(b));
}

export async function getDistinctGenres(): Promise<string[]> {
  const docs = await (await movies())
    .find({ genres: { $ne: "" } }, { projection: { genres: 1 } })
    .toArray();
  const set = new Set<string>();
  for (const doc of docs) {
    for (const g of doc.genres.split(",")) {
      const t = g.trim();
      if (t) set.add(t);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function countMovies(): Promise<number> {
  return (await movies()).countDocuments();
}

/** Set the auto-increment counter (used after bulk migrate). */
export async function setMovieIdCounter(maxId: number): Promise<void> {
  await (await counters()).updateOne(
    { _id: "movies" },
    { $set: { seq: maxId } },
    { upsert: true }
  );
}

/** Insert many docs preserving ids (migration). */
export async function insertMovieDocs(docs: MovieDoc[]): Promise<number> {
  if (docs.length === 0) return 0;
  const result = await (await movies()).insertMany(docs, { ordered: false });
  return result.insertedCount;
}
