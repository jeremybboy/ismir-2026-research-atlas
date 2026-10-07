import './styles.css';
import { filterPapers, findRelatedPapers, loadAtlasData } from './data.js';
import { renderMap } from './map.js';
import { createStore, loadQueue, parseHash, saveQueue, serializeHash, toggleQueue } from './state.js';

const PAGE_SIZE = 8;
const data = await loadAtlasData();
const papersById = new Map(data.papers.map((paper) => [paper.id, paper]));
const topicsById = new Map(data.topics.map((topic) => [topic.id, topic]));
const trailsById = new Map(data.trails.map((trail) => [trail.id, trail]));
const initialHash = parseHash();
const store = createStore({
  ...initialHash,
  selectedPaperId: papersById.has(initialHash.selectedPaperId) ? initialHash.selectedPaperId : data.papers[0].id,
  topic: initialHash.topic === 'all' || topicsById.has(initialHash.topic) ? initialHash.topic : 'all',
  queue: loadQueue(),
  playing: false,
});

const byId = (id) => document.getElementById(id);
const elements = {
  topicFilters: byId('topic-filters'), trailSelect: byId('trail-select'), trailPremise: byId('trail-premise'),
  previousTrail: byId('trail-previous'), nextTrail: byId('trail-next'), playTrail: byId('trail-play'), pauseTrail: byId('trail-pause'),
  search: byId('search'), map: byId('paper-map'), mapCount: byId('map-result-count'), mapPreview: byId('map-title-preview'),
  detail: byId('paper-detail'), list: byId('paper-list'), listCount: byId('list-result-count'), pageStatus: byId('page-status'),
  previousPage: byId('page-previous'), nextPage: byId('page-next'), queueList: byId('queue-list'), queueEmpty: byId('queue-empty'),
  queueExport: byId('queue-export'), announcement: byId('selection-announcement'), paperTotal: byId('paper-total'),
};

let playTimer = null;
let applyingHash = false;

function selectPaper(paperId, announcement = true) {
  const paper = papersById.get(paperId);
  if (!paper) return;
  store.set({ selectedPaperId: paperId });
  if (announcement) elements.announcement.textContent = `Selected ${paper.title}`;
}

function moveTrail(direction) {
  const state = store.get();
  const trail = trailsById.get(state.trailId);
  if (!trail) return;
  const trailIndex = (state.trailIndex + direction + trail.paperIds.length) % trail.paperIds.length;
  const selectedPaperId = trail.paperIds[trailIndex];
  store.set({ trailIndex, selectedPaperId, topic: 'all', page: 1 });
  elements.announcement.textContent = `Trail step ${trailIndex + 1}: ${papersById.get(selectedPaperId).title}`;
}

function stopTrail() {
  if (playTimer) window.clearInterval(playTimer);
  playTimer = null;
  if (store.get().playing) store.set({ playing: false });
}

function startTrail() {
  if (!trailsById.has(store.get().trailId)) return;
  stopTrail();
  store.set({ playing: true });
  playTimer = window.setInterval(() => moveTrail(1), 3200);
}

function renderTopicFilters(state, filtered) {
  const counts = new Map(data.topics.map((topic) => [topic.id, data.papers.filter((paper) => paper.primaryTopic === topic.id).length]));
  const button = (id, label, count, color, marker) => `<button type="button" class="topic-filter${state.topic === id ? ' is-active' : ''}" data-topic="${id}" aria-pressed="${state.topic === id}"><span class="topic-symbol marker-${marker}" style="--topic-color:${color}" aria-hidden="true"></span><span>${label}</span><span class="filter-count">${count}</span></button>`;
  elements.topicFilters.innerHTML = button('all', 'All topics', data.papers.length, '#252a28', 'all') + data.topics.map((topic) => button(topic.id, topic.shortLabel, counts.get(topic.id), topic.color, topic.marker)).join('');
  elements.topicFilters.querySelectorAll('button').forEach((node) => node.addEventListener('click', () => {
    stopTrail();
    store.set({ topic: node.dataset.topic, page: 1, trailId: '', trailIndex: 0 });
  }));
  elements.mapCount.textContent = `${filtered.length} visible`;
}

function renderDetail(state, selected, related) {
  const topic = topicsById.get(selected.primaryTopic);
  const queued = state.queue.includes(selected.id);
  const authors = selected.authors.map((author) => `<li><span>${escapeHtml(author.name)}</span>${author.affiliation ? `<span class="affiliation">${escapeHtml(author.affiliation)}</span>` : ''}</li>`).join('');
  const relatedMarkup = related.length ? related.map(({ paper, shared }) => `<li><button type="button" data-related-id="${paper.id}">${escapeHtml(paper.title)}</button><span>Shared title-level concepts: ${shared.map(formatTag).join(', ')}</span></li>`).join('') : '<li>No shared concept-tag links for this paper.</li>';
  elements.detail.innerHTML = `
    <div class="detail-rule" style="--topic-color:${topic.color}"></div>
    <p class="detail-topic"><span class="topic-symbol marker-${topic.marker}" style="--topic-color:${topic.color}" aria-hidden="true"></span>${escapeHtml(topic.label)} · title-derived</p>
    <h2 id="detail-title">${escapeHtml(selected.title)}</h2>
    <h3>Authors</h3><ul class="authors">${authors}</ul>
    <h3>Secondary concept tags</h3><ul class="tag-list">${selected.conceptTags.map((tag) => `<li>${formatTag(tag)}</li>`).join('')}</ul>
    <p><a href="${selected.sourceUrl}">View the verified accepted-papers source</a></p>
    <button id="queue-toggle" class="queue-toggle" type="button" aria-pressed="${queued}">${queued ? '− Remove from' : '+ Add to'} reading queue</button>
    <section class="related" aria-labelledby="related-heading"><h3 id="related-heading">Related by shared editorial tags</h3><p>These links are not citations, collaboration, influence, or measured similarity.</p><ul>${relatedMarkup}</ul></section>`;
  byId('queue-toggle').addEventListener('click', () => {
    const queue = toggleQueue(store.get().queue, selected.id);
    saveQueue(queue);
    store.set({ queue });
    elements.announcement.textContent = queue.includes(selected.id) ? 'Added to reading queue.' : 'Removed from reading queue.';
  });
  elements.detail.querySelectorAll('[data-related-id]').forEach((node) => node.addEventListener('click', () => selectPaper(node.dataset.relatedId)));
}

function renderList(state, filtered) {
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(state.page, pages);
  if (page !== state.page) {
    queueMicrotask(() => store.set({ page }));
    return;
  }
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  elements.list.innerHTML = slice.map((paper) => {
    const topic = topicsById.get(paper.primaryTopic);
    return `<li><button type="button" data-paper-id="${paper.id}"${paper.id === state.selectedPaperId ? ' aria-current="true"' : ''}><span class="topic-symbol marker-${topic.marker}" style="--topic-color:${topic.color}" aria-hidden="true"></span><span>${escapeHtml(paper.title)}</span></button></li>`;
  }).join('');
  elements.list.querySelectorAll('button').forEach((node) => node.addEventListener('click', () => selectPaper(node.dataset.paperId)));
  elements.listCount.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;
  elements.pageStatus.textContent = `Page ${page} of ${pages}`;
  elements.previousPage.disabled = page <= 1;
  elements.nextPage.disabled = page >= pages;
}

function renderQueue(state) {
  const queuedPapers = state.queue.map((id) => papersById.get(id)).filter(Boolean);
  elements.queueEmpty.hidden = queuedPapers.length > 0;
  elements.queueExport.disabled = queuedPapers.length === 0;
  elements.queueList.innerHTML = queuedPapers.map((paper) => `<li><button type="button" data-queue-paper="${paper.id}">${escapeHtml(paper.title)}</button><button type="button" data-remove-paper="${paper.id}" aria-label="Remove ${escapeHtml(paper.title)} from reading queue">Remove</button></li>`).join('');
  elements.queueList.querySelectorAll('[data-queue-paper]').forEach((node) => node.addEventListener('click', () => selectPaper(node.dataset.queuePaper)));
  elements.queueList.querySelectorAll('[data-remove-paper]').forEach((node) => node.addEventListener('click', () => {
    const queue = toggleQueue(store.get().queue, node.dataset.removePaper);
    saveQueue(queue);
    store.set({ queue });
  }));
}

function renderTrails(state) {
  elements.trailSelect.value = state.trailId;
  const trail = trailsById.get(state.trailId);
  elements.trailPremise.textContent = trail ? `${trail.premise} Curated exploration path, step ${state.trailIndex + 1} of ${trail.paperIds.length}.` : 'Choose a curated exploration path or explore freely.';
  const disabled = !trail;
  elements.previousTrail.disabled = disabled;
  elements.nextTrail.disabled = disabled;
  elements.playTrail.disabled = disabled;
  elements.playTrail.hidden = state.playing;
  elements.pauseTrail.hidden = !state.playing;
}

function render(state) {
  const filtered = filterPapers(data.papers, topicsById, state);
  const selected = papersById.get(state.selectedPaperId) ?? filtered[0] ?? data.papers[0];
  const related = findRelatedPapers(selected, data.papers);
  elements.search.value = state.query;
  renderTopicFilters(state, filtered);
  renderTrails(state);
  renderMap({
    svg: elements.map, papers: filtered, topics: data.topics, selectedPaper: selected, related,
    activeTopic: state.topic, onSelect: selectPaper, preview: (title) => { elements.mapPreview.textContent = title; },
  });
  renderDetail(state, selected, related);
  renderList(state, filtered);
  renderQueue(state);
  if (!applyingHash) {
    const serialized = serializeHash(state);
    if (window.location.hash.slice(1) !== serialized) history.replaceState(null, '', `${window.location.pathname}${window.location.search}${serialized ? `#${serialized}` : ''}`);
  }
}

elements.paperTotal.textContent = String(data.papers.length);
data.trails.forEach((trail) => elements.trailSelect.add(new Option(trail.title, trail.id)));
elements.trailSelect.addEventListener('change', () => {
  stopTrail();
  const trail = trailsById.get(elements.trailSelect.value);
  store.set({ trailId: trail?.id ?? '', trailIndex: 0, selectedPaperId: trail?.paperIds[0] ?? store.get().selectedPaperId, topic: 'all', page: 1 });
  if (trail) elements.announcement.textContent = `Started curated trail ${trail.title}: ${papersById.get(trail.paperIds[0]).title}`;
});
elements.previousTrail.addEventListener('click', () => moveTrail(-1));
elements.nextTrail.addEventListener('click', () => moveTrail(1));
elements.playTrail.addEventListener('click', startTrail);
elements.pauseTrail.addEventListener('click', stopTrail);
elements.search.addEventListener('input', () => store.set({ query: elements.search.value, page: 1 }));
elements.previousPage.addEventListener('click', () => store.set({ page: Math.max(1, store.get().page - 1) }));
elements.nextPage.addEventListener('click', () => store.set({ page: store.get().page + 1 }));
elements.queueExport.addEventListener('click', () => {
  const queuedPapers = store.get().queue.map((id) => papersById.get(id)).filter(Boolean).map(({ id, title, authors, primaryTopic, conceptTags, sourceUrl }) => ({ id, title, authors, primaryTopic, conceptTags, sourceUrl }));
  const blob = new Blob([`${JSON.stringify(queuedPapers, null, 2)}\n`], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ismir-2026-reading-queue.json';
  link.click();
  URL.revokeObjectURL(link.href);
});
window.addEventListener('hashchange', () => {
  applyingHash = true;
  stopTrail();
  store.set(parseHash());
  applyingHash = false;
});
store.subscribe(render);
render(store.get());

function formatTag(tag) { return escapeHtml(tag.replaceAll('-', ' ')); }
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
