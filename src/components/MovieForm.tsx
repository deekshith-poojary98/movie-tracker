"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useState } from "react";
import type { Movie, TmdbSearchResult } from "@/lib/types";
import {
  formatWatchedDisplay,
  posterUrl,
  todayIsoDate,
  toDateInputValue,
} from "@/lib/normalize";

const fieldClass =
  "w-full rounded border border-white/10 bg-black/35 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40";

const dateFieldClass = `${fieldClass} [color-scheme:dark]`;

type Props = {
  mode: "create" | "edit";
  initial?: Movie;
};

export function MovieForm({ mode, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title || "");
  const [watchedDate, setWatchedDate] = useState(() => {
    if (mode === "edit") {
      return toDateInputValue(initial?.watchedAt, initial?.watchedRaw);
    }
    return todayIsoDate();
  });
  const [language, setLanguage] = useState(initial?.language || "");
  const [genres, setGenres] = useState(initial?.genres || "");
  const [overview, setOverview] = useState(initial?.overview || "");
  const [posterPath, setPosterPath] = useState(initial?.posterPath || "");
  const [backdropPath, setBackdropPath] = useState(
    initial?.backdropPath || ""
  );
  const [tmdbId, setTmdbId] = useState<number | null>(initial?.tmdbId ?? null);
  const [releaseYear, setReleaseYear] = useState<number | null>(
    initial?.releaseYear ?? null
  );
  const [runtime, setRuntime] = useState<number | null>(
    initial?.runtime ?? null
  );
  const [voteAverage, setVoteAverage] = useState<number | null>(
    initial?.voteAverage ?? null
  );
  const [tagline, setTagline] = useState(initial?.tagline || "");
  const [director, setDirector] = useState(initial?.director || "");
  const [castJson, setCastJson] = useState(initial?.castJson || "");
  const [trailerKey, setTrailerKey] = useState(initial?.trailerKey || "");
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbYear, setTmdbYear] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [dupes, setDupes] = useState<Movie[] | null>(null);

  async function searchTmdb() {
    const q = tmdbQuery.trim() || title.trim();
    if (!q) {
      setSearchMessage("Enter a title to search TMDB.");
      setTmdbResults([]);
      return;
    }
    setSearching(true);
    setSearchMessage(null);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (tmdbYear.trim()) params.set("year", tmdbYear.trim());
      const res = await fetch(`/api/tmdb/search?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      const results = (data.results || []) as TmdbSearchResult[];
      setTmdbResults(results);

      if (!res.ok || data.error) {
        setSearchMessage(
          data.error ||
            "TMDB search failed. Wait a moment and try again."
        );
        return;
      }
      if (results.length === 0) {
        setSearchMessage(
          tmdbYear.trim()
            ? `No TMDB matches for “${q}” (${tmdbYear.trim()}). Try another title or clear the year.`
            : `No TMDB matches for “${q}”. You can still fill the form manually.`
        );
        return;
      }
      setSearchMessage(null);
    } catch {
      setTmdbResults([]);
      setSearchMessage(
        "TMDB is unreachable right now. Check your connection and try again."
      );
    } finally {
      setSearching(false);
    }
  }

  async function applyTmdb(result: TmdbSearchResult) {
    setTitle(result.title);
    setOverview(result.overview || "");
    setPosterPath(result.posterPath || "");
    setBackdropPath(result.backdropPath || "");
    setTmdbId(result.id);
    setReleaseYear(result.releaseYear);
    setRuntime(result.runtime);
    setVoteAverage(result.voteAverage);
    setTagline(result.tagline || "");
    setDirector(result.director || "");
    setCastJson(result.cast?.length ? JSON.stringify(result.cast) : "");
    setTrailerKey(result.trailerKey || "");
    if (result.genres) setGenres(result.genres);
    if (result.language) setLanguage(result.language);
    setTmdbResults([]);
    setSearchMessage(null);

    try {
      const res = await fetch(`/api/tmdb/movie/${result.id}`);
      if (res.ok) {
        const data = await res.json();
        const m = data.movie as TmdbSearchResult;
        if (m) {
          setOverview(m.overview || result.overview || "");
          setPosterPath(m.posterPath || result.posterPath || "");
          setBackdropPath(m.backdropPath || result.backdropPath || "");
          setReleaseYear(m.releaseYear);
          setRuntime(m.runtime);
          setVoteAverage(m.voteAverage);
          setTagline(m.tagline || "");
          setDirector(m.director || "");
          setCastJson(m.cast?.length ? JSON.stringify(m.cast) : "");
          setTrailerKey(m.trailerKey || "");
          if (m.genres) setGenres(m.genres);
          if (m.language) setLanguage(m.language);
        }
      }
    } catch {
      // search result fields already applied
    }
  }

  function buildPayload() {
    return {
      title,
      watchedDate,
      language,
      genres,
      overview: overview || null,
      posterPath: posterPath || null,
      backdropPath: backdropPath || null,
      tagline: tagline || null,
      director: director || null,
      castJson: castJson || null,
      trailerKey: trailerKey || null,
      tmdbId,
      releaseYear,
      runtime,
      voteAverage,
    };
  }

  async function saveMovie() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        mode === "create" ? "/api/movies" : `/api/movies/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      setDupes(null);
      router.push("/");
      router.refresh();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "create") {
      setSaving(true);
      try {
        const params = new URLSearchParams({ title: title.trim() });
        if (tmdbId) params.set("tmdbId", String(tmdbId));
        const res = await fetch(`/api/movies/duplicates?${params}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not check for duplicates");
          return;
        }
        const matches = (data.movies || []) as Movie[];
        if (matches.length > 0) {
          setDupes(matches);
          return;
        }
      } catch {
        setError("Could not check for duplicates");
        return;
      } finally {
        setSaving(false);
      }
    }

    await saveMovie();
  }

  const preview = posterUrl(posterPath || null, "w342");

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[200px_1fr]"
      >
        <div className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded bg-elevated ring-1 ring-white/10 lg:w-full">
          {preview ? (
            <Image
              src={preview}
              alt=""
              fill
              className="object-cover"
              sizes="200px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              No poster
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded border border-white/10 bg-elevated/60 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
              Find on TMDB
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                value={tmdbQuery}
                onChange={(e) => {
                  setTmdbQuery(e.target.value);
                  setSearchMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void searchTmdb();
                  }
                }}
                placeholder={title || "Search movie title…"}
                className="min-w-[10rem] flex-1 rounded border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                value={tmdbYear}
                onChange={(e) =>
                  setTmdbYear(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="Year"
                inputMode="numeric"
                className="w-20 rounded border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                aria-label="Release year"
              />
              <button
                type="button"
                onClick={() => void searchTmdb()}
                disabled={searching}
                className="rounded bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20 disabled:opacity-50"
              >
                {searching ? (
                  <span className="loading-dots" aria-label="Searching">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  "Search"
                )}
              </button>
            </div>
            {searchMessage && (
              <p
                className="mt-3 text-sm text-amber-300/90"
                role="status"
                aria-live="polite"
              >
                {searchMessage}
              </p>
            )}
            {tmdbResults.length > 0 && (
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {tmdbResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => applyTmdb(r)}
                      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded px-2 py-2 text-left text-sm hover:bg-white/10"
                    >
                      <span className="font-semibold">{r.title}</span>
                      {r.releaseYear && (
                        <span className="text-muted">({r.releaseYear})</span>
                      )}
                      {r.language && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-zinc-300">
                          {r.language}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Field label="Title" required>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Watched date">
            <input
              type="date"
              value={watchedDate}
              onChange={(e) => setWatchedDate(e.target.value)}
              className={dateFieldClass}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Language">
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Genres">
              <input
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="Action, Comedy"
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Overview">
            <textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              rows={4}
              className={`${fieldClass} resize-y`}
            />
          </Field>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-accent px-6 py-2.5 text-sm font-bold text-white transition hover:bg-accent-soft disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : mode === "create"
                  ? "Add movie"
                  : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded border border-white/20 px-6 py-2.5 text-sm font-bold text-muted transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      {dupes && dupes.length > 0 && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => !saving && setDupes(null)}
          role="presentation"
        >
          <div
            className="animate-fade-up w-full max-w-md rounded-xl bg-elevated p-6 shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-labelledby="dupe-dialog-title"
          >
            <h2
              id="dupe-dialog-title"
              className="font-[family-name:var(--font-display)] text-3xl tracking-wide"
            >
              Already on Shelf
            </h2>
            <p className="mt-2 text-sm text-muted">
              This title looks like one you already logged. Add it again anyway?
            </p>
            <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {dupes.map((m) => (
                <li
                  key={m.id}
                  className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{m.title}</span>
                  {m.releaseYear ? (
                    <span className="text-muted"> ({m.releaseYear})</span>
                  ) : null}
                  <div className="mt-0.5 text-xs text-muted">
                    Watched {formatWatchedDisplay(m.watchedAt, m.watchedRaw)}
                    {m.language ? ` · ${m.language}` : ""}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => saveMovie()}
                className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-soft disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add anyway"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setDupes(null)}
                className="rounded border border-white/20 px-5 py-2.5 text-sm font-bold text-muted transition hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
