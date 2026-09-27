import { config } from "dotenv";
config({ path: ".env.local" });
import { writeFileSync } from "fs";

const key = process.env.TMDB_API_KEY!;
const url = `https://api.themoviedb.org/3/movie/1774572?api_key=${key}&append_to_response=credits,videos`;

async function main() {
  const res = await fetch(url);
  const text = await res.text();
  writeFileSync("/tmp/pattis-raw.json", text, "utf8");
  console.log("status", res.status, "bytes", text.length);
  const d = JSON.parse(text);
  console.log({
    title: d.title,
    release_date: d.release_date,
    poster_path: d.poster_path,
    genres: d.genres,
    runtime: d.runtime,
    original_language: d.original_language,
    crew: (d.credits?.crew || []).filter((c: { job: string }) => c.job === "Director"),
    castCount: d.credits?.cast?.length,
    videos: d.videos?.results?.length,
    overview: (d.overview || "").slice(0, 80),
  });
}

main();
