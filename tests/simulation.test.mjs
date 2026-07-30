import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldSimulation, clamp, mulberry32 } from '../src/simulation.js';

test('clamp keeps values inside the requested range', () => {
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(4, 0, 10), 4);
});

test('seeded random generator is deterministic and serializable', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  const state = a.getState();
  const next = a();
  a.setState(state);
  assert.equal(a(), next);
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
  assert.ok(state.villagers.length >= 18 && state.villagers.length <= 64);
});

test('powers create meaningful trade-offs and chronicle entries', () => {
  const simulation = new WorldSimulation(7);
  const beforeForest = simulation.forest;
  simulation.usePower('forest');
  assert.ok(simulation.forest > beforeForest);

  const beforeHarmony = simulation.harmony;
  simulation.usePower('storm');
  assert.ok(simulation.harmony < beforeHarmony);
  assert.equal(simulation.weather, 'storm');
  assert.ok(simulation.snapshot().chronicle.some((entry) => entry.category === 'power'));
});

test('villagers react to scarcity through autonomous intents', () => {
  const simulation = new WorldSimulation(91);
  simulation.food = 18;
  simulation.water = 24;
  simulation.villagers.forEach((villager) => { villager.intentTime = 0; });
  simulation.tick(1 / 30);
  const intents = simulation.villagers.map((villager) => villager.intent);
  assert.ok(intents.includes('farm'));
  assert.ok(intents.includes('explore'));
});

test('legacy objectives award progression and record milestones', () => {
  const simulation = new WorldSimulation(55);
  simulation.population = 44;
  simulation.food = 80;
  simulation.tick(1 / 60);
  const state = simulation.snapshot();
  assert.ok(state.completedGoals.includes('first-roots'));
  assert.ok(state.legacyPoints >= 25);
  assert.ok(state.chronicle.some((entry) => entry.category === 'milestone'));
});

test('saved worlds restore and continue deterministically', () => {
  const original = new WorldSimulation(8128);
  original.speed = 3;
  original.usePower('rain');
  for (let i = 0; i < 800; i++) original.tick(1 / 60);

  const restored = new WorldSimulation(1, original.exportState());
  assert.deepEqual(restored.snapshot(), original.snapshot());

  for (let i = 0; i < 500; i++) {
    original.tick(1 / 60);
    restored.tick(1 / 60);
  }
  assert.deepEqual(restored.snapshot(), original.snapshot());
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
