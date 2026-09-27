import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

/** Sheet: Hindi + Animation → Mahavatar Narsimha (2025), not 1989 Kannada. */
const TMDB_ID = 1383072;

async function main() {
  getDb();
  const movie = listMovies().find((m) => /narasimha/i.test(m.title));
  if (!movie) {
    console.error("No Narasimha row found");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(TMDB_ID);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Mahavatar Narsimha",
    language: "Hindi",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || "Animation",
  });

  console.log(
    `Updated #${movie.id} -> ${details.title} (${details.releaseYear}) · ${details.director} · tmdb ${TMDB_ID}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
