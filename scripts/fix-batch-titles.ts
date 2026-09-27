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
  search: string;
  year: number;
  tmdbId?: number;
};

const FIXES: Fix[] = [
  {
    match: /what\s+women\s+wants?/i,
    title: "What Women Want",
    search: "What Women Want",
    year: 2000,
  },
  {
    match: /^(the\s+)?last\s+song$/i,
    title: "The Last Song",
    search: "The Last Song",
    year: 2010,
  },
  {
    match: /huntsman.*winter/i,
    title: "The Huntsman: Winter's War",
    search: "The Huntsman Winter's War",
    year: 2016,
  },
  {
    match: /tom+or+ow\s*land/i,
    title: "Tomorrowland",
    search: "Tomorrowland",
    year: 2015,
  },
];

async function resolve(fix: Fix) {
  const results = await searchTmdbMovies(fix.search, 8);
  console.log(
    fix.search,
    results.map((r) => `${r.id} ${r.title} (${r.releaseYear})`)
  );
  const hit =
    results.find(
      (r) =>
        r.title.toLowerCase().replace(/[:']/g, "") ===
          fix.title.toLowerCase().replace(/[:']/g, "") &&
        r.releaseYear === fix.year
    ) ||
    results.find(
      (r) =>
        r.title.toLowerCase().includes(fix.search.toLowerCase().slice(0, 10)) &&
        r.releaseYear === fix.year
    ) ||
    results.find((r) => r.releaseYear === fix.year) ||
    results[0];
  if (!hit && fix.tmdbId) {
    return getTmdbMovieDetails(fix.tmdbId);
  }
  if (!hit) return null;
  return (await getTmdbMovieDetails(hit.id)) || hit;
}

async function main() {
  for (const fix of FIXES) {
    const movie = listMovies().find((m) => fix.match.test(m.title.trim()));
    if (!movie) {
      console.error("Missing:", fix.title);
      continue;
    }
    try {
      const details = await resolve(fix);
      if (!details) {
        updateMovie(movie.id, {
          title: fix.title,
          language: movie.language || "English",
          releaseYear: fix.year,
        });
        console.log(`Renamed #${movie.id} only -> ${fix.title}`);
        continue;
      }
      updateMovie(movie.id, {
        title: fix.title,
        language: details.language || movie.language || "English",
        ...tmdbDetailsToMoviePatch(details),
        genres: details.genres || movie.genres,
      });
      console.log(
        `Updated #${movie.id} -> ${fix.title} · TMDB ${details.id} (${details.releaseYear}) · ${details.director}`
      );
    } catch (e) {
      console.error(fix.title, e);
      updateMovie(movie.id, {
        title: fix.title,
        language: movie.language || "English",
        releaseYear: fix.year,
      });
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
