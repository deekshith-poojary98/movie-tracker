import { config } from "dotenv";
config({ path: ".env.local" });

import { createMovie, deleteMovie, getDb, listMovies } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  getDb();
  const hits = listMovies().filter((m) => /kurukshetra/i.test(m.title));
  const existing = hits[0];
  if (!existing) {
    console.error("No Kurukshetra found");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(1552485);
  if (!details) {
    console.error("TMDB details failed for 1945 Kurukshetra");
    process.exit(1);
  }

  for (const m of hits) {
    deleteMovie(m.id);
    console.log(`Deleted #${m.id}`);
  }

  const created = createMovie({
    title: "Kurukshetra",
    watchedAt: existing.watchedAt,
    watchedRaw: existing.watchedRaw,
    language: "Hindi",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || existing.genres,
  });

  console.log("Created:", {
    id: created.id,
    title: created.title,
    tmdbId: created.tmdbId,
    year: created.releaseYear,
    director: created.director,
    lang: created.language,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
