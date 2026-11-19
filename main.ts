// Vice Cover Lab — hand-in program for gta6-cover-art-01 (Node 22, stdlib only).
//
// The entry itself is the static web app under app/ (open app/index.html in a
// browser, no build step, no network). This program copies app/ and
// screenshots/ into the output directory and writes dossier.json there with
// the kit's vendored library, so the grader sees exactly the files the judge
// will read about.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });

const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// Caps mirror the gate: dossier text capped at 160 KiB, at most 4 screenshots
// of 256 KiB each, app/ at most 993 entries / 48 MiB, no app path over
// 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`vice-cover-lab: app/ + screenshots/ copied to ${outDir}, dossier.json ${dossier.length} bytes`);
