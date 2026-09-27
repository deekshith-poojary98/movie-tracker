export type CastMember = {
  name: string;
  character: string;
  profilePath: string | null;
};

export type Movie = {
  id: number;
  title: string;
  watchedAt: string | null;
  watchedRaw: string | null;
  language: string;
  genres: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  tagline: string | null;
  director: string | null;
  castJson: string | null;
  trailerKey: string | null;
  tmdbId: number | null;
  releaseYear: number | null;
  runtime: number | null;
  voteAverage: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MovieInput = {
  title: string;
  watchedAt?: string | null;
  watchedRaw?: string | null;
  language: string;
  genres: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  tagline?: string | null;
  director?: string | null;
  castJson?: string | null;
  trailerKey?: string | null;
  tmdbId?: number | null;
  releaseYear?: number | null;
  runtime?: number | null;
  voteAverage?: number | null;
};

export type MovieFilters = {
  q?: string;
  language?: string;
  genre?: string;
  year?: string;
};

export type TmdbSearchResult = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  releaseDate: string | null;
  genres: string;
  language: string | null;
  runtime: number | null;
  voteAverage: number | null;
  tagline: string | null;
  director: string | null;
  cast: CastMember[];
  trailerKey: string | null;
};

export function parseCastJson(raw: string | null | undefined): CastMember[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as CastMember[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function youtubeTrailerUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `https://www.youtube.com/watch?v=${key}`;
}
