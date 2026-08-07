// Sprint board export as CSV.
//
// TDD data deliverable D5 names the format as "PDF/CSV". The board is
// maintained as a Markdown table, which is right for reading and wrong for
// anyone who wants to load the rows; this emits the same table as CSV so both
// halves of the stated format exist.
//
//   node scripts/board-export-csv.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'project', 'acceptance', 'board_export_final.md');
const OUT = path.join(ROOT, 'project', 'delivery', 'board_export_final.csv');

const rows = fs
  .readFileSync(SRC, 'utf8')
  .split('\n')
  .filter((l) => l.trim().startsWith('|'))
  // Drop the alignment row (|---|---|) — it is table syntax, not data.
  .filter((l) => !/^\s*\|[\s|:-]+\|\s*$/.test(l))
  .map((l) =>
    l
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim()),
  );

if (!rows.length) throw new Error(`no table rows found in ${SRC}`);

const csv = rows
  .map((cells) =>
    cells
      // Quote anything containing a delimiter, quote or newline; double the quotes.
      .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
      .join(','),
  )
  .join('\n');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, csv + '\n');
console.log(`${path.relative(ROOT, OUT)} — ${rows.length - 1} rows`);
