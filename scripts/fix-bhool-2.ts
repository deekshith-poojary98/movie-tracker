import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) =>
    /bhool\s*bhulaiyaa?\s*2/i.test(m.title)
  );
  if (!movie) {
    console.error("No Bhool Bhulaiyaa 2 row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Bhool Bhulaiyaa 2", 5);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );
  const hit =
    results.find(
      (r) => /bhool\s*bhulaiyaa\s*2/i.test(r.title) && r.releaseYear === 2022
    ) ||
    results.find((r) => /bhool\s*bhulaiyaa\s*2/i.test(r.title)) ||
    results[0];

  const details = hit
    ? (await getTmdbMovieDetails(hit.id)) || hit
    : null;

  if (!details) {
    updateMovie(movie.id, {
      title: "Bhool Bhulaiyaa 2 (भूल भुलैया 2)",
      language: "Hindi",
    });
    console.log("Renamed only");
    return;
  }

  updateMovie(movie.id, {
    title: "Bhool Bhulaiyaa 2 (भूल भुलैया 2)",
    language: "Hindi",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Bhool Bhulaiyaa 2 (भूल भुलैया 2) · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
