import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import { findBestTmdbMatch, sleep } from "../src/lib/tmdb";

getDb();

const renames: { match: (t: string) => boolean; to: string }[] = [
  {
    match: (t) => /rab\s*ne\s*banadi\s*jodi/i.test(t),
    to: "Rab Ne Bana Di Jodi",
  },
  {
    match: (t) => /sonu\s*ke\s*tit+u\s*ki\s*sweety/i.test(t),
    to: "Sonu Ke Titu Ki Sweety",
  },
  {
    match: (t) => /bho+t+h?\s*bangla/i.test(t),
    to: "Bhooth Bangla",
  },
];

async function main() {
  const movies = listMovies();

  for (const rule of renames) {
    const hits = movies.filter((m) => rule.match(m.title));
    if (!hits.length) {
      console.log(`No DB row matched for -> ${rule.to}`);
      continue;
    }
    for (const movie of hits) {
      console.log(`Renaming "${movie.title}" -> "${rule.to}"`);
      const details = await findBestTmdbMatch(rule.to);
      if (!details) {
        console.log("  TMDB: no match");
        updateMovie(movie.id, { title: rule.to });
      } else {
        console.log(
          `  TMDB: ${details.title} (${details.releaseYear}) · ${details.genres}`
        );
        updateMovie(movie.id, {
          title: rule.to,
          genres: details.genres || movie.genres,
          posterPath: details.posterPath ?? movie.posterPath,
          backdropPath: details.backdropPath ?? movie.backdropPath,
          overview: details.overview || movie.overview,
          tmdbId: details.id,
          releaseYear: details.releaseYear ?? movie.releaseYear,
          runtime: details.runtime ?? movie.runtime,
          voteAverage: details.voteAverage ?? movie.voteAverage,
        });
      }
      await sleep(80);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
