import assert from 'node:assert/strict';
import test from 'node:test';
import { loadQueue, parseHash, saveQueue, serializeHash, toggleQueue } from '../src/state.js';

test('shareable state round-trips through the URL hash', () => {
  const state = parseHash('#paper=test-paper&topic=evaluation-culture&q=beat&trail=build-an-ai-band&step=2&page=3');
  assert.equal(state.selectedPaperId, 'test-paper');
  assert.equal(state.trailIndex, 2);
  assert.match(serializeHash(state), /paper=test-paper/);
  assert.match(serializeHash(state), /q=beat/);
});

test('queue toggles and persists without duplicates', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const queue = toggleQueue([], 'paper-a');
  saveQueue(queue, storage);
  assert.deepEqual(loadQueue(storage), ['paper-a']);
  assert.deepEqual(toggleQueue(queue, 'paper-a'), []);
});
