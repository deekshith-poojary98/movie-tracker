"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Movie } from "@/lib/types";
import { parseCastJson, youtubeTrailerUrl } from "@/lib/types";
import { formatWatchedDisplay, posterUrl, profileUrl } from "@/lib/normalize";
import { useAuth } from "./AuthProvider";

type Props = {
  movie: Movie | null;
  onClose: () => void;
  onDeleted: (id: number) => void;
};

export function MovieModal({ movie, onClose, onDeleted }: Props) {
  const { admin } = useAuth();

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!movie) return;
    setDeleteError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [movie, onClose]);

  if (!movie) return null;

  const poster = posterUrl(movie.posterPath, "w500");
  const cast = parseCastJson(movie.castJson);
  const trailer = youtubeTrailerUrl(movie.trailerKey);
  const movieId = movie.id;
  const movieTitle = movie.title;

  async function handleDelete() {
    if (!confirm(`Delete "${movieTitle}" from your list?`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(
          (data.error as string) ||
            (res.status === 401
              ? "Session expired — log in again to delete."
              : "Could not delete this movie.")
        );
        return;
      }
      onDeleted(movieId);
      onClose();
    } catch {
      setDeleteError("Could not delete this movie. Check your connection.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-fade-up max-h-[92vh] w-full max-w-3xl overflow-x-hidden overflow-y-auto rounded-t-2xl bg-elevated shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={movie.title}
      >
        <div className="grid min-w-0 gap-0 sm:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative aspect-[2/3] overflow-hidden bg-black sm:aspect-auto sm:min-h-full sm:w-[220px]">
            {poster ? (
              <Image
                src={poster}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="220px"
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center bg-[linear-gradient(160deg,#2a1214,#141417)]">
                <span className="font-[family-name:var(--font-display)] text-7xl text-accent">
                  {movie.title.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="relative flex min-w-0 flex-col overflow-x-hidden p-5 sm:p-7">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white sm:static sm:mb-4 sm:self-end"
            >
              Close
            </button>
            <h2 className="break-words font-[family-name:var(--font-display)] text-4xl tracking-wide">
              {movie.title}
            </h2>
            {movie.tagline && (
              <p className="mt-1 text-sm italic text-zinc-400">
                “{movie.tagline}”
              </p>
            )}
            <p className="mt-2 text-sm text-muted">
              Watched{" "}
              {formatWatchedDisplay(movie.watchedAt, movie.watchedRaw)}
              {movie.releaseYear ? ` · Released ${movie.releaseYear}` : ""}
              {movie.runtime ? ` · ${movie.runtime} min` : ""}
              {movie.voteAverage != null
                ? ` · ★ ${movie.voteAverage.toFixed(1)}`
                : ""}
            </p>
            {movie.director && (
              <p className="mt-1 text-sm text-zinc-300">
                Directed by <span className="font-semibold">{movie.director}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded bg-white/10 px-2.5 py-1 text-xs font-semibold">
                {movie.language}
              </span>
              {movie.genres
                .split(",")
                .map((g) => g.trim())
                .filter(Boolean)
                .map((g) => (
                  <span
                    key={g}
                    className="rounded bg-accent/20 px-2.5 py-1 text-xs font-semibold text-red-200"
                  >
                    {g}
                  </span>
                ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-zinc-300">
              {movie.overview || "No overview available yet."}
            </p>

            {trailer && (
              <a
                href={trailer}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-soft"
              >
                Watch trailer
              </a>
            )}

            {cast.length > 0 && (
              <div className="mt-6 min-w-0">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Cast
                </h3>
                <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1">
                  {cast.map((member) => {
                    const photo = profileUrl(member.profilePath, "w185");
                    return (
                      <div
                        key={`${member.name}-${member.character}`}
                        className="w-[88px] shrink-0"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded bg-black/40 ring-1 ring-white/10">
                          {photo ? (
                            <Image
                              src={photo}
                              alt={member.name}
                              fill
                              className="object-cover"
                              sizes="88px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-lg text-muted">
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug">
                          {member.name}
                        </p>
                        {member.character && (
                          <p className="line-clamp-2 text-[11px] text-muted">
                            {member.character}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {admin && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={`/movies/${movie.id}/edit`}
                  className="rounded bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                {deleteError && (
                  <p className="w-full text-sm text-red-400" role="alert">
                    {deleteError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
