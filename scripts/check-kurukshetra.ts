import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies } from "../src/lib/db";

const key = process.env.TMDB_API_KEY!;

async function search(q: string, year?: string) {
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", q);
  if (year) url.searchParams.set("primary_release_year", year);
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url.toString());
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
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return [];
}

async function main() {
  getDb();
  const hits = listMovies().filter((m) => /kurukshetra/i.test(m.title));
  console.log(
    "DB:",
    hits.map((m) => ({
      id: m.id,
      title: m.title,
      tmdbId: m.tmdbId,
      lang: m.language,
      watched: m.watchedAt,
      genres: m.genres,
      director: m.director,
      year: m.releaseYear,
    }))
  );

  console.log("search:", await search("Kurukshetra"));
  console.log("2019:", await search("Kurukshetra", "2019"));
  console.log("2025:", await search("Kurukshetra", "2025"));
}

main().catch(console.error);
