const GENRE_MAP: Record<string, string> = {
  "sci-fi": "Sci-Fi",
  scifi: "Sci-Fi",
  "sci fi": "Sci-Fi",
  romantic: "Romance",
  romance: "Romance",
  documentry: "Documentary",
  documentary: "Documentary",
  comedy: "Comedy",
  action: "Action",
  fantasy: "Fantasy",
  drama: "Drama",
  horror: "Horror",
  thriller: "Thriller",
  adventure: "Adventure",
  war: "War",
  animation: "Animation",
  crime: "Crime",
  fiction: "Fiction",
  musical: "Musical",
  mystery: "Mystery",
  western: "Western",
  "wild west": "Western",
};

export function normalizeGenreToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase();
  if (GENRE_MAP[key]) return GENRE_MAP[key];
  return trimmed
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(trimmed.includes("-") ? "-" : " ");
}

export function normalizeGenres(raw: string): string {
  return raw
    .split(",")
    .map(normalizeGenreToken)
    .filter(Boolean)
    .join(", ");
}

export function parseGenresList(genres: string): string[] {
  return genres
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/**
 * Title Case for movie names: "my name is annappa" → "My Name Is Annappa".
 * Keeps short all-caps tokens (KGF, UI), digit-led tokens (2.0, 65),
 * and small words (vs., the, of…) lowercase except at the start/end.
 */
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "onto",
  "or",
  "per",
  "the",
  "to",
  "vs",
  "vs.",
  "v/s",
  "via",
  "with",
]);

export function toTitleCase(title: string): string {
  const words = title.trim().replace(/\s+/g, " ").split(" ");
  return words
    .map((word, index) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,5}$/.test(word)) return word;
      if (/^\d/.test(word)) return word;

      const lower = word.toLowerCase();
      const isEdge = index === 0 || index === words.length - 1;
      if (!isEdge && SMALL_WORDS.has(lower)) {
        return lower === "v/s" || lower === "vs" ? "vs." : lower;
      }

      return word
        .split("-")
        .map((part) => {
          if (!part) return part;
          if (/^[A-Z0-9]{2,5}$/.test(part)) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("-");
    })
    .join(" ");
}

/**
 * Parse sheet dates. Prefer DD/MM/YYYY (common in the export).
 * Incomplete dates like "6/10" return null ISO and keep raw.
 */
export function parseWatchedDate(raw: string): {
  watchedAt: string | null;
  watchedRaw: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { watchedAt: null, watchedRaw: "" };

  // HTML date inputs and ISO storage use YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const [y, m, day] = trimmed.split("-");
      return {
        watchedAt: trimmed,
        watchedRaw: `${Number(day)}/${Number(m)}/${y}`,
      };
    }
  }

  const parts = trimmed.split(/[/-]/).map((p) => p.trim());

  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (c.length === 2) c = `20${c}`;
    const day = Number(a);
    const month = Number(b);
    const year = Number(c);
    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12 &&
      year >= 1900
    ) {
      const iso = `${year.toString().padStart(4, "0")}-${month
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const d = new Date(`${iso}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        return { watchedAt: iso, watchedRaw: trimmed };
      }
    }
  }

  return { watchedAt: null, watchedRaw: trimmed };
}

/** Local calendar date as YYYY-MM-DD (for `<input type="date">`). */
export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize stored watched fields into a date-input value. */
export function toDateInputValue(
  watchedAt: string | null | undefined,
  watchedRaw: string | null | undefined
): string {
  if (watchedAt && /^\d{4}-\d{2}-\d{2}$/.test(watchedAt)) return watchedAt;
  if (watchedRaw) {
    const parsed = parseWatchedDate(watchedRaw);
    if (parsed.watchedAt) return parsed.watchedAt;
  }
  return "";
}

export function watchedYear(watchedAt: string | null, watchedRaw: string | null): string | null {
  if (watchedAt) return watchedAt.slice(0, 4);
  if (watchedRaw) {
    const m = watchedRaw.match(/(20\d{2}|\d{4})/);
    if (m) return m[1].length === 2 ? `20${m[1]}` : m[1];
  }
  return null;
}

export function formatWatchedDisplay(
  watchedAt: string | null,
  watchedRaw: string | null
): string {
  if (watchedAt) {
    const [y, m, d] = watchedAt.split("-");
    return `${d}/${m}/${y}`;
  }
  return watchedRaw || "Unknown date";
}

export function posterUrl(posterPath: string | null, size = "w500"): string | null {
  if (!posterPath) return null;
  if (posterPath.startsWith("http")) return posterPath;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

export function profileUrl(
  profilePath: string | null,
  size = "w185"
): string | null {
  return posterUrl(profilePath, size);
}
