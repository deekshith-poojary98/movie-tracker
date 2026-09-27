"use client";

import Image from "next/image";
import Link from "next/link";
import type { Movie } from "@/lib/types";
import { OWNER_NAME } from "@/lib/branding";
import { formatWatchedDisplay, posterUrl } from "@/lib/normalize";

type Props = {
  movie: Movie;
  onOpen?: (movie: Movie) => void;
  canEdit?: boolean;
};

export function Hero({ movie, onOpen, canEdit = false }: Props) {
  const poster = posterUrl(movie.posterPath, "w780");
  const backdrop =
    posterUrl(movie.backdropPath, "original") ||
    posterUrl(movie.posterPath, "original");

  const tagline = canEdit
    ? "Every title you've watched since 2018 — browsable like a streaming shelf."
    : `Every title ${OWNER_NAME} has watched since 2018 — browsable like a streaming shelf.`;

  return (
    <section className="relative min-h-[78vh] w-full overflow-hidden">
      <div className="absolute inset-0">
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            className="animate-hero-ken object-cover object-top opacity-55"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,_#2a1012_0%,_#0b0b0d_55%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/40" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-[1400px] flex-col justify-end px-4 pb-16 pt-28 sm:px-8">
        <p className="animate-fade-up font-[family-name:var(--font-display)] text-5xl tracking-[0.12em] text-accent sm:text-7xl md:text-8xl">
          SHELF
        </p>
        <p
          className="animate-fade-up mt-2 max-w-xl text-base text-muted sm:text-lg"
          style={{ animationDelay: "80ms" }}
        >
          {tagline}
        </p>

        <div
          className="animate-fade-up mt-10 max-w-2xl"
          style={{ animationDelay: "160ms" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Recently watched
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide sm:text-6xl">
            {movie.title}
          </h1>
          <p className="mt-3 line-clamp-3 max-w-xl text-sm text-zinc-300 sm:text-base">
            {movie.overview ||
              `${movie.language} · ${movie.genres || "Uncategorized"}`}
          </p>
          <p className="mt-2 text-sm text-muted">
            Watched {formatWatchedDisplay(movie.watchedAt, movie.watchedRaw)}
            {movie.language ? ` · ${movie.language}` : ""}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onOpen?.(movie)}
              className="rounded bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              View details
            </button>
            {canEdit && (
              <Link
                href="/add"
                className="rounded border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-bold backdrop-blur transition hover:bg-white/20"
              >
                Log a movie
              </Link>
            )}
          </div>
        </div>

        {poster && (
          <div
            className="pointer-events-none absolute bottom-16 right-8 hidden w-44 overflow-hidden rounded shadow-2xl ring-1 ring-white/10 lg:block xl:w-52"
            aria-hidden
          >
            <Image
              src={poster}
              alt=""
              width={300}
              height={450}
              className="h-auto w-full"
            />
          </div>
        )}
      </div>
    </section>
  );
}
