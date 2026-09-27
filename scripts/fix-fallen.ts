import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find(
    (m) => /^fallen$/i.test(m.title.trim()) || (m.title.toLowerCase().includes("fallen") && !/angels|empire|dark/i.test(m.title))
  );
  // Prefer exact title match
  const exact = listMovies().find((m) => /^fallen$/i.test(m.title.trim()));
  const target = exact || movie;
  if (!target) {
    console.error("No Fallen row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Fallen", 10);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) => /^fallen$/i.test(r.title) && r.releaseYear === 2016
    ) ||
    results.find((r) => /fallen/i.test(r.title) && r.releaseYear === 2016);

  const tmdbId = hit?.id ?? 341013; // Fallen (2016) Lauren Cohan
  const details = await getTmdbMovieDetails(tmdbId);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(target.id, {
    title: "Fallen",
    language: details.language || target.language || "English",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || target.genres,
  });

  console.log(
    `Updated #${target.id} -> Fallen · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
