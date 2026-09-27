"use client";

import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";

type Props = {
  title: string;
  movies: Movie[];
  onSelect: (movie: Movie) => void;
  delay?: number;
};

export function MovieRow({ title, movies, onSelect, delay = 0 }: Props) {
  if (!movies.length) return null;

  return (
    <section
      className="animate-rail-in mb-10"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="mb-3 px-4 font-[family-name:var(--font-display)] text-2xl tracking-wide text-white sm:px-8 sm:text-3xl">
        {title}
      </h2>
      <div className="-mt-3 overflow-x-auto overflow-y-visible px-4 pb-2 pt-3 scrollbar-thin sm:px-8">
        <div className="flex snap-x gap-3 sm:gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}
