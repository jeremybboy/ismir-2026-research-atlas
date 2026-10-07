import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { filterPapers, findRelatedPapers } from '../src/data.js';
import { deterministicLayout, REGION_CENTERS } from '../src/map.js';

const readJson = async (name) => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const [papers, topics] = await Promise.all([readJson('papers'), readJson('topics')]);
const topicsById = new Map(topics.map((topic) => [topic.id, topic]));

test('snapshot has stable unique records', () => {
  assert.equal(papers.length, 140);
  assert.equal(new Set(papers.map((paper) => paper.id)).size, 140);
  assert.deepEqual(papers.map((paper) => paper.sourceOrder), Array.from({ length: 140 }, (_, index) => index + 1));
});

test('search spans title, author, topic, and tags', () => {
  assert.equal(filterPapers(papers, topicsById, { query: 'OudTabs' }).length, 1);
  assert.ok(filterPapers(papers, topicsById, { query: 'Li Su' }).length > 1);
  assert.ok(filterPapers(papers, topicsById, { query: 'source separation' }).length > 1);
  assert.ok(filterPapers(papers, topicsById, { topic: 'evaluation-culture' }).every((paper) => paper.primaryTopic === 'evaluation-culture'));
});

test('related papers expose shared tags rather than title-distance claims', () => {
  const selected = papers.find((paper) => paper.title.startsWith('Diff2Mix'));
  const related = findRelatedPapers(selected, papers);
  assert.ok(related.length > 0);
  assert.ok(related.every(({ shared }) => shared.length > 0));
});

test('layout is deterministic and isolates topics', () => {
  const first = [...deterministicLayout(papers, topics).entries()];
  const second = [...deterministicLayout(papers, topics).entries()];
  assert.deepEqual(first, second);
  const isolated = deterministicLayout(papers, topics, 'generation-collaboration');
  assert.ok([...isolated.keys()].every((id) => papers.find((paper) => paper.id === id).primaryTopic === 'generation-collaboration'));
});

test('region centers form a stable five-part editorial field', () => {
  const transcription = REGION_CENTERS['transcription-analysis'];
  const generation = REGION_CENTERS['generation-collaboration'];
  const representations = REGION_CENTERS['representations-discovery'];
  const production = REGION_CENTERS['production-transformation'];
  const evaluation = REGION_CENTERS['evaluation-culture'];

  assert.ok(transcription[0] < representations[0] && transcription[1] < representations[1]);
  assert.ok(generation[0] > representations[0] && generation[1] < representations[1]);
  assert.ok(production[0] < representations[0] && production[1] > representations[1]);
  assert.ok(evaluation[0] > representations[0] && evaluation[1] > representations[1]);
});
