import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

const MOVIE_ID = 1428;
const TMDB_ID = 936622;

async function main() {
  getDb();
  const details = await getTmdbMovieDetails(TMDB_ID);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(MOVIE_ID, {
    title: details.title,
    language: "Hindi",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || "Sci-fi, Action",
  });

  console.log(
    `Updated #${MOVIE_ID} -> ${details.title} (${details.releaseYear}) · ${details.director} · tmdb ${TMDB_ID}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
