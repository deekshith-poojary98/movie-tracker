import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) => /irumbu\s*thirai/i.test(m.title));
  if (!movie) {
    console.error("No Irumbu Thirai row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Irumbu Thirai", 8);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) => /irumbu\s*thirai/i.test(r.title) && r.releaseYear === 2018
    ) || results.find((r) => /irumbu\s*thirai/i.test(r.title));

  const tmdbId = hit?.id;
  if (!tmdbId) {
    console.error("No TMDB match");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(tmdbId);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Irumbu Thirai",
    language: "Tamil",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Irumbu Thirai · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
