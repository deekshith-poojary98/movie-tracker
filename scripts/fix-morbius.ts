import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) => /mobi+rus|morbius/i.test(m.title));
  if (!movie) {
    console.error("No Morbius/Mobirus row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Morbius", 5);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) => /^morbius$/i.test(r.title) && r.releaseYear === 2022
    ) || results.find((r) => /^morbius$/i.test(r.title));

  const tmdbId = hit?.id ?? 526896;
  const details = await getTmdbMovieDetails(tmdbId);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Morbius",
    language: details.language || "English",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Morbius · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
