import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) => /laapataa?\s*ladies/i.test(m.title));
  if (!movie) {
    console.error("No Laapata Ladies row found");
    process.exit(1);
  }

  for (const q of ["Laapataa Ladies", "Laapata Ladies", "Lost Ladies"]) {
    const results = await searchTmdbMovies(q, 5);
    console.log(
      q,
      results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
    );
  }

  // TMDB lists it as Lost Ladies; original title Laapataa Ladies
  const details = await getTmdbMovieDetails(1163194);
  if (!details) {
    console.error("TMDB details failed");
    process.exit(1);
  }

  updateMovie(movie.id, {
    title: "Laapataa Ladies",
    language: "Hindi",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Laapataa Ladies · TMDB ${details.id} (${details.releaseYear}) · ${details.director} · orig search title was ${details.title}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
