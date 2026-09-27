"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Movie } from "@/lib/types";
import { watchedYear } from "@/lib/normalize";
import { Filters } from "./Filters";
import { Hero } from "./Hero";
import { MovieModal } from "./MovieModal";
import { MovieRow } from "./MovieRow";
import { useAuth } from "./AuthProvider";

type Props = {
  initialMovies: Movie[];
  languages: string[];
  genres: string[];
};

type FilterState = {
  q: string;
  language: string;
  genre: string;
  year: string;
};

function filterMovies(
  movies: Movie[],
  q: string,
  language: string,
  genre: string,
  year: string
): Movie[] {
  const query = q.trim().toLowerCase();
  return movies.filter((m) => {
    if (query && !m.title.toLowerCase().includes(query)) {
      return false;
    }
    if (language && m.language !== language) return false;
    if (genre && !m.genres.split(",").map((g) => g.trim()).includes(genre)) {
      return false;
    }
    if (year) {
      const y = watchedYear(m.watchedAt, m.watchedRaw);
      if (y !== year) return false;
    }
    return true;
  });
}

function filtersFromParams(params: URLSearchParams): FilterState {
  return {
    q: params.get("q") || "",
    language: params.get("language") || "",
    genre: params.get("genre") || "",
    year: params.get("year") || "",
  };
}

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.language) params.set("language", filters.language);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.year) params.set("year", filters.year);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function BrowseClient({ initialMovies, languages, genres }: Props) {
  const { admin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [movies, setMovies] = useState(initialMovies);
  const [filters, setFilters] = useState<FilterState>(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString()))
  );
  const [selected, setSelected] = useState<Movie | null>(null);
  const skipUrlSync = useRef(false);

  // Keep state in sync when browser back/forward changes the URL
  useEffect(() => {
    const next = filtersFromParams(
      new URLSearchParams(searchParams.toString())
    );
    skipUrlSync.current = true;
    setFilters((prev) => {
      if (
        prev.q === next.q &&
        prev.language === next.language &&
        prev.genre === next.genre &&
        prev.year === next.year
      ) {
        return prev;
      }
      return next;
    });
  }, [searchParams]);

  // Mirror filter state into the URL for shareable links
  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    const qs = buildQueryString(filters);
    const nextUrl = `${pathname}${qs}`;
    const current = `${pathname}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    if (nextUrl !== current) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [filters, pathname, router, searchParams]);

  const onFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const { q, language, genre, year } = filters;

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const m of movies) {
      const y = watchedYear(m.watchedAt, m.watchedRaw);
      if (y) set.add(y);
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [movies]);

  const filtered = useMemo(
    () => filterMovies(movies, q, language, genre, year),
    [movies, q, language, genre, year]
  );

  // Always the true latest watch from the full library (not the first search hit)
  const hero = movies[0] || null;

  const byYear = useMemo(() => {
    const map = new Map<string, Movie[]>();
    for (const m of filtered) {
      const y = watchedYear(m.watchedAt, m.watchedRaw) || "Unknown year";
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Unknown year") return 1;
      if (b[0] === "Unknown year") return -1;
      return Number(b[0]) - Number(a[0]);
    });
  }, [filtered]);

  const byGenre = useMemo(() => {
    const map = new Map<string, Movie[]>();
    for (const m of filtered) {
      const tokens = m.genres.split(",").map((g) => g.trim()).filter(Boolean);
      for (const g of tokens.length ? tokens : ["Uncategorized"]) {
        if (!map.has(g)) map.set(g, []);
        const list = map.get(g)!;
        if (!list.some((x) => x.id === m.id)) list.push(m);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);
  }, [filtered]);

  const byLanguage = useMemo(() => {
    const map = new Map<string, Movie[]>();
    for (const m of filtered) {
      if (!map.has(m.language)) map.set(m.language, []);
      map.get(m.language)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const isFiltering = Boolean(q || language || genre || year);

  return (
    <>
      {hero ? (
        <Hero movie={hero} onOpen={setSelected} canEdit={admin} />
      ) : (
        <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <p className="font-[family-name:var(--font-display)] text-6xl tracking-[0.12em] text-accent">
            SHELF
          </p>
          <p className="mt-4 max-w-md text-muted">
            No movies yet. Run <code className="text-white">npm run seed</code>{" "}
            or{" "}
            <a href="/add" className="text-accent underline">
              add your first title
            </a>
            .
          </p>
        </section>
      )}

      <Filters
        q={q}
        language={language}
        genre={genre}
        year={year}
        languages={languages}
        genres={genres}
        years={years}
        onChange={onFilterChange}
      />

      <div className="pb-20">
        <p className="mb-6 px-4 text-sm text-muted sm:px-8">
          Showing {filtered.length} of {movies.length} titles
        </p>

        {isFiltering ? (
          <MovieRow
            title="Matching titles"
            movies={filtered}
            onSelect={setSelected}
          />
        ) : (
          <>
            {byYear.slice(0, 6).map(([label, list], i) => (
              <MovieRow
                key={`year-${label}`}
                title={
                  label === "Unknown year"
                    ? "Date unknown"
                    : `Watched in ${label}`
                }
                movies={list}
                onSelect={setSelected}
                delay={i * 60}
              />
            ))}
            {byGenre.map(([label, list], i) => (
              <MovieRow
                key={`genre-${label}`}
                title={label}
                movies={list.slice(0, 24)}
                onSelect={setSelected}
                delay={120 + i * 40}
              />
            ))}
            {byLanguage.map(([label, list], i) => (
              <MovieRow
                key={`lang-${label}`}
                title={`${label} films`}
                movies={list}
                onSelect={setSelected}
                delay={200 + i * 40}
              />
            ))}
          </>
        )}
      </div>

      <MovieModal
        movie={selected}
        onClose={() => setSelected(null)}
        onDeleted={(id) => {
          setMovies((prev) => prev.filter((m) => m.id !== id));
          setSelected(null);
          router.refresh();
        }}
      />
    </>
  );
}
