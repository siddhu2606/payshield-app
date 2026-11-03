// Runs after npm install. @capacitor/cli 6 imports node-tar 6, which has known path-traversal advisories.
// package.json overrides it to tar 7 (fixed); this one-line shim makes the CLI's import work with tar 7's exports.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const f = 'node_modules/@capacitor/cli/dist/util/template.js';
if (existsSync(f)) {
  const src = readFileSync(f, 'utf8');
  const out = src.replace('tar_1.default.extract(', '(tar_1.default || tar_1).extract(');
  if (out !== src) { writeFileSync(f, out); console.log('patched @capacitor/cli for tar 7'); }
}
