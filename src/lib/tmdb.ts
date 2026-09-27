import type { CastMember, TmdbSearchResult } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";

type TmdbMovieResult = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  tagline?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  original_language?: string;
};

type TmdbMovieDetails = TmdbMovieResult & {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: {
      name?: string;
      character?: string;
      profile_path?: string | null;
      order?: number;
    }[];
    crew?: {
      name?: string;
      job?: string;
      department?: string;
    }[];
  };
  videos?: {
    results?: {
      key?: string;
      site?: string;
      type?: string;
      official?: boolean;
    }[];
  };
};

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY?.trim() || undefined;
}

export function hasTmdbKey(): boolean {
  return Boolean(getApiKey());
}

async function tmdbFetch(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });

      // Retry transient upstream errors
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`TMDB HTTP ${res.status}`);
        await sleep(250 * (i + 1));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      await sleep(250 * (i + 1));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "TMDB request failed";
  throw new Error(message);
}

let genreNameById: Map<number, string> | null = null;
let genreMapPromise: Promise<Map<number, string>> | null = null;

async function loadGenreMap(): Promise<Map<number, string>> {
  if (genreNameById) return genreNameById;
  if (genreMapPromise) return genreMapPromise;

  genreMapPromise = (async () => {
    const apiKey = getApiKey();
    if (!apiKey) return new Map();

    try {
      const url = new URL(`${TMDB_BASE}/genre/movie/list`);
      url.searchParams.set("api_key", apiKey);
      const res = await tmdbFetch(url.toString());
      if (!res.ok) return new Map();

      const data = (await res.json()) as {
        genres?: { id: number; name: string }[];
      };
      genreNameById = new Map(
        (data.genres || []).map((g) => [g.id, g.name] as const)
      );
      return genreNameById;
    } catch {
      // Search can still work without genre names
      return new Map();
    } finally {
      genreMapPromise = null;
    }
  })();

  return genreMapPromise;
}

function genresFromIds(
  ids: number[] | undefined,
  map: Map<number, string>
): string {
  if (!ids?.length) return "";
  return ids
    .map((id) => map.get(id))
    .filter(Boolean)
    .join(", ");
}

function pickTrailerKey(
  videos: TmdbMovieDetails["videos"]
): string | null {
  const list = videos?.results || [];
  const yt = list.filter((v) => v.site === "YouTube" && v.key);
  const trailer =
    yt.find((v) => v.type === "Trailer" && v.official) ||
    yt.find((v) => v.type === "Trailer") ||
    yt.find((v) => v.type === "Teaser") ||
    yt[0];
  return trailer?.key || null;
}

function pickDirector(credits: TmdbMovieDetails["credits"]): string | null {
  const directors = (credits?.crew || [])
    .filter((c) => c.job === "Director" && c.name)
    .map((c) => c.name!) ;
  return directors.length ? [...new Set(directors)].join(", ") : null;
}

function pickCast(credits: TmdbMovieDetails["credits"], limit = 8): CastMember[] {
  return (credits?.cast || [])
    .slice()
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, limit)
    .filter((c) => c.name)
    .map((c) => ({
      name: c.name!,
      character: c.character || "",
      profilePath: c.profile_path || null,
    }));
}

/** Map TMDB ISO 639-1 codes to the labels used in your sheet. */
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  th: "Thai",
  id: "Indonesian",
  tr: "Turkish",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  tcy: "Tulu",
};

export function languageFromTmdbCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const key = code.trim().toLowerCase();
  if (LANGUAGE_LABELS[key]) return LANGUAGE_LABELS[key];
  // Fallback: title-case the code
  return key.toUpperCase();
}

function emptyExtras() {
  return {
    tagline: null as string | null,
    director: null as string | null,
    cast: [] as CastMember[],
    trailerKey: null as string | null,
  };
}

function mapSearchResult(
  m: TmdbMovieResult,
  genreMap: Map<number, string>
): TmdbSearchResult {
  const releaseDate = m.release_date || null;
  const releaseYear = releaseDate
    ? Number(releaseDate.slice(0, 4)) || null
    : null;
  return {
    id: m.id,
    title: m.title || m.name || "Untitled",
    overview: m.overview || "",
    posterPath: m.poster_path || null,
    backdropPath: m.backdrop_path || null,
    releaseYear,
    releaseDate,
    genres: genresFromIds(m.genre_ids, genreMap),
    language: languageFromTmdbCode(m.original_language),
    runtime: null,
    voteAverage:
      typeof m.vote_average === "number"
        ? Math.round(m.vote_average * 10) / 10
        : null,
    ...emptyExtras(),
  };
}

function mapDetails(m: TmdbMovieDetails): TmdbSearchResult {
  const releaseDate = m.release_date || null;
  const releaseYear = releaseDate
    ? Number(releaseDate.slice(0, 4)) || null
    : null;
  return {
    id: m.id,
    title: m.title || m.name || "Untitled",
    overview: m.overview || "",
    posterPath: m.poster_path || null,
    backdropPath: m.backdrop_path || null,
    releaseYear,
    releaseDate,
    genres: (m.genres || []).map((g) => g.name).join(", "),
    language: languageFromTmdbCode(m.original_language),
    runtime: typeof m.runtime === "number" && m.runtime > 0 ? m.runtime : null,
    voteAverage:
      typeof m.vote_average === "number"
        ? Math.round(m.vote_average * 10) / 10
        : null,
    tagline: m.tagline?.trim() || null,
    director: pickDirector(m.credits),
    cast: pickCast(m.credits, 8),
    trailerKey: pickTrailerKey(m.videos),
  };
}

export async function searchTmdbMovies(
  query: string,
  limit = 8,
  opts: { year?: number; language?: string } = {}
): Promise<TmdbSearchResult[]> {
  const apiKey = getApiKey();
  if (!apiKey || !query.trim()) return [];

  const genreMap = await loadGenreMap();
  const url = new URL(`${TMDB_BASE}/search/movie`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("include_adult", "false");
  if (opts.year && Number.isFinite(opts.year)) {
    url.searchParams.set("primary_release_year", String(opts.year));
  }

  const res = await tmdbFetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data = (await res.json()) as { results?: TmdbMovieResult[] };
  let results = (data.results || [])
    .slice(0, Math.max(limit * 3, 15))
    .map((m) => mapSearchResult(m, genreMap));

  // Client-side language filter (TMDB search has no original_language filter)
  if (opts.language?.trim()) {
    const want = opts.language.trim().toLowerCase();
    results = results.filter(
      (r) => r.language && r.language.toLowerCase() === want
    );
  }

  return results.slice(0, limit);
}

export async function getTmdbMovieDetails(
  tmdbId: number
): Promise<TmdbSearchResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(`${TMDB_BASE}/movie/${tmdbId}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("append_to_response", "credits,videos");

  const res = await tmdbFetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB details failed: ${res.status}`);
  }

  const data = (await res.json()) as TmdbMovieDetails;
  return mapDetails(data);
}

/** Search, pick best title match, then load full details (genres, cast, trailer, etc.). */
export async function findBestTmdbMatch(
  title: string
): Promise<TmdbSearchResult | null> {
  const results = await searchTmdbMovies(title, 5);
  if (!results.length) return null;

  const normalized = title.trim().toLowerCase();
  const exact = results.find((r) => r.title.toLowerCase() === normalized);
  const best = exact || results[0];

  try {
    const details = await getTmdbMovieDetails(best.id);
    return details || best;
  } catch {
    return best;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function tmdbDetailsToMoviePatch(details: TmdbSearchResult) {
  return {
    genres: details.genres,
    posterPath: details.posterPath,
    backdropPath: details.backdropPath,
    overview: details.overview || null,
    tagline: details.tagline,
    director: details.director,
    castJson: details.cast.length ? JSON.stringify(details.cast) : null,
    trailerKey: details.trailerKey,
    tmdbId: details.id,
    releaseYear: details.releaseYear,
    runtime: details.runtime,
    voteAverage: details.voteAverage,
  };
}
