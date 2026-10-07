import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry);
    if ((await stat(target)).isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

const files = await walk('dist');
const requiredFiles = ['dist/data/papers.json', 'dist/data/topics.json', 'dist/data/trails.json', 'dist/data/source-metadata.json', 'dist/llms.txt', 'dist/robots.txt', 'dist/sitemap.xml'];
const missingRequired = [];
for (const requiredFile of requiredFiles) {
  try { await stat(requiredFile); } catch { missingRequired.push(requiredFile); }
}
if (missingRequired.length) {
  console.error(`Missing production files:\n${missingRequired.join('\n')}`);
  process.exit(1);
}
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const missing = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|#|data:)/.test(reference)) continue;
    const clean = reference.split(/[?#]/)[0].replace(/^\/ismir-2026-research-atlas\//, '');
    const target = path.join('dist', clean);
    try { await stat(target); } catch { missing.push(`${file}: ${reference}`); }
  }
}
if (missing.length) {
  console.error(`Broken internal links:\n${missing.join('\n')}`);
  process.exit(1);
}
console.log(`Checked ${htmlFiles.length} HTML file(s) and ${requiredFiles.length} required production files; no broken internal links.`);
