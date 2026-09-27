import { getDb } from "../src/lib/db";
import { toTitleCase } from "../src/lib/normalize";

const db = getDb();
const rows = db
  .prepare("SELECT id, title FROM movies")
  .all() as { id: number; title: string }[];
const upd = db.prepare(
  "UPDATE movies SET title = ?, updated_at = datetime('now') WHERE id = ?"
);

let n = 0;
const tx = db.transaction(() => {
  for (const r of rows) {
    const next = toTitleCase(r.title);
    if (next !== r.title) {
      upd.run(next, r.id);
      n++;
    }
  }
});
tx();

console.log(`Title-cased ${n} of ${rows.length} movies`);
console.log(
  db
    .prepare("SELECT title FROM movies WHERE lower(title) LIKE '%annappa%'")
    .all()
);
