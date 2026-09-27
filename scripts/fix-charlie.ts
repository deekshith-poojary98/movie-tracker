import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find(
    (m) =>
      /^charlie$/i.test(m.title.trim()) ||
      (/charlie/i.test(m.title) && m.language === "Malayalam")
  );
  if (!movie) {
    console.error("No Charlie row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Charlie", 12, { year: 2015 });
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  let hit =
    results.find(
      (r) =>
        /^charlie$/i.test(r.title) &&
        r.language === "Malayalam" &&
        r.releaseYear === 2015
    ) ||
    results.find((r) => r.language === "Malayalam" && /^charlie$/i.test(r.title));

  if (!hit) {
    const all = await searchTmdbMovies("Charlie", 15);
    hit =
      all.find(
        (r) =>
          r.language === "Malayalam" &&
          /^charlie$/i.test(r.title) &&
          r.releaseYear === 2015
      ) ||
      all.find((r) => r.language === "Malayalam" && /charlie/i.test(r.title));
    console.log(
      "fallback:",
      all
        .filter((r) => r.language === "Malayalam")
        .map((r) => `${r.id} ${r.title} (${r.releaseYear})`)
    );
  }

  // Known TMDB id for Charlie (2015, Malayalam) if search fails
  const TMDB_ID = hit?.id ?? 370565;
  const details = await getTmdbMovieDetails(TMDB_ID);
  if (!details) {
    console.error("TMDB details failed for", TMDB_ID);
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Charlie (ചാർലി)",
    language: "Malayalam",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Charlie (ചാർലി) · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
