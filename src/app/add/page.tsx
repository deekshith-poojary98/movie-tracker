import { redirect } from "next/navigation";
import { MovieForm } from "@/components/MovieForm";
import { isAdminFromCookies } from "@/lib/auth";

export default async function AddPage() {
  if (!(await isAdminFromCookies())) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-8">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-5xl tracking-wide text-white">
        Log a movie
      </h1>
      <p className="mb-10 text-muted">
        Search TMDB to pull a poster and overview, then save it to your shelf.
      </p>
      <MovieForm mode="create" />
    </div>
  );
}
