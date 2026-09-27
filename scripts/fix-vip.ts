import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import {
  getTmdbMovieDetails,
  searchTmdbMovies,
  tmdbDetailsToMoviePatch,
} from "../src/lib/tmdb";

async function main() {
  const movie = listMovies().find((m) =>
    /velai+illa\s*patta+dh?ari/i.test(m.title)
  );
  if (!movie) {
    console.error("No Velaiilla Pattadhari row found");
    process.exit(1);
  }

  const results = await searchTmdbMovies("Velaiyilla Pattathari", 8);
  console.log(
    "search:",
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear})`)
  );

  // Prefer exact-ish title match; fall back to existing tmdb if still valid
  const hit =
    results.find((r) => /velaiyilla\s*pattathari/i.test(r.title)) ||
    results.find((r) => /velaiilla\s*pattadhari/i.test(r.title) && !/2|vip\s*2/i.test(r.title)) ||
    results[0];

  const tmdbId = hit?.id ?? movie.tmdbId;
  if (!tmdbId) {
    updateMovie(movie.id, {
      title: "Velaiyilla Pattathari",
      language: "Tamil",
    });
    console.log(`Renamed #${movie.id} (no TMDB)`);
    return;
  }

  const details = (await getTmdbMovieDetails(tmdbId)) || hit!;
  updateMovie(movie.id, {
    title: "Velaiyilla Pattathari",
    language: "Tamil",
    ...tmdbDetailsToMoviePatch(details),
    genres: details.genres || movie.genres,
  });

  console.log(
    `Updated #${movie.id} -> Velaiyilla Pattathari · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
