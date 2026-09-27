"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/normalize";

type Props = {
  movie: Movie;
  onSelect: (movie: Movie) => void;
};

export function MovieCard({ movie, onSelect }: Props) {
  const poster = posterUrl(movie.posterPath, "w342");
  const initial = movie.title.charAt(0).toUpperCase();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [poster]);

  return (
    <button
      type="button"
      onClick={() => onSelect(movie)}
      className="group relative z-0 w-[140px] shrink-0 snap-start text-left transition duration-300 hover:z-20 hover:-translate-y-2 sm:w-[160px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded bg-elevated ring-1 ring-white/10 transition duration-300 group-hover:ring-accent/70">
        {poster ? (
          <>
            {!loaded && (
              <div
                className="poster-skeleton absolute inset-0"
                aria-hidden
              />
            )}
            <Image
              src={poster}
              alt={movie.title}
              fill
              className={`object-cover transition duration-500 group-hover:scale-105 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              sizes="160px"
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#2a1214,#141417)]">
            <span className="font-[family-name:var(--font-display)] text-5xl text-accent/80">
              {initial}
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium text-zinc-200">
        {movie.title}
      </p>
      <p className="line-clamp-1 text-xs text-muted">{movie.language}</p>
    </button>
  );
}
