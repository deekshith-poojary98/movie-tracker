import fs from "fs";
import {
  listUnresolvedSheetDates,
  resolveSheetDates,
} from "../src/lib/sheetDates";

function decode(t: string) {
  return t.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

const html = fs.readFileSync("Watched movies list/sheet.html", "utf8");
const rowsHtml = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
const rows: { title: string; date: string }[] = [];

for (const row of rowsHtml) {
  const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map(
    (c) =>
      decode(
        c
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      )
  );
  if (cells.length < 6) continue;
  if (!/^\d+$/.test(cells[1] || "")) continue;
  if (!cells[3]) continue;
  rows.push({ date: cells[2], title: cells[3] });
}

const resolved = resolveSheetDates(rows);
const unresolved = listUnresolvedSheetDates(rows);
console.log(
  `inferred=${resolved.filter((r) => r.inferred).length} unresolved=${unresolved.length}`
);
for (const name of ["Pyaar ka panchnaam", "My summer of love"]) {
  const i = rows.findIndex((r) => r.title === name);
  console.log(name, rows[i].date, "=>", resolved[i]);
}
if (unresolved.length) {
  for (const u of unresolved) console.log("UNRESOLVED", u.title, u.date);
}
