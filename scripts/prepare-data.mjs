// Cross-platform copy of generated /data files into /public/data so Vite
// serves them statically in both dev and build. Run automatically before
// `npm run dev` / `npm run build`.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "data");
const dest = join(root, "public", "data");

if (!existsSync(src)) {
  console.error(
    "\n[prepare-data] /data not found. Run `python generate_data.py` first.\n"
  );
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  if (/\.(csv|json)$/i.test(f)) {
    cpSync(join(src, f), join(dest, f));
    n++;
  }
}
console.log(`[prepare-data] copied ${n} data file(s) -> public/data`);
