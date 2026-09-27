import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  getDb();
  const movie = listMovies().find((m) => /kurukshetra/i.test(m.title));
  if (!movie) {
    console.error("No Kurukshetra row found");
    process.exit(1);
  }

  // Kannada epic Kurukshetra (2019)
  const details = await getTmdbMovieDetails(620082);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Kurukshetra",
    // Keep sheet language (Hindi dub); metadata from 2019 film
    language: movie.language || "Hindi",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> ${details.title} (${details.releaseYear}) · ${details.director} · ${details.language}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
