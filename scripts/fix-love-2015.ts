import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find(
    (m) => m.title.trim().toLowerCase() === "love" || m.id === 1116
  );
  if (!movie) {
    console.error("No Love row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Love", 15, { year: 2015 });
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) => /^love$/i.test(r.title) && r.releaseYear === 2015
    ) || results.find((r) => /^love$/i.test(r.title));

  const tmdbId = hit?.id ?? 249070; // Gaspar Noé Love (2015)
  const details = await getTmdbMovieDetails(tmdbId);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Love",
    language: details.language || movie.language || "English",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Love · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
