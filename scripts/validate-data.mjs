import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [papers, topics, trails, metadata, snapshot] = await Promise.all([
  readJson('data/papers.json'),
  readJson('data/topics.json'),
  readJson('data/trails.json'),
  readJson('data/source-metadata.json'),
  readJson('data/source-snapshot.json'),
]);

const errors = [];
const ids = new Set();
const titles = new Set();
const topicIds = new Set(topics.map((topic) => topic.id));
const normalizeTitle = (title) => title.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();

papers.forEach((paper, index) => {
  const location = `papers[${index}]`;
  if (!paper.id || ids.has(paper.id)) errors.push(`${location}: missing or duplicate id “${paper.id}”`);
  ids.add(paper.id);
  const normalizedTitle = normalizeTitle(paper.title ?? '');
  if (!normalizedTitle || titles.has(normalizedTitle)) errors.push(`${location}: missing or duplicate normalized title “${paper.title}”`);
  titles.add(normalizedTitle);
  if (!topicIds.has(paper.primaryTopic)) errors.push(`${location}: invalid topic “${paper.primaryTopic}”`);
  if (!Array.isArray(paper.authors) || paper.authors.length === 0 || paper.authors.some((author) => !author.name)) errors.push(`${location}: non-empty author list required`);
  if (!Array.isArray(paper.conceptTags) || paper.conceptTags.length === 0) errors.push(`${location}: concept tags required`);
  if (paper.classificationBasis !== 'title-and-metadata-inference') errors.push(`${location}: classification basis missing`);
  if (paper.sourceOrder !== index + 1) errors.push(`${location}: source ordering is not stable`);
});

trails.forEach((trail) => {
  if (!trail.id || !trail.title || !trail.premise || trail.paperIds.length < 3) errors.push(`trail ${trail.id}: incomplete curated trail`);
  trail.paperIds.forEach((paperId) => {
    if (!ids.has(paperId)) errors.push(`trail ${trail.id}: unknown paper “${paperId}”`);
  });
});

if (metadata.totalPapers !== papers.length || snapshot.totalPapers !== papers.length) errors.push('source metadata totals do not match papers.json');
if (!metadata.sourceUrl || !metadata.retrievedAt || !metadata.sourceSha256) errors.push('source metadata is incomplete');
if (metadata.reconciliation.missingFromOfficial.length > 0 || metadata.reconciliation.changedTitles.length > 0) errors.push('unresolved supplied-list discrepancy');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${papers.length} unique papers, ${topics.length} topics, and ${trails.length} trails.`);
