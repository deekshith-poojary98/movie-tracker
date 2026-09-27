import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, listMovies, updateMovie } from "../src/lib/db";
import {
  findBestTmdbMatch,
  sleep,
  tmdbDetailsToMoviePatch,
} from "../src/lib/tmdb";

async function main() {
  getDb();
  const movies = listMovies();

  const simple = movies.filter(
    (m) => /simple\s*a+g/i.test(m.title) && /love\s*story/i.test(m.title)
  );
  const taken = movies.filter((m) => /^taken$/i.test(m.title.trim()));

  console.log(
    "simple hits:",
    simple.map((m) => ({ id: m.id, title: m.title }))
  );
  console.log(
    "taken hits:",
    taken.map((m) => ({
      id: m.id,
      title: m.title,
      watchedAt: m.watchedAt,
      watchedRaw: m.watchedRaw,
    }))
  );

  for (const movie of simple) {
    const to = "Simple Agi Ondh Love Story";
    console.log(`Renaming "${movie.title}" -> "${to}"`);
    const details = await findBestTmdbMatch(to);
    if (details) {
      console.log(`  TMDB: ${details.title} (${details.releaseYear})`);
      updateMovie(movie.id, {
        title: to,
        ...tmdbDetailsToMoviePatch(details),
        genres: details.genres || movie.genres,
      });
    } else {
      // try alternate spellings
      for (const q of [
        "Simple Aag Ond Love Story",
        "Simple Agi Ondh Love Story",
        "Simple Aag Onth Love Story",
      ]) {
        const d = await findBestTmdbMatch(q);
        if (d) {
          console.log(`  TMDB via "${q}": ${d.title} (${d.releaseYear})`);
          updateMovie(movie.id, {
            title: to,
            ...tmdbDetailsToMoviePatch(d),
            genres: d.genres || movie.genres,
          });
          break;
        }
        await sleep(60);
      }
      const still = listMovies().find((m) => m.id === movie.id);
      if (!still?.tmdbId || still.title !== to) {
        console.log("  TMDB: no match, title only");
        updateMovie(movie.id, { title: to });
      }
    }
    await sleep(80);
  }

  for (const movie of taken) {
    console.log(
      `Updating Taken #${movie.id}: ${movie.watchedAt} -> 2024-08-20`
    );
    updateMovie(movie.id, {
      watchedAt: "2024-08-20",
      watchedRaw: "20/8/2024",
    });
  }

  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
