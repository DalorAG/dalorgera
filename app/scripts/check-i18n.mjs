// Checks that every language has exactly the keys of German (the source), per namespace.
// Plural forms differ per language (ru has _few/_many), so _one/_few/_many/_other count as one key.
//   node scripts/check-i18n.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/locales/', import.meta.url).pathname;
const SOURCE = 'de';
const PLURAL = /_(zero|one|two|few|many|other)$/;

function keys(value, prefix = '') {
  if (typeof value !== 'object' || value === null) return [prefix.replace(PLURAL, '')];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

const load = (lang, file) => new Set(keys(JSON.parse(readFileSync(join(root, lang, file), 'utf8'))));

let failed = false;
const files = readdirSync(join(root, SOURCE)).filter((f) => f.endsWith('.json'));
for (const lang of readdirSync(root).filter((l) => l !== SOURCE)) {
  for (const file of files) {
    const source = load(SOURCE, file);
    let target;
    try {
      target = load(lang, file);
    } catch {
      console.error(`${lang}/${file}: missing`);
      failed = true;
      continue;
    }
    const missing = [...source].filter((k) => !target.has(k));
    const extra = [...target].filter((k) => !source.has(k));
    for (const k of missing) console.error(`${lang}/${file}: missing ${k}`);
    for (const k of extra) console.error(`${lang}/${file}: not in ${SOURCE}: ${k}`);
    if (missing.length || extra.length) failed = true;
  }
}
if (failed) process.exit(1);
console.log('i18n: all languages have the same keys');
