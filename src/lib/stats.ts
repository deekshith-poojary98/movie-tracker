import type { Movie } from "./types";
import { watchedYear } from "./normalize";

export type CountRow = { label: string; count: number };

export type LibraryStats = {
  total: number;
  withTmdb: number;
  yearSpan: { from: string; to: string } | null;
  busiestYear: CountRow | null;
  byYear: CountRow[];
  byLanguage: CountRow[];
  byGenre: CountRow[];
  topDirectors: CountRow[];
  avgRating: number | null;
  ratedCount: number;
  totalRuntimeMin: number;
  avgRuntimeMin: number | null;
  runtimeCount: number;
  highestRated: { title: string; rating: number }[];
  longest: { title: string; runtime: number }[];
  recent: { title: string; watchedAt: string | null; watchedRaw: string | null }[];
};

function countMap(entries: string[]): CountRow[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e, (map.get(e) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function computeLibraryStats(movies: Movie[]): LibraryStats {
  const years = movies
    .map((m) => watchedYear(m.watchedAt, m.watchedRaw))
    .filter((y): y is string => Boolean(y));

  const byYear = countMap(years).sort(
    (a, b) => Number(a.label) - Number(b.label)
  );

  const byLanguage = countMap(
    movies.map((m) => m.language.trim()).filter(Boolean)
  );

  const genreTokens: string[] = [];
  for (const m of movies) {
    for (const g of m.genres.split(",")) {
      const t = g.trim();
      if (t) genreTokens.push(t);
    }
  }
  const byGenre = countMap(genreTokens).slice(0, 12);

  const directors: string[] = [];
  for (const m of movies) {
    if (!m.director) continue;
    for (const d of m.director.split(",")) {
      const t = d.trim();
      if (t) directors.push(t);
    }
  }
  const topDirectors = countMap(directors).slice(0, 8);

  const rated = movies.filter(
    (m) => m.voteAverage != null && Number.isFinite(m.voteAverage)
  );
  const avgRating =
    rated.length > 0
      ? Math.round(
          (rated.reduce((s, m) => s + (m.voteAverage || 0), 0) / rated.length) *
            10
        ) / 10
      : null;

  const withRuntime = movies.filter((m) => m.runtime && m.runtime > 0);
  const totalRuntimeMin = withRuntime.reduce(
    (s, m) => s + (m.runtime || 0),
    0
  );
  const avgRuntimeMin =
    withRuntime.length > 0
      ? Math.round(totalRuntimeMin / withRuntime.length)
      : null;

  const highestRated = [...rated]
    .sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0))
    .slice(0, 8)
    .map((m) => ({ title: m.title, rating: m.voteAverage! }));

  const longest = [...withRuntime]
    .sort((a, b) => (b.runtime || 0) - (a.runtime || 0))
    .slice(0, 5)
    .map((m) => ({ title: m.title, runtime: m.runtime! }));

  const recent = [...movies]
    .filter((m) => m.watchedAt)
    .sort((a, b) => (b.watchedAt || "").localeCompare(a.watchedAt || ""))
    .slice(0, 8)
    .map((m) => ({
      title: m.title,
      watchedAt: m.watchedAt,
      watchedRaw: m.watchedRaw,
    }));

  const yearNums = byYear.map((y) => y.label).sort();
  const busiestYear =
    byYear.length > 0
      ? [...byYear].sort((a, b) => b.count - a.count)[0]
      : null;

  return {
    total: movies.length,
    withTmdb: movies.filter((m) => m.tmdbId).length,
    yearSpan:
      yearNums.length > 0
        ? { from: yearNums[0], to: yearNums[yearNums.length - 1] }
        : null,
    busiestYear,
    byYear,
    byLanguage,
    byGenre,
    topDirectors,
    avgRating,
    ratedCount: rated.length,
    totalRuntimeMin,
    avgRuntimeMin,
    runtimeCount: withRuntime.length,
    highestRated,
    longest,
    recent,
  };
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
