import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) =>
    /^the\s+blue\s+lagoon$|^blue\s+lagoon$/i.test(m.title.trim())
  );
  if (!movie) {
    console.error("No Blue Lagoon row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("The Blue Lagoon", 8);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) => /^the\s+blue\s+lagoon$/i.test(r.title) && r.releaseYear === 1980
    ) ||
    results.find((r) => /^the\s+blue\s+lagoon$/i.test(r.title)) ||
    results[0];

  if (!hit) {
    updateMovie(movie.id, { title: "The Blue Lagoon" });
    console.log("Renamed only");
    return;
  }

  const details = (await getTmdbMovieDetails(hit.id)) || hit;
  updateMovie(movie.id, {
    title: "The Blue Lagoon",
    language: details.language || movie.language || "English",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> The Blue Lagoon · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
