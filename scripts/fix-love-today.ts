import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) => /^love\s*today$/i.test(m.title.trim()));
  if (!movie) {
    console.error("No Love Today row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Love Today", 8);
  console.log(results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`));

  const hit =
    results.find(
      (r) =>
        /^love\s*today$/i.test(r.title) &&
        (r.language === "Tamil" || r.releaseYear === 2022)
    ) ||
    results.find((r) => /^love\s*today$/i.test(r.title)) ||
    results[0];

  if (!hit) {
    updateMovie(movie.id, {
      title: "Love Today (லவ் டுடே)",
      language: movie.language || "Tamil",
    });
    console.log("Renamed only");
    return;
  }

  const details = (await getTmdbMovieDetails(hit.id)) || hit;
  updateMovie(movie.id, {
    title: "Love Today (லவ் டுடே)",
    language: "Tamil",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Love Today (லவ் டுடே) · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
