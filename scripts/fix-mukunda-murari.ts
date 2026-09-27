import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

/** Sheet typo "Mukkunda Murari" → Mukunda Murari (2016 Kannada), TMDB 468329 */
const TMDB_ID = 468329;

async function main() {
  getDb();
  const movie = listMovies().find((m) => /mukk?unda\s*murari/i.test(m.title));
  if (!movie) {
    console.error("No Mukunda Murari row found");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(TMDB_ID);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Mukunda Murari",
    language: "Kannada",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> ${details.title} (${details.releaseYear}) · ${details.director} · tmdb ${TMDB_ID}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
