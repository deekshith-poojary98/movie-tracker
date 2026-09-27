import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) => /blithe\s*spirit/i.test(m.title));
  if (!movie) {
    console.error("No Blithe Spirit row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Blithe Spirit", 8);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) => /^blithe\s*spirit$/i.test(r.title) && r.releaseYear === 2020
    ) ||
    results.find((r) => /blithe/i.test(r.title) && r.releaseYear === 2020);

  const tmdbId = hit?.id ?? 582031; // known 2020 remake id fallback
  const details = await getTmdbMovieDetails(tmdbId);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Blithe Spirit",
    language: details.language || "English",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Blithe Spirit · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
