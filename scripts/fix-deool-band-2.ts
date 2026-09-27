import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

/** Sheet title was literally "2"; TMDB match is Deool Band 2 (1699574). */
const MOVIE_ID = 1428;
const TMDB_ID = 1699574;

async function main() {
  getDb();
  const details = await getTmdbMovieDetails(TMDB_ID);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(MOVIE_ID, {
    title: details.title,
    language: "Marathi",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || "Comedy, Drama",
  });

  console.log(
    `Updated #${MOVIE_ID} -> ${details.title} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
