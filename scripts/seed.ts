import fs from "fs";
import path from "path";
import { config } from "dotenv";
import {
  clearMovies,
  createMovie,
  countMovies,
  ensureMovieIndexes,
  listMovies,
  updateMovie,
} from "../src/lib/db";
import { normalizeGenres, parseWatchedDate } from "../src/lib/normalize";
import { resolveSheetDates } from "../src/lib/sheetDates";
import { findBestTmdbMatch, getTmdbMovieDetails, hasTmdbKey, sleep, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const SHEET_PATH = path.join(
  process.cwd(),
  "Watched movies list",
  "sheet.html"
);
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "seed-snapshot.json");

type ParsedRow = {
  sl: string;
  date: string;
  title: string;
  language: string;
  genre: string;
};

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractCells(rowHtml: string): string[] {
  const cells = rowHtml.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
  return cells.map((cell) =>
    decodeEntities(
      cell
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
  );
}

function parseSheetHtml(html: string): ParsedRow[] {
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  const out: ParsedRow[] = [];

  for (const row of rows) {
    const cells = extractCells(row);
    if (cells.length < 6) continue;

    const sl = cells[1];
    const date = cells[2];
    const title = cells[3];
    const language = cells[4];
    const genre = cells[5];

    if (!sl || !/^\d+$/.test(sl)) continue;
    if (!title) continue;

    out.push({
      sl,
      date: date || "",
      title,
      language: language || "English",
      genre: genre || "",
    });
  }

  return out;
}

function loadSheetRows(): ParsedRow[] {
  if (!fs.existsSync(SHEET_PATH)) {
    console.error(`Sheet not found at ${SHEET_PATH}`);
    process.exit(1);
  }
  return parseSheetHtml(fs.readFileSync(SHEET_PATH, "utf8"));
}

/** Update watched dates only (keeps TMDB posters). */
async function fixDatesOnly() {
  await ensureMovieIndexes();
  const rows = loadSheetRows();
  const resolved = resolveSheetDates(
    rows.map((r) => ({ title: r.title, date: r.date }))
  );

  const movies = await listMovies();
  // Match by sheet order / title sequence — seed inserts in sheet order with increasing ids
  const byTitleOrder = [...movies].sort((a, b) => a.id - b.id);

  if (byTitleOrder.length !== rows.length) {
    console.warn(
      `DB has ${byTitleOrder.length} movies, sheet has ${rows.length}. Matching by title+index best-effort.`
    );
  }

  let updated = 0;
  let inferred = 0;
  const unresolved: string[] = [];

  const n = Math.min(byTitleOrder.length, rows.length);
  for (let i = 0; i < n; i++) {
    const movie = byTitleOrder[i];
    const dateInfo = resolved[i];
    if (dateInfo.unresolved) {
      unresolved.push(`${rows[i].title} (${rows[i].date})`);
      continue;
    }
    if (!dateInfo.watchedAt) continue;

    const same =
      movie.watchedAt === dateInfo.watchedAt &&
      movie.watchedRaw === dateInfo.watchedRaw;
    if (same) continue;

    await updateMovie(movie.id, {
      watchedAt: dateInfo.watchedAt,
      watchedRaw: dateInfo.watchedRaw,
    });
    updated++;
    if (dateInfo.inferred) inferred++;
  }

  // Any trailing unresolved from sheet longer than db
  for (let i = n; i < resolved.length; i++) {
    if (resolved[i].unresolved) {
      unresolved.push(`${rows[i].title} (${rows[i].date})`);
    }
  }

  console.log(`Updated ${updated} dates (${inferred} were year-inferred).`);
  if (unresolved.length) {
    console.log("\nCould not determine year for:");
    for (const u of unresolved) console.log(`  - ${u}`);
  } else {
    console.log("All partial dates resolved.");
  }
}

/** Refresh TMDB metadata (genres, poster, overview, runtime, rating) without wiping the DB. */
async function enrichFromTmdb() {
  if (!hasTmdbKey()) {
    console.error("TMDB_API_KEY is required for enrich.");
    process.exit(1);
  }

  await ensureMovieIndexes();
  const movies = (await listMovies()).sort((a, b) => a.id - b.id);
  console.log(`Enriching ${movies.length} movies from TMDB…`);

  let updated = 0;
  let matched = 0;
  let failed = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    try {
      let details = movie.tmdbId
        ? await getTmdbMovieDetails(movie.tmdbId)
        : null;

      if (!details) {
        details = await findBestTmdbMatch(movie.title);
      }

      if (!details) {
        failed++;
      } else {
        matched++;
        await updateMovie(movie.id, {
          // Keep sheet title + spoken language; replace genre/metadata from TMDB
          ...tmdbDetailsToMoviePatch(details),
          genres: details.genres || movie.genres,
          posterPath: details.posterPath ?? movie.posterPath,
          backdropPath: details.backdropPath ?? movie.backdropPath,
          overview: details.overview || movie.overview,
        });
        updated++;
      }
    } catch (err) {
      failed++;
      console.warn(`TMDB error for "${movie.title}":`, (err as Error).message);
    }

    await sleep(50);

    if ((i + 1) % 25 === 0 || i === movies.length - 1) {
      console.log(`Enriched ${i + 1}/${movies.length}…`);
    }
  }

  console.log(
    `Done. Updated ${updated}. Matched ${matched}, unmatched/errors ${failed}.`
  );
}

async function fullSeed() {
  await ensureMovieIndexes();
  const rows = loadSheetRows();
  console.log(`Parsed ${rows.length} movies from sheet.html`);

  const resolved = resolveSheetDates(
    rows.map((r) => ({ title: r.title, date: r.date }))
  );
  const unresolved = resolved
    .map((r, i) => ({ r, row: rows[i] }))
    .filter(({ r }) => r.unresolved);

  const inferredCount = resolved.filter((r) => r.inferred).length;
  console.log(
    `Date resolve: ${inferredCount} inferred/repaired, ${unresolved.length} unresolved`
  );
  if (unresolved.length) {
    console.log("Unresolved titles:");
    for (const { row } of unresolved) {
      console.log(`  - ${row.title} (${row.date})`);
    }
  }

  const useTmdb = hasTmdbKey();
  if (!useTmdb) {
    console.warn(
      "TMDB_API_KEY not set — seeding without posters/overviews. Add it to .env.local and re-run."
    );
  }

  await clearMovies();

  const snapshot: Array<Record<string, unknown>> = [];
  let matched = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dateInfo = resolved[i];
    // Fallback to plain parse if somehow missing
    const fallback = parseWatchedDate(row.date);
    const watchedAt = dateInfo.watchedAt ?? fallback.watchedAt;
    const watchedRaw = dateInfo.watchedRaw || fallback.watchedRaw;
    const sheetGenres = normalizeGenres(row.genre);

    let posterPath: string | null = null;
    let backdropPath: string | null = null;
    let overview: string | null = null;
    let tagline: string | null = null;
    let director: string | null = null;
    let castJson: string | null = null;
    let trailerKey: string | null = null;
    let tmdbId: number | null = null;
    let releaseYear: number | null = null;
    let runtime: number | null = null;
    let voteAverage: number | null = null;
    let genres = sheetGenres;

    if (useTmdb) {
      try {
        const match = await findBestTmdbMatch(row.title);
        if (match) {
          const patch = tmdbDetailsToMoviePatch(match);
          posterPath = patch.posterPath;
          backdropPath = patch.backdropPath;
          overview = patch.overview;
          tagline = patch.tagline;
          director = patch.director;
          castJson = patch.castJson;
          trailerKey = patch.trailerKey;
          tmdbId = patch.tmdbId;
          releaseYear = patch.releaseYear;
          runtime = patch.runtime;
          voteAverage = patch.voteAverage;
          if (match.genres) genres = match.genres;
          matched++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        console.warn(`TMDB error for "${row.title}":`, (err as Error).message);
      }
      await sleep(50);
    }

    const movie = await createMovie({
      title: row.title,
      watchedAt,
      watchedRaw,
      language: row.language,
      genres,
      posterPath,
      backdropPath,
      overview,
      tagline,
      director,
      castJson,
      trailerKey,
      tmdbId,
      releaseYear,
      runtime,
      voteAverage,
    });

    snapshot.push(movie);

    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      console.log(`Seeded ${i + 1}/${rows.length}…`);
    }
  }

  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  console.log(
    `Done. ${await countMovies()} movies in DB.` +
      (useTmdb ? ` TMDB matched: ${matched}, unmatched: ${failed}.` : "")
  );
  console.log(`Snapshot written to ${SNAPSHOT_PATH}`);
}

async function main() {
  if (process.argv.includes("--dates-only")) {
    await fixDatesOnly();
    return;
  }
  if (process.argv.includes("--enrich")) {
    await enrichFromTmdb();
    return;
  }
  await fullSeed();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
