/**
 * Parse and repair watched dates from the Google Sheet export.
 * Incomplete "d/m" rows get a year inferred from neighboring full dates.
 */

export type SheetDateParse = {
  watchedAt: string | null;
  watchedRaw: string;
  inferred: boolean;
  unresolved: boolean;
};

type Working = {
  index: number;
  title: string;
  original: string;
  day: number | null;
  month: number | null;
  year: number | null;
  iso: string | null;
  /** True if the sheet already had a usable full date (not inferred). */
  fromSheet: boolean;
  inferred: boolean;
  unresolved: boolean;
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (
    d.getFullYear() !== year ||
    d.getMonth() + 1 !== month ||
    d.getDate() !== day
  ) {
    return null;
  }
  return iso;
}

function isoToOrdinal(iso: string): number {
  return new Date(`${iso}T12:00:00`).getTime();
}

/** Fix glued typos like "07/112018" → day=7, month=11, year=2018 */
function repairGluedDate(raw: string): { day: number; month: number; year: number } | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{2})(20\d{2})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (!toIso(year, month, day)) return null;
  return { day, month, year };
}

function parseParts(raw: string): {
  day: number | null;
  month: number | null;
  year: number | null;
  iso: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { day: null, month: null, year: null, iso: null };
  }

  const glued = repairGluedDate(trimmed);
  if (glued) {
    return {
      day: glued.day,
      month: glued.month,
      year: glued.year,
      iso: toIso(glued.year, glued.month, glued.day),
    };
  }

  const parts = trimmed.split(/[/-]/).map((p) => p.trim());

  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (c.length === 2) c = `20${c}`;
    const day = Number(a);
    const month = Number(b);
    const year = Number(c);
    return {
      day,
      month,
      year,
      iso: toIso(year, month, day),
    };
  }

  if (parts.length === 2) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return { day, month, year: null, iso: null };
    }
  }

  return { day: null, month: null, year: null, iso: null };
}

/** Prefer originally-full sheet dates so out-of-order partials don't block each other. */
function findPrevIso(
  rows: Working[],
  i: number,
  opts: { sheetOnly?: boolean } = {}
): string | null {
  for (let j = i - 1; j >= 0; j--) {
    if (!rows[j].iso) continue;
    if (opts.sheetOnly && !rows[j].fromSheet) continue;
    return rows[j].iso;
  }
  return null;
}

function findNextIso(
  rows: Working[],
  i: number,
  opts: { sheetOnly?: boolean } = {}
): string | null {
  for (let j = i + 1; j < rows.length; j++) {
    if (!rows[j].iso) continue;
    if (opts.sheetOnly && !rows[j].fromSheet) continue;
    return rows[j].iso;
  }
  return null;
}

function candidatesBetween(
  day: number,
  month: number,
  prev: string | null,
  next: string | null
): string[] {
  const years = new Set<number>();
  if (prev) {
    const y = Number(prev.slice(0, 4));
    years.add(y - 1);
    years.add(y);
    years.add(y + 1);
  }
  if (next) {
    const y = Number(next.slice(0, 4));
    years.add(y - 1);
    years.add(y);
    years.add(y + 1);
  }
  if (!years.size) {
    for (let y = 2018; y <= 2026; y++) years.add(y);
  }

  const prevT = prev ? isoToOrdinal(prev) : null;
  const nextT = next ? isoToOrdinal(next) : null;
  // If neighbors are out of order (sheet typo), don't enforce both bounds.
  const ordered = prevT !== null && nextT !== null ? prevT <= nextT : true;

  const out: string[] = [];
  for (const y of [...years].sort((a, b) => a - b)) {
    const iso = toIso(y, month, day);
    if (!iso) continue;
    const t = isoToOrdinal(iso);
    if (ordered) {
      if (prevT !== null && t < prevT) continue;
      if (nextT !== null && t > nextT) continue;
    } else if (prevT !== null) {
      // Prefer continuing forward from previous watch
      if (t < prevT) continue;
    }
    out.push(iso);
  }
  return out;
}

function pickCandidate(
  cands: string[],
  prev: string | null,
  next: string | null
): string | null {
  if (!cands.length) return null;
  if (cands.length === 1) return cands[0];

  const years = new Set(cands.map((c) => c.slice(0, 4)));
  if (years.size === 1) return cands[0];

  if (prev && next) {
    const prevT = isoToOrdinal(prev);
    const nextT = isoToOrdinal(next);
    if (prevT <= nextT) {
      const mid = prevT + (nextT - prevT) / 2;
      return cands.reduce((best, cur) =>
        Math.abs(isoToOrdinal(cur) - mid) < Math.abs(isoToOrdinal(best) - mid)
          ? cur
          : best
      );
    }
    // Disordered neighbors: stick with previous year progression
    const afterPrev = cands.filter((c) => isoToOrdinal(c) >= prevT);
    return afterPrev[0] || cands[0];
  }

  if (prev) {
    const prevT = isoToOrdinal(prev);
    return cands.find((c) => isoToOrdinal(c) >= prevT) || cands[0];
  }
  if (next) {
    const nextT = isoToOrdinal(next);
    return [...cands].reverse().find((c) => isoToOrdinal(c) <= nextT) || cands[0];
  }
  return cands[0];
}

/**
 * Given sheet rows in order, return watchedAt / watchedRaw for each,
 * inferring year for dd/mm-only dates from neighbors.
 */
export function resolveSheetDates(
  rows: { title: string; date: string }[]
): SheetDateParse[] {
  const working: Working[] = rows.map((row, index) => {
    const parsed = parseParts(row.date);
    const glued = repairGluedDate(row.date.trim());
    const fromSheet = Boolean(parsed.iso && !glued);
    return {
      index,
      title: row.title,
      original: row.date.trim(),
      day: parsed.day,
      month: parsed.month,
      year: parsed.year,
      iso: parsed.iso,
      fromSheet,
      inferred: Boolean(glued && parsed.iso),
      unresolved: false,
    };
  });

  // Infer using only original full sheet dates as bounds (partials can be out of order).
  for (let i = 0; i < working.length; i++) {
    const row = working[i];
    if (row.iso || row.day === null || row.month === null) continue;

    const prev = findPrevIso(working, i, { sheetOnly: true });
    const next = findNextIso(working, i, { sheetOnly: true });
    const cands = candidatesBetween(row.day, row.month, prev, next);
    const picked = pickCandidate(cands, prev, next);
    if (picked) {
      row.iso = picked;
      row.year = Number(picked.slice(0, 4));
      row.inferred = true;
    }
  }

  // Second chance: allow any resolved neighbor, then prev-year forward fill
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < working.length; i++) {
      const row = working[i];
      if (row.iso || row.day === null || row.month === null) continue;

      const prev = findPrevIso(working, i);
      const next = findNextIso(working, i);
      const cands = candidatesBetween(row.day, row.month, prev, next);
      let picked = pickCandidate(cands, prev, next);

      if (!picked && prev) {
        const py = Number(prev.slice(0, 4));
        for (const y of [py, py + 1]) {
          const iso = toIso(y, row.month, row.day);
          if (!iso) continue;
          if (next && isoToOrdinal(prev) <= isoToOrdinal(next)) {
            if (isoToOrdinal(iso) > isoToOrdinal(next)) continue;
            if (isoToOrdinal(iso) < isoToOrdinal(prev)) continue;
          }
          picked = iso;
          break;
        }
      }

      // Last resort within sheet-only window even if before immediate prev partial
      if (!picked) {
        const sheetPrev = findPrevIso(working, i, { sheetOnly: true });
        const sheetNext = findNextIso(working, i, { sheetOnly: true });
        if (sheetPrev && sheetNext) {
          const loose = candidatesBetween(row.day, row.month, sheetPrev, sheetNext);
          // Relax: ignore lower bound from prev if day is slightly out of order
          const years = [
            Number(sheetPrev.slice(0, 4)),
            Number(sheetNext.slice(0, 4)),
          ];
          for (const y of [...new Set(years)]) {
            const iso = toIso(y, row.month, row.day);
            if (!iso) continue;
            if (
              isoToOrdinal(iso) >= isoToOrdinal(sheetPrev) &&
              isoToOrdinal(iso) <= isoToOrdinal(sheetNext)
            ) {
              picked = iso;
              break;
            }
          }
          if (!picked && loose.length) picked = loose[0];
          // Absolute last resort: same year as previous full date if still inside window years
          if (!picked) {
            const y = Number(sheetPrev.slice(0, 4));
            const iso = toIso(y, row.month, row.day);
            if (
              iso &&
              isoToOrdinal(iso) <= isoToOrdinal(sheetNext) &&
              isoToOrdinal(iso) >= isoToOrdinal(sheetPrev) - 1000 * 60 * 60 * 24 * 45
            ) {
              // allow up to ~45 days before prev full within same cluster
              picked = iso;
            } else if (iso && Number(sheetNext.slice(0, 4)) === y) {
              picked = iso;
            }
          }
        }
      }

      if (picked) {
        row.iso = picked;
        row.year = Number(picked.slice(0, 4));
        row.inferred = true;
      }
    }
  }

  for (const row of working) {
    if (!row.iso && row.day !== null && row.month !== null) {
      row.unresolved = true;
    }
  }

  return working.map((row) => {
    if (row.iso) {
      const [y, m, d] = row.iso.split("-");
      return {
        watchedAt: row.iso,
        watchedRaw: `${Number(d)}/${Number(m)}/${y}`,
        inferred: row.inferred,
        unresolved: false,
      };
    }
    return {
      watchedAt: null,
      watchedRaw: row.original,
      inferred: false,
      unresolved: row.unresolved,
    };
  });
}

export function listUnresolvedSheetDates(
  rows: { title: string; date: string }[]
): { title: string; date: string; index: number }[] {
  const resolved = resolveSheetDates(rows);
  const out: { title: string; date: string; index: number }[] = [];
  resolved.forEach((r, index) => {
    if (r.unresolved) {
      out.push({ title: rows[index].title, date: rows[index].date, index });
    }
  });
  return out;
}
