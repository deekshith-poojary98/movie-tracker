import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) => /^masterpiece$/i.test(m.title.trim()));
  if (!movie) {
    console.error("No Masterpiece row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Masterpiece", 12);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) =>
        /^masterpiece$/i.test(r.title) &&
        r.language === "Kannada" &&
        r.releaseYear === 2015
    ) ||
    results.find(
      (r) => /^masterpiece$/i.test(r.title) && r.language === "Kannada"
    ) ||
    results.find(
      (r) => /masterpiece/i.test(r.title) && r.releaseYear === 2015 && r.language === "Kannada"
    );

  if (!hit) {
    console.error("No Kannada 2015 Masterpiece on TMDB search");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(hit.id);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Masterpiece",
    language: "Kannada",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Masterpiece · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
