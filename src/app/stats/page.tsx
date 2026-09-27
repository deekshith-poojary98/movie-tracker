import Link from "next/link";
import { isAdminFromCookies } from "@/lib/auth";
import { OWNER_NAME, possess } from "@/lib/branding";
import { listMovies } from "@/lib/db";
import { formatWatchedDisplay } from "@/lib/normalize";
import { computeLibraryStats, formatHours, type CountRow } from "@/lib/stats";

export const dynamic = "force-dynamic";

function BarList({
  rows,
  maxBars = 12,
}: {
  rows: CountRow[];
  maxBars?: number;
}) {
  const slice = rows.slice(0, maxBars);
  const max = Math.max(...slice.map((r) => r.count), 1);

  return (
    <ul className="space-y-2.5">
      {slice.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-zinc-200">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{row.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-elevated/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide text-white sm:text-5xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export default async function StatsPage() {
  const stats = computeLibraryStats(await listMovies());
  const admin = await isAdminFromCookies();
  const whose = admin ? "your" : possess(OWNER_NAME);
  const directorsHeading = admin
    ? "Directors you watch most"
    : `Directors ${OWNER_NAME} watches most`;

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-28 sm:px-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide text-white sm:text-6xl">
            Stats
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            A snapshot of {whose} watch log
            {stats.yearSpan
              ? ` from ${stats.yearSpan.from} to ${stats.yearSpan.to}`
              : ""}
            .
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-wider text-muted transition hover:text-white"
        >
          Back to browse
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Movies watched" value={String(stats.total)} />
        <StatCard
          label="Busiest year"
          value={stats.busiestYear?.label || "—"}
          hint={
            stats.busiestYear
              ? `${stats.busiestYear.count} titles`
              : undefined
          }
        />
        <StatCard
          label="Avg TMDB rating"
          value={stats.avgRating != null ? stats.avgRating.toFixed(1) : "—"}
          hint={`${stats.ratedCount} rated titles`}
        />
        <StatCard
          label="Time watched"
          value={formatHours(stats.totalRuntimeMin)}
          hint={
            stats.avgRuntimeMin
              ? `Avg ${stats.avgRuntimeMin} min · ${stats.runtimeCount} with runtime`
              : undefined
          }
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-elevated/60 p-5 sm:p-6">
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Watched by year
          </h2>
          <BarList rows={stats.byYear} maxBars={20} />
        </section>

        <section className="rounded-xl border border-white/10 bg-elevated/60 p-5 sm:p-6">
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Languages
          </h2>
          <BarList rows={stats.byLanguage} />
        </section>

        <section className="rounded-xl border border-white/10 bg-elevated/60 p-5 sm:p-6">
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Top genres
          </h2>
          <BarList rows={stats.byGenre} />
        </section>

        <section className="rounded-xl border border-white/10 bg-elevated/60 p-5 sm:p-6">
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            {directorsHeading}
          </h2>
          {stats.topDirectors.length > 0 ? (
            <BarList rows={stats.topDirectors} />
          ) : (
            <p className="text-sm text-muted">No director data yet.</p>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-elevated/60 p-5 sm:p-6">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Highest rated
          </h2>
          <ol className="space-y-3">
            {stats.highestRated.map((m, i) => (
              <li
                key={m.title}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-zinc-200">
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {m.title}
                </span>
                <span className="shrink-0 tabular-nums text-accent">
                  ★ {m.rating.toFixed(1)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-white/10 bg-elevated/60 p-5 sm:p-6">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Longest runtimes
          </h2>
          <ol className="space-y-3">
            {stats.longest.map((m, i) => (
              <li
                key={m.title}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-zinc-200">
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {m.title}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {m.runtime}m
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-white/10 bg-elevated/60 p-5 sm:p-6">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Most recent
          </h2>
          <ol className="space-y-3">
            {stats.recent.map((m, i) => (
              <li
                key={`${m.title}-${m.watchedAt}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-zinc-200">
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {m.title}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatWatchedDisplay(m.watchedAt, m.watchedRaw)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="mt-8 text-xs text-muted">
        Ratings and runtimes come from TMDB where matched ({stats.withTmdb} of{" "}
        {stats.total}). Years use {whose} watched dates.
      </p>
    </div>
  );
}
