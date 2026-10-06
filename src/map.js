import { select } from 'd3';

const CENTERS = [
  [175, 150],
  [480, 130],
  [345, 320],
  [170, 455],
  [690, 425],
];

export function deterministicLayout(papers, topics, isolatedTopic = 'all') {
  const topicIndex = new Map(topics.map((topic, index) => [topic.id, index]));
  const groups = new Map(topics.map((topic) => [topic.id, []]));
  papers.forEach((paper) => groups.get(paper.primaryTopic)?.push(paper));
  const positions = new Map();

  groups.forEach((group, topicId) => {
    group.sort((a, b) => a.id.localeCompare(b.id));
    const isolated = isolatedTopic !== 'all';
    if (isolated && topicId !== isolatedTopic) return;
    const center = isolated ? [450, 280] : CENTERS[topicIndex.get(topicId)];
    const columns = Math.ceil(Math.sqrt(group.length));
    const spacing = isolated ? 34 : 22;
    const rows = Math.ceil(group.length / columns);
    group.forEach((paper, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      positions.set(paper.id, {
        x: center[0] + (column - (columns - 1) / 2) * spacing,
        y: center[1] + (row - (rows - 1) / 2) * spacing,
        topicId,
      });
    });
  });
  return positions;
}

function marker(topic, size, selected) {
  const half = size / 2;
  const common = `fill="${topic.color}" stroke="${selected ? '#111514' : 'transparent'}" stroke-width="${selected ? 4 : 0}"`;
  if (topic.marker === 'circle') return `<circle cx="0" cy="0" r="${half}" ${common}/>`;
  if (topic.marker === 'diamond') return `<polygon points="0,-${half + 1} ${half + 1},0 0,${half + 1} -${half + 1},0" ${common}/>`;
  if (topic.marker === 'triangle') return `<polygon points="0,-${half + 2} ${half + 2},${half + 1} -${half + 2},${half + 1}" ${common}/>`;
  if (topic.marker === 'cross') return `<path d="M-${half},-${half / 3}H-${half / 3}V-${half}H${half / 3}V-${half / 3}H${half}V${half / 3}H${half / 3}V${half}H-${half / 3}V${half / 3}H-${half}Z" ${common}/>`;
  return `<rect x="-${half}" y="-${half}" width="${size}" height="${size}" ${common}/>`;
}

export function renderMap({ svg, papers, topics, selectedPaper, related, activeTopic, onSelect, preview }) {
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const layout = deterministicLayout(papers, topics, activeTopic);
  const relatedIds = new Set(related.map(({ paper }) => paper.id));
  const selectedPosition = selectedPaper ? layout.get(selectedPaper.id) : null;
  const visiblePapers = papers.filter((paper) => layout.has(paper.id));
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
  const root = select(svg);
  const labelLayer = root.selectAll('g.map-labels').data([null]).join('g').attr('class', 'map-labels').attr('aria-hidden', 'true');
  const lineLayer = root.selectAll('g.map-lines').data([null]).join('g').attr('class', 'map-lines').attr('aria-hidden', 'true');
  const pointLayer = root.selectAll('g.map-points').data([null]).join('g').attr('class', 'map-points');

  const labelData = topics.filter((topic) => activeTopic === 'all' || topic.id === activeTopic).map((topic) => {
    const index = topics.findIndex(({ id }) => id === topic.id);
    const [x, y] = activeTopic === 'all' ? CENTERS[index] : [450, 82];
    return {
      ...topic,
      x,
      y: y - (activeTopic === 'all' ? 112 : 0),
      count: visiblePapers.filter((paper) => paper.primaryTopic === topic.id).length,
    };
  });
  labelLayer.selectAll('g.region-label').data(labelData, (topic) => topic.id).join(
    (enter) => enter.append('g').attr('class', 'region-label').attr('opacity', 0),
    (update) => update,
    (exit) => exit.remove(),
  ).html((topic) => `<text text-anchor="middle">${escapeHtml(topic.shortLabel)}</text><text class="region-count" y="21" text-anchor="middle">${topic.count} papers</text>`)
    .transition().duration(duration).attr('opacity', 1).attr('transform', (topic) => `translate(${topic.x} ${topic.y})`);

  const lineData = selectedPosition ? related.filter(({ paper }) => layout.has(paper.id)).map(({ paper }) => ({
    id: paper.id,
    x1: selectedPosition.x,
    y1: selectedPosition.y,
    x2: layout.get(paper.id).x,
    y2: layout.get(paper.id).y,
  })) : [];
  lineLayer.selectAll('line.connection').data(lineData, (line) => line.id).join('line').attr('class', 'connection')
    .transition().duration(duration)
    .attr('x1', (line) => line.x1).attr('y1', (line) => line.y1).attr('x2', (line) => line.x2).attr('y2', (line) => line.y2);

  const points = pointLayer.selectAll('g.paper-point').data(visiblePapers, (paper) => paper.id).join(
    (enter) => enter.append('g').attr('class', 'paper-point').attr('opacity', 0),
    (update) => update,
    (exit) => exit.remove(),
  );
  points
    .attr('class', (paper) => `paper-point${selectedPaper?.id === paper.id ? ' is-selected' : ''}${relatedIds.has(paper.id) ? ' is-related' : ''}`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (paper) => `Select paper: ${paper.title}`)
    .attr('data-paper-id', (paper) => paper.id)
    .html((paper) => {
      const topic = topicsById.get(paper.primaryTopic);
      const selected = selectedPaper?.id === paper.id;
      return `<title>${escapeHtml(paper.title)}</title><rect class="hit-target" x="-15" y="-15" width="30" height="30" fill="transparent"/>${marker(topic, selected ? 18 : 12, selected)}`;
    })
    .on('click', (_, paper) => onSelect(paper.id))
    .on('keydown', (event, paper) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(paper.id);
      }
    })
    .on('pointerenter', (_, paper) => preview(paper.title))
    .on('focus', (_, paper) => preview(paper.title))
    .on('pointerleave', () => preview('Focus or select a point to reveal its full title.'))
    .on('blur', () => preview('Focus or select a point to reveal its full title.'))
    .transition().duration(duration).attr('opacity', 1).attr('transform', (paper) => {
      const point = layout.get(paper.id);
      return `translate(${point.x} ${point.y})`;
    });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}
