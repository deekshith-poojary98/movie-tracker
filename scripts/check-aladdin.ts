import { config } from "dotenv";
config({ path: ".env.local" });

async function search(q: string, year?: string) {
  const key = process.env.TMDB_API_KEY!;
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", q);
  if (year) url.searchParams.set("primary_release_year", year);
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url.toString());
      const data = await res.json();
      return ((data.results || []) as Array<Record<string, unknown>>)
        .slice(0, 8)
        .map((m) => ({
          id: m.id,
          title: m.title,
          year: String(m.release_date || "").slice(0, 4),
          lang: m.original_language,
        }));
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return [];
}

async function main() {
  console.log("2019", await search("Aladdin", "2019"));
  console.log("1992", await search("Aladdin", "1992"));
  console.log("alladin", await search("Alladin"));
}

main();
