import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { getTmdbMovieDetails } from "../src/lib/tmdb";

async function main() {
  const details = await getTmdbMovieDetails(1774572);
  writeFileSync(
    "/tmp/pattis-tmdb.json",
    JSON.stringify(details, null, 2),
    "utf8"
  );
  console.log("wrote /tmp/pattis-tmdb.json");
  console.log({
    title: details?.title,
    releaseYear: details?.releaseYear,
    director: details?.director,
    posterPath: details?.posterPath,
    genres: details?.genres,
    runtime: details?.runtime,
    trailerKey: details?.trailerKey,
    cast: details?.cast?.length,
  });
}

main();
