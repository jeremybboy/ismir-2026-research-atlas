export async function loadAtlasData() {
  const base = import.meta.env?.BASE_URL ?? '/';
  const load = async (name) => {
    const response = await fetch(`${base}data/${name}.json`);
    if (!response.ok) throw new Error(`Unable to load ${name}.json (${response.status})`);
    return response.json();
  };
  const [papers, topics, trails, sourceMetadata] = await Promise.all([
    load('papers'), load('topics'), load('trails'), load('source-metadata'),
  ]);
  return { papers, topics, trails, sourceMetadata };
}

export function searchableText(paper, topic) {
  return [
    paper.title,
    ...paper.authors.flatMap((author) => [author.name, author.affiliation ?? '']),
    topic?.label ?? '',
    topic?.shortLabel ?? '',
    ...paper.conceptTags,
  ].join(' ').normalize('NFKD').toLocaleLowerCase('en');
}

export function filterPapers(papers, topicsById, { topic = 'all', query = '' } = {}) {
  const normalizedQuery = query.trim().normalize('NFKD').toLocaleLowerCase('en');
  return papers.filter((paper) => {
    const topicMatch = topic === 'all' || paper.primaryTopic === topic;
    const searchMatch = !normalizedQuery || searchableText(paper, topicsById.get(paper.primaryTopic)).includes(normalizedQuery);
    return topicMatch && searchMatch;
  });
}

export function sharedConcepts(first, second) {
  const secondTags = new Set(second.conceptTags);
  return first.conceptTags.filter((tag) => secondTags.has(tag));
}

export function findRelatedPapers(selected, papers, limit = 4) {
  if (!selected) return [];
  return papers
    .filter((paper) => paper.id !== selected.id)
    .map((paper) => ({ paper, shared: sharedConcepts(selected, paper) }))
    .filter(({ shared }) => shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || a.paper.sourceOrder - b.paper.sourceOrder)
    .slice(0, limit);
}
