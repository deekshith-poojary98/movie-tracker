import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) =>
    /dr+i?shayam|ദൃശ്യം/i.test(m.title)
  );
  if (!movie) {
    console.error("No Drishyam row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Drishyam", 10);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  // Prefer Malayalam 2013 original
  const hit =
    results.find(
      (r) =>
        /^drishyam$/i.test(r.title) &&
        r.language === "Malayalam" &&
        r.releaseYear === 2013
    ) ||
    results.find(
      (r) => /^drishyam$/i.test(r.title) && r.language === "Malayalam"
    ) ||
    results.find((r) => /^drishyam$/i.test(r.title) && r.releaseYear === 2013);

  const tmdbId = hit?.id ?? 226143;
  const details = await getTmdbMovieDetails(tmdbId);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Drishyam (ദൃശ്യം)",
    language: "Malayalam",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Drishyam (ദൃശ്യം) · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
