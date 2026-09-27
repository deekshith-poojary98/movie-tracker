import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";
import { getTmdbMovieDetails, searchTmdbMovies, tmdbDetailsToMoviePatch } from "../src/lib/tmdb";

async function enrich(tmdbId: number) {
  try {
    return await getTmdbMovieDetails(tmdbId);
  } catch {
    return null;
  }
}

async function main() {
  const mitchells = listMovies().find((m) => /mitchells/i.test(m.title));
  if (mitchells) {
    const details = await enrich(mitchells.tmdbId || 501929);
    updateMovie(mitchells.id, {
      title: "The Mitchells vs. the Machines",
      language: "English",
      ...(details ? tmdbDetailsToMoviePatch(details) : { tmdbId: 501929 }),
      genres: details?.genres || mitchells.genres,
    });
    console.log(`Mitchells #${mitchells.id} ok`);
  }

  const gods = listMovies().find((m) =>
    /gods?\s+must\s+be\s+crazy/i.test(m.title)
  );
  if (!gods) {
    console.error("Gods not found");
    process.exit(1);
  }

  let tmdbId = 11825;
  try {
    const results = await searchTmdbMovies("The Gods Must Be Crazy", 10);
    console.log(
      results.map((r) => `${r.id} ${r.title} (${r.releaseYear})`)
    );
    const hit =
      results.find(
        (r) =>
          /^the\s+gods\s+must\s+be\s+crazy$/i.test(r.title) &&
          (r.releaseYear === 1980 || r.releaseYear === 1984)
      ) ||
      results.find((r) => /^the\s+gods\s+must\s+be\s+crazy$/i.test(r.title));
    if (hit) tmdbId = hit.id;
  } catch (e) {
    console.log("search failed, using", tmdbId);
  }

  const details = await enrich(tmdbId);
  updateMovie(gods.id, {
    title: "The Gods Must Be Crazy",
    language: "English",
    ...(details
      ? tmdbDetailsToMoviePatch(details)
      : { tmdbId, releaseYear: 1980 }),
    genres: details?.genres || gods.genres,
  });
  console.log(
    `Gods #${gods.id} -> tmdb ${tmdbId} year=${details?.releaseYear ?? 1980}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
