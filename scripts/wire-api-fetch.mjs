/**
 * After `orval`, replace raw `fetch` with `apiFetch` from `src/api/client.ts`
 * and ensure the import exists (Orval does not emit this without a live mutator run).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const generated = path.join(root, 'src/api/generated');

function wireFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  if (!s.includes('await fetch(')) return false;

  if (!s.includes("from '../../client'")) {
    s = s.replace(
      /(\*\/\n)/,
      "$1import { apiFetch } from '../../client';\n",
    );
  }
  s = s.replace(/await fetch\(/g, 'await apiFetch(');
  fs.writeFileSync(filePath, s);
  return true;
}

for (const name of fs.readdirSync(generated)) {
  const dir = path.join(generated, name);
  if (!fs.statSync(dir).isDirectory() || name === 'models') continue;
  const p = path.join(dir, `${name}.ts`);
  if (fs.existsSync(p) && wireFile(p)) {
    console.log('wired', path.relative(root, p));
  }
}
