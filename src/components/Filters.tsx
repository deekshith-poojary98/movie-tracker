"use client";

type Props = {
  q: string;
  language: string;
  genre: string;
  year: string;
  languages: string[];
  genres: string[];
  years: string[];
  onChange: (next: {
    q?: string;
    language?: string;
    genre?: string;
    year?: string;
  }) => void;
};

export function Filters({
  q,
  language,
  genre,
  year,
  languages,
  genres,
  years,
  onChange,
}: Props) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:px-8">
      <input
        type="search"
        value={q}
        onChange={(e) => onChange({ q: e.target.value })}
        placeholder="Search titles…"
        className="w-full rounded border border-white/10 bg-elevated px-4 py-2.5 text-sm outline-none ring-accent/40 placeholder:text-zinc-500 focus:ring-2 sm:max-w-xs"
      />
      <select
        value={language}
        onChange={(e) => onChange({ language: e.target.value })}
        className="rounded border border-white/10 bg-elevated px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
      >
        <option value="">All languages</option>
        {languages.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        value={genre}
        onChange={(e) => onChange({ genre: e.target.value })}
        className="rounded border border-white/10 bg-elevated px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
      >
        <option value="">All genres</option>
        {genres.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange({ year: e.target.value })}
        className="rounded border border-white/10 bg-elevated px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
      >
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {(q || language || genre || year) && (
        <button
          type="button"
          onClick={() =>
            onChange({ q: "", language: "", genre: "", year: "" })
          }
          className="text-sm font-semibold text-muted underline-offset-2 hover:text-white hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
