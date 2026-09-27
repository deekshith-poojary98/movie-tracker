import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import {
  getTmdbMovieDetails,
  searchTmdbMovies,
  tmdbDetailsToMoviePatch,
} from "../src/lib/tmdb";

type Fix = {
  match: RegExp;
  title: string;
  language: string;
  search: string;
  year?: number;
  tmdbId?: number;
};

const FIXES: Fix[] = [
  {
    match: /teri\s+bat+on+s?\s+mein\s+aisa\s+uljha?\s+jiya|teri\s+batton|ulja\s+diya/i,
    title: "Teri Baaton Mein Aisa Uljha Jiya (तेरी बातों में ऐसा उलझा जिया)",
    language: "Hindi",
    search: "Teri Baaton Mein Aisa Uljha Jiya",
    year: 2024,
    tmdbId: 1110390,
  },
  {
    match: /sath?yaprem\s+ki\s+katha/i,
    title: "Satyaprem Ki Katha (सत्यप्रेम की कथा)",
    language: "Hindi",
    search: "Satyaprem Ki Katha",
    year: 2023,
  },
  {
    match: /^malaal$/i,
    title: "Malaal (मलाल)",
    language: "Hindi",
    search: "Malaal",
    year: 2019,
  },
];

async function resolveDetails(fix: Fix) {
  if (fix.tmdbId) {
    const details = await getTmdbMovieDetails(fix.tmdbId);
    if (details) return details;
  }
  const results = await searchTmdbMovies(fix.search, 8, {
    year: fix.year,
  });
  console.log(
    fix.search,
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear}) [${r.language}]`)
  );
  const hit =
    results.find(
      (r) =>
        r.title.toLowerCase().includes(fix.search.toLowerCase().slice(0, 12)) &&
        (!fix.year || r.releaseYear === fix.year)
    ) ||
    results.find((r) => r.language === "Hindi") ||
    results[0];
  if (!hit) return null;
  return (await getTmdbMovieDetails(hit.id)) || hit;
}

async function main() {
  for (const fix of FIXES) {
    const movie = listMovies().find((m) => fix.match.test(m.title));
    if (!movie) {
      console.error("Missing:", fix.title);
      continue;
    }
    const details = await resolveDetails(fix);
    if (!details) {
      updateMovie(movie.id, {
        title: fix.title,
        language: fix.language,
      });
      console.log(`Renamed #${movie.id} only -> ${fix.title}`);
      continue;
    }
    updateMovie(movie.id, {
      title: fix.title,
      language: fix.language,
      ...tmdbDetailsToMoviePatch(details),
      genres: details.genres || movie.genres,
    });
    console.log(
      `Updated #${movie.id} -> ${fix.title} · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
