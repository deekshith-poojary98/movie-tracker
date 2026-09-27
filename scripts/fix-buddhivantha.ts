import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

const TMDB_ID = 760924;

async function main() {
  getDb();
  const movie = listMovies().find((m) => /bh?ud+h?ivantha/i.test(m.title));
  if (!movie) {
    console.error("No Buddhivantha row found");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(TMDB_ID);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Buddhivantha",
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
