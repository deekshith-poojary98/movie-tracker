import { notFound, redirect } from "next/navigation";
import { MovieForm } from "@/components/MovieForm";
import { RequireAdmin } from "@/components/RequireAdmin";
import { isAdminFromCookies } from "@/lib/auth";
import { getMovie } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditMoviePage({ params }: Props) {
  if (!(await isAdminFromCookies())) {
    redirect("/");
  }

  const { id } = await params;
  const movie = await getMovie(Number(id));
  if (!movie) notFound();

  return (
    <RequireAdmin>
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-8">
        <h1 className="mb-2 font-[family-name:var(--font-display)] text-5xl tracking-wide text-white">
          Edit movie
        </h1>
        <p className="mb-10 text-muted">{movie.title}</p>
        <MovieForm mode="edit" initial={movie} />
      </div>
    </RequireAdmin>
  );
}
