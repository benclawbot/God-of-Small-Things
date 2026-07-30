import { WorldSimulation } from './simulation.js';
import { FallbackRenderer } from './fallback.js';

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js';
const STORAGE_KEY = 'god-of-small-things.world.v2';
const params = new URLSearchParams(location.search);
const forcedFallback = params.has('fallback') || params.has('lite');
const sharedState = readSharedState();
const seed = Number(sharedState?.seed ?? params.get('seed')) || Math.floor(Math.random() * 2 ** 31);
const simulation = new WorldSimulation(seed, sharedState);
const loading = document.querySelector('#loading');
const loadingStatus = document.querySelector('#loadingStatus');
let rendererController;

async function boot() {
  if (!forcedFallback) {
    try {
      loadingStatus.textContent = 'Loading the Three.js world…';
      const THREE = await import(THREE_URL);
      const { ThreeWorld } = await import('./game.js');
      rendererController = new ThreeWorld(document.querySelector('#world'), THREE, simulation);
      wireUI(rendererController);
      finishLoading('Three.js · adaptive quality');
      return;
    } catch (error) {
      console.warn('Three.js renderer unavailable; using Canvas fallback.', error);
    }
  }

  document.querySelector('#world').hidden = true;
  const fallbackCanvas = document.querySelector('#fallback');
  fallbackCanvas.hidden = false;
  rendererController = new FallbackRenderer(fallbackCanvas, simulation);
  wireUI(rendererController);
  finishLoading('Canvas fallback · low-power mode');
}

function finishLoading(mode) {
  loadingStatus.textContent = mode;
  setTimeout(() => loading.classList.add('hidden'), 420);
  const welcome = sharedState
    ? ['A remembered world returns', 'Its people continue from the moment history was saved.', '↻']
    : ['A new world wakes', 'The first families have built beside the river.', '✦'];
  setTimeout(() => showToast(...welcome), 900);
}

function wireUI(controller) {
  let selectedPower = 'observe';
  let last = performance.now();
  let lastChronicleSize = -1;

  const ui = {
    year: document.querySelector('#year'),
    seasonLabel: document.querySelector('#seasonLabel'),
    seasonDot: document.querySelector('#seasonDot'),
    population: document.querySelector('#population'),
    food: document.querySelector('#food'),
    harmony: document.querySelector('#harmony'),
    wonder: document.querySelector('#wonder'),
    forest: document.querySelector('#forest'),
    water: document.querySelector('#water'),
    activity: document.querySelector('#activity'),
    weatherIcon: document.querySelector('#weatherIcon'),
    weatherName: document.querySelector('#weatherName'),
    temperature: document.querySelector('#temperature'),
    statusWord: document.querySelector('#statusWord'),
    objectiveLabel: document.querySelector('#objectiveLabel'),
    objectiveProgress: document.querySelector('#objectiveProgress'),
    objectiveBar: document.querySelector('#objectiveBar'),
    missionText: document.querySelector('#missionText'),
    legacyLevel: document.querySelector('#legacyLevel'),
    legacyPoints: document.querySelector('#legacyPoints'),
    chronicleList: document.querySelector('#chronicleList')
  };

  function update(now) {
    const delta = (now - last) / 1000;
    last = now;
    const state = simulation.tick(delta);
    ui.year.textContent = state.year;
    ui.seasonLabel.textContent = state.season.name;
    ui.seasonDot.style.background = state.season.color;
    ui.seasonDot.style.boxShadow = `0 0 16px ${state.season.color}`;
    ui.population.textContent = state.population.toLocaleString();
    ui.food.textContent = `${state.food}%`;
    ui.harmony.textContent = `${state.harmony}%`;
    ui.wonder.textContent = state.wonder;
    ui.forest.textContent = `${state.forest}%`;
    ui.water.textContent = `${state.water}%`;
    ui.activity.textContent = `${state.activity.label} · ${state.activity.count}`;
    ui.statusWord.textContent = state.status;
    ui.temperature.textContent = `${state.temperature}°C`;
    const weather = {
      clear: ['☀', 'Clear skies'],
      rain: ['◒', 'Gentle rain'],
      storm: ['ϟ', 'Passing storm'],
      drought: ['☼', 'Dry spell']
    }[state.weather];
    ui.weatherIcon.textContent = weather[0];
    ui.weatherName.textContent = weather[1];
    ui.objectiveLabel.textContent = state.objective.title;
    ui.objectiveProgress.textContent = `${state.objective.progress}%`;
    ui.objectiveBar.style.width = `${state.objective.progress}%`;
    ui.missionText.textContent = state.objective.description;
    ui.legacyLevel.textContent = state.legacyLevel;
    ui.legacyPoints.textContent = state.legacyPoints;

    if (state.chronicle.length !== lastChronicleSize) {
      renderChronicle(ui.chronicleList, state.chronicle);
      lastChronicleSize = state.chronicle.length;
    }

    const events = simulation.takeEvents();
    if (events.length) {
      const event = events.at(-1);
      showToast(event.title, event.body, event.icon);
    }
    controller.updateSimulation?.(state, delta);
    requestAnimationFrame(update);
  }

  document.querySelectorAll('.power').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.power').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      selectedPower = button.dataset.power;
      controller.setPower?.(selectedPower);
    });
  });

  document.querySelectorAll('.time-controls button').forEach((button) => {
    button.addEventListener('click', () => {
      simulation.speed = Number(button.dataset.speed);
      document.querySelectorAll('.time-controls button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
  });
  document.querySelector(`.time-controls button[data-speed="${simulation.speed}"]`)?.classList.add('active');

  const activate = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const effect = simulation.usePower(selectedPower);
    controller.usePower?.(selectedPower, event.clientX, event.clientY);
    showToast(effect.title, effect.body, effect.icon);
  };
  document.querySelector('#world').addEventListener('click', activate);
  document.querySelector('#fallback').addEventListener('click', activate);

  window.addEventListener('keydown', (event) => {
    const index = Number(event.key) - 1;
    const powers = [...document.querySelectorAll('.power')];
    if (index >= 0 && index < powers.length) powers[index].click();
    if (event.code === 'Space') {
      event.preventDefault();
      const nextSpeed = simulation.speed === 0 ? 1 : 0;
      document.querySelector(`.time-controls button[data-speed="${nextSpeed}"]`)?.click();
    }
  });

  const helpDialog = document.querySelector('#helpDialog');
  const chronicleDialog = document.querySelector('#chronicleDialog');
  document.querySelector('#helpButton').addEventListener('click', () => helpDialog.showModal());
  helpDialog.querySelector('.dialog-close').addEventListener('click', () => helpDialog.close());
  document.querySelector('#chronicleButton').addEventListener('click', () => chronicleDialog.showModal());
  chronicleDialog.querySelector('.dialog-close').addEventListener('click', () => chronicleDialog.close());
  document.querySelector('#resetButton').addEventListener('click', () => {
    const next = new URL(location.href);
    next.hash = '';
    next.searchParams.set('seed', Math.floor(Math.random() * 2 ** 31));
    location.href = next;
  });
  document.querySelector('#soundButton').addEventListener('click', (event) => {
    event.currentTarget.classList.toggle('active');
    controller.toggleSound?.();
  });
  document.querySelector('#saveButton').addEventListener('click', () => saveWorld(true));
  document.querySelector('#loadButton').addEventListener('click', loadWorld);
  document.querySelector('#shareButton').addEventListener('click', shareWorld);

  setInterval(() => saveWorld(false), 12000);
  window.addEventListener('beforeunload', () => saveWorld(false));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveWorld(false);
  });

  window.__smallThings = { simulation, saveWorld, loadWorld, shareWorld, encodeWorld, decodeWorld };
  requestAnimationFrame(update);
}

function saveWorld(announce = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(simulation.exportState()));
    if (announce) showToast('World remembered', 'This history is saved in your browser.', '▣');
    return true;
  } catch (error) {
    console.warn('Unable to save world.', error);
    if (announce) showToast('The memory could not be kept', 'Browser storage is unavailable or full.', '!');
    return false;
  }
}

function loadWorld() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      showToast('No remembered world', 'Save this world first, then return to it later.', '◇');
      return false;
    }
    const next = new URL(location.href);
    next.hash = `world=${encodeWorld(JSON.parse(saved))}`;
    location.href = next;
    return true;
  } catch (error) {
    console.warn('Unable to load world.', error);
    showToast('The memory is damaged', 'This saved world could not be restored.', '!');
    return false;
  }
}

async function shareWorld() {
  const next = new URL(location.href);
  next.hash = `world=${encodeWorld(simulation.exportState({ compact: true }))}`;
  history.replaceState(null, '', next);
  try {
    await navigator.clipboard.writeText(next.href);
    showToast('World link copied', 'Anyone with the link can continue this moment in history.', '↗');
  } catch {
    showToast('World link prepared', 'Copy the URL from your browser to share this moment.', '↗');
  }
  return next.href;
}

function renderChronicle(list, entries) {
  list.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'chronicle-empty';
    empty.textContent = 'History is still waiting for its first turning point.';
    list.append(empty);
    return;
  }
  for (const entry of [...entries].reverse()) {
    const item = document.createElement('li');
    const icon = document.createElement('span');
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    const body = document.createElement('p');
    const time = document.createElement('small');
    icon.textContent = entry.icon;
    title.textContent = entry.title;
    body.textContent = entry.body;
    time.textContent = `${entry.season} · Year ${entry.year}`;
    copy.append(title, body, time);
    item.append(icon, copy);
    list.append(item);
  }
}

function readSharedState() {
  const match = location.hash.match(/^#?world=([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  try {
    return decodeWorld(match[1]);
  } catch (error) {
    console.warn('Shared world link could not be decoded.', error);
    return null;
  }
}

function encodeWorld(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeWorld(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function showToast(title, body, icon) {
  const toast = document.querySelector('#eventToast');
  document.querySelector('#eventTitle').textContent = title;
  document.querySelector('#eventBody').textContent = body;
  document.querySelector('#eventIcon').textContent = icon;
  toast.classList.remove('show');
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3900);
}

boot();
