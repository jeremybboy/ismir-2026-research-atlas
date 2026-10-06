const QUEUE_KEY = 'ismir-2026-research-atlas:reading-queue:v1';

export function parseHash(hash = window.location.hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const parsedIndex = Number.parseInt(params.get('step') ?? '0', 10);
  return {
    selectedPaperId: params.get('paper') ?? '',
    topic: params.get('topic') ?? 'all',
    query: params.get('q') ?? '',
    trailId: params.get('trail') ?? '',
    trailIndex: Number.isFinite(parsedIndex) ? parsedIndex : 0,
    page: Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

export function serializeHash(state) {
  const params = new URLSearchParams();
  if (state.selectedPaperId) params.set('paper', state.selectedPaperId);
  if (state.topic !== 'all') params.set('topic', state.topic);
  if (state.query) params.set('q', state.query);
  if (state.trailId) {
    params.set('trail', state.trailId);
    params.set('step', String(state.trailIndex));
  }
  if (state.page > 1) params.set('page', String(state.page));
  return params.toString();
}

export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function loadQueue(storage = window.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === 'string'))] : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue, storage = window.localStorage) {
  storage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function toggleQueue(queue, paperId) {
  return queue.includes(paperId) ? queue.filter((id) => id !== paperId) : [...queue, paperId];
}
