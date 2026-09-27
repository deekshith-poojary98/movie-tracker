import { config } from "dotenv";
config({ path: ".env.local" });

import { listMovies, updateMovie } from "../src/lib/db";

const TMDB_ID = 1774572;

async function main() {
  const movie = listMovies().find((m) => m.id === 1245 || /pattis\s*gang/i.test(m.title));
  if (!movie) {
    console.error("No Pattis Gang row");
    process.exit(1);
  }

  const key = process.env.TMDB_API_KEY!;
  let posterPath: string | null = null;
  let trailerKey: string | null = null;
  try {
    const imgRes = await fetch(
      `https://api.themoviedb.org/3/movie/${TMDB_ID}/images?api_key=${key}`
    );
    if (imgRes.ok) {
      const imgs = (await imgRes.json()) as {
        posters?: { file_path: string }[];
      };
      posterPath = imgs.posters?.[0]?.file_path || null;
    }
    const vidRes = await fetch(
      `https://api.themoviedb.org/3/movie/${TMDB_ID}/videos?api_key=${key}`
    );
    if (vidRes.ok) {
      const vids = (await vidRes.json()) as {
        results?: { site: string; type: string; key: string; official?: boolean }[];
      };
      const yt = (vids.results || []).filter((v) => v.site === "YouTube" && v.key);
      const trailer =
        yt.find((v) => v.type === "Trailer") || yt[0];
      trailerKey = trailer?.key || null;
    }
  } catch {
    // optional
  }

  const cast = [
    { name: "Vismaya Vinayak", character: "", profilePath: null },
    { name: "Aravind Bolar", character: "", profilePath: null },
    { name: "Ajay Raj", character: "Ajay Raj", profilePath: null },
    { name: "Vijayakumar Kodialbail", character: "", profilePath: null },
    { name: "Lion Kishore D. Shetty", character: "", profilePath: null },
    { name: "Shabareesh Kabbinale", character: "", profilePath: null },
  ];

  updateMovie(movie.id, {
    title: "Pattis Gang",
    language: "Tulu",
    genres: "Comedy, Drama",
    tmdbId: TMDB_ID,
    releaseYear: 2018,
    runtime: 2,
    director: "Sooraj Bolar",
    overview:
      "The story revolves around three Men namely Guru, Jolly and Dr.Ajay, who con people by creating fake schemes and Business prepositions to trap people and runaway with their money. But, one day they come across a girl named Samanvitha and they all become friends with her and plan to trap her Office Boss with a scheme, which spoils their relationship with Samanvitha. The three plan for a final Con and escape from the city, but are kidnapped by a Don named PK. Will the Three able to escape from the trap and succeed in their final Con. The film is a thriller and joy ride.",
    castJson: JSON.stringify(cast),
    posterPath,
    trailerKey,
  });

  console.log(`Updated #${movie.id} · poster=${posterPath} · trailer=${trailerKey}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
