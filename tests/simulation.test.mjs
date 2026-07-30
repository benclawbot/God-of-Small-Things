import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldSimulation, clamp, mulberry32 } from '../src/simulation.js';

test('clamp keeps values inside the requested range', () => {
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(4, 0, 10), 4);
});

test('seeded random generator is deterministic', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('simulation remains within safe stat bounds', () => {
  const simulation = new WorldSimulation(1234);
  simulation.speed = 8;
  for (let i = 0; i < 20000; i++) simulation.tick(1 / 60);
  const state = simulation.snapshot();
  for (const key of ['food', 'harmony', 'wonder', 'forest', 'soil', 'water']) {
    assert.ok(state[key] >= 0 && state[key] <= 100, `${key} out of range`);
  }
  assert.ok(state.population >= 4);
  assert.ok(state.year > 1);
});

test('powers create meaningful trade-offs', () => {
  const simulation = new WorldSimulation(7);
  const beforeForest = simulation.forest;
  simulation.usePower('forest');
  assert.ok(simulation.forest > beforeForest);

  const beforeHarmony = simulation.harmony;
  simulation.usePower('storm');
  assert.ok(simulation.harmony < beforeHarmony);
  assert.equal(simulation.weather, 'storm');
});

test('settlements add homes as the civilization grows', () => {
  const simulation = new WorldSimulation(99);
  simulation.population = 150;
  simulation.food = 100;
  simulation.speed = 8;
  const initial = simulation.settlements.reduce((sum, settlement) => sum + settlement.houses, 0);
  for (let i = 0; i < 6000; i++) simulation.tick(1 / 60);
  const current = simulation.settlements.reduce((sum, settlement) => sum + settlement.houses, 0);
  assert.ok(current > initial);
});
