import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

const key = process.env.TMDB_API_KEY!;

async function search(q: string, year?: string) {
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", q);
  url.searchParams.set("include_adult", "false");
  if (year) url.searchParams.set("primary_release_year", year);
  const res = await fetch(url);
  const data = await res.json();
  return ((data.results || []) as Array<Record<string, unknown>>)
    .slice(0, 12)
    .map((m) => ({
      id: m.id as number,
      title: m.title as string,
      original: m.original_title as string,
      year: String(m.release_date || "").slice(0, 4),
      lang: m.original_language as string,
    }));
}

async function main() {
  console.log("Dragon:", await search("Dragon"));
  console.log("Dragon 2025:", await search("Dragon", "2025"));
  console.log("---");

  getDb();
  const hits = listMovies().filter(
    (m) =>
      m.title.trim().toLowerCase() === "dragon" ||
      m.title.trim().toLowerCase() === "dragon."
  );
  console.log(
    "DB hits:",
    hits.map((m) => ({
      id: m.id,
      title: m.title,
      tmdbId: m.tmdbId,
      lang: m.language,
      watched: m.watchedAt,
    }))
  );

  // Prefer Tamil original language
  const candidates = [
    ...(await search("Dragon", "2025")),
    ...(await search("Dragon")),
  ];
  const tamil = candidates.find((c) => c.lang === "ta");
  console.log("Tamil pick:", tamil);

  if (!tamil) {
    console.error("Could not find Tamil Dragon on TMDB");
    process.exit(1);
  }

  const details = await getTmdbMovieDetails(tamil.id);
  if (!details) {
    console.error("No details");
    process.exit(1);
  }
  console.log("Details:", {
    title: details.title,
    lang: details.language,
    year: details.releaseYear,
    director: details.director,
  });

  for (const movie of hits) {
    updateMovie(movie.id, {
      title: details.title || "Dragon",
      language: "Tamil",
      ...tmdbDetailsToMoviePatch(details),
      genres: details.genres || movie.genres,
    });
    console.log(`Updated movie #${movie.id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
