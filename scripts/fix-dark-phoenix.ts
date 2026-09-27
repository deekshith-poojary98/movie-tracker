import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) =>
    /dark\s*phoenix|x-?men.*phoenix/i.test(m.title)
  );
  if (!movie) {
    console.error("No Dark Phoenix row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Dark Phoenix", 8);
  console.log(
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );

  const hit =
    results.find(
      (r) =>
        (/^dark\s*phoenix$/i.test(r.title) || /x-men.*dark\s*phoenix/i.test(r.title)) &&
        r.releaseYear === 2019
    ) ||
    results.find((r) => /dark\s*phoenix/i.test(r.title) && r.releaseYear === 2019);

  const tmdbId = hit?.id ?? 320288;
  const details = await getTmdbMovieDetails(tmdbId);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Dark Phoenix",
    language: details.language || "English",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Dark Phoenix · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
