/**
 * One-shot: copy movies from local SQLite into MongoDB Atlas.
 *
 * Usage: npx tsx scripts/migrate-sqlite-to-mongo.ts
 */
import { execFileSync } from "child_process";
import path from "path";
import { config } from "dotenv";
import {
  clearMovies,
  ensureMovieIndexes,
  insertMovieDocs,
  setMovieIdCounter,
  type MovieDoc,
} from "../src/lib/db";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const DB_PATH = path.join(process.cwd(), "data", "movies.db");

type SqliteRow = {
  id: number;
  title: string;
  watched_at: string | null;
  watched_raw: string | null;
  language: string;
  genres: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  tagline: string | null;
  director: string | null;
  cast_json: string | null;
  trailer_key: string | null;
  tmdb_id: number | null;
  release_year: number | null;
  runtime: number | null;
  vote_average: number | null;
  created_at: string;
  updated_at: string;
};

function loadSqliteRows(): SqliteRow[] {
  const raw = execFileSync(
    "sqlite3",
    ["-json", DB_PATH, "SELECT * FROM movies ORDER BY id;"],
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
  );
  if (!raw.trim()) return [];
  return JSON.parse(raw) as SqliteRow[];
}

function toIso(sqliteDatetime: string | null | undefined): string {
  if (!sqliteDatetime) return new Date().toISOString();
  // SQLite: "2024-01-15 12:34:56" or already ISO
  if (sqliteDatetime.includes("T")) return new Date(sqliteDatetime).toISOString();
  return new Date(sqliteDatetime.replace(" ", "T") + "Z").toISOString();
}

function rowToDoc(row: SqliteRow): MovieDoc {
  return {
    id: row.id,
    title: row.title,
    watchedAt: row.watched_at ?? null,
    watchedRaw: row.watched_raw ?? null,
    language: row.language || "English",
    genres: row.genres || "",
    posterPath: row.poster_path ?? null,
    backdropPath: row.backdrop_path ?? null,
    overview: row.overview ?? null,
    tagline: row.tagline ?? null,
    director: row.director ?? null,
    castJson: row.cast_json ?? null,
    trailerKey: row.trailer_key ?? null,
    tmdbId: row.tmdb_id ?? null,
    releaseYear: row.release_year ?? null,
    runtime: row.runtime ?? null,
    voteAverage: row.vote_average ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function main() {
  const rows = loadSqliteRows();
  console.log(`Loaded ${rows.length} movies from SQLite`);

  await ensureMovieIndexes();
  await clearMovies();

  const docs = rows.map(rowToDoc);
  const inserted = await insertMovieDocs(docs);
  const maxId = docs.reduce((m, d) => Math.max(m, d.id), 0);
  await setMovieIdCounter(maxId);

  console.log(`Inserted ${inserted} movies into MongoDB (reellog.movies)`);
  console.log(`ID counter set to ${maxId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
