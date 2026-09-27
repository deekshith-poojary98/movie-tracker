import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

/** Kannada 1993 Upendra film — not the English Shhh (504573). */
const TMDB_ID = 331456;

async function main() {
  getDb();
  const movie = listMovies().find((m) => /^shh+/i.test(m.title.trim()));
  if (!movie) {
    console.error("No Shhh row found");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(TMDB_ID);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Shhh!",
    language: "Kannada",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || "Horror, Drama",
  });

  console.log(
    `Updated #${movie.id} -> ${details.title} (${details.releaseYear}) · ${details.director} · tmdb ${TMDB_ID}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
