import { Suspense } from "react";
import { BrowseClient } from "@/components/BrowseClient";
import {
  getDistinctGenres,
  getDistinctLanguages,
  listMovies,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [movies, languages, genres] = await Promise.all([
    listMovies(),
    getDistinctLanguages(),
    getDistinctGenres(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <BrowseClient
        initialMovies={movies}
        languages={languages}
        genres={genres}
      />
    </Suspense>
  );
}
