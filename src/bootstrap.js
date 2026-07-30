import { WorldSimulation } from './simulation.js';
import { FallbackRenderer } from './fallback.js';

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js';
const params = new URLSearchParams(location.search);
const forcedFallback = params.has('fallback') || params.has('lite');
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 2 ** 31);
const simulation = new WorldSimulation(seed);
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
  setTimeout(() => showToast('A new world wakes', 'The first families have built beside the river.', '✦'), 900);
}

function wireUI(controller) {
  let selectedPower = 'observe';
  let last = performance.now();
  let toastTimer;

  const ui = {
    year: document.querySelector('#year'),
    seasonLabel: document.querySelector('#seasonLabel'),
    seasonDot: document.querySelector('#seasonDot'),
    population: document.querySelector('#population'),
    food: document.querySelector('#food'),
    harmony: document.querySelector('#harmony'),
    wonder: document.querySelector('#wonder'),
    forest: document.querySelector('#forest'),
    weatherIcon: document.querySelector('#weatherIcon'),
    weatherName: document.querySelector('#weatherName'),
    temperature: document.querySelector('#temperature'),
    statusWord: document.querySelector('#statusWord'),
    objectiveCurrent: document.querySelector('#objectiveCurrent'),
    objectiveTarget: document.querySelector('#objectiveTarget'),
    objectiveBar: document.querySelector('#objectiveBar'),
    missionText: document.querySelector('#missionText')
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
    ui.statusWord.textContent = state.status;
    ui.temperature.textContent = `${state.temperature}°C`;
    const weather = {
      clear: ['☀', 'Clear skies'],
      rain: ['◒', 'Gentle rain'],
      storm: ['ϟ', 'Passing storm']
    }[state.weather];
    ui.weatherIcon.textContent = weather[0];
    ui.weatherName.textContent = weather[1];
    ui.objectiveCurrent.textContent = state.population;
    ui.objectiveTarget.textContent = state.objectiveTarget;
    ui.objectiveBar.style.width = `${Math.min(100, state.population / state.objectiveTarget * 100)}%`;
    if (state.population >= state.objectiveTarget) ui.missionText.textContent = 'The settlements flourish. Preserve their harmony as the island grows.';

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

  const activate = (event) => {
    if (event.target.closest('button, dialog, .glass')) return;
    const effect = simulation.usePower(selectedPower);
    controller.usePower?.(selectedPower, event.clientX, event.clientY);
    showToast(effect.title, effect.body, effect.icon);
  };
  window.addEventListener('pointerup', activate);

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
  document.querySelector('#helpButton').addEventListener('click', () => helpDialog.showModal());
  helpDialog.querySelector('.dialog-close').addEventListener('click', () => helpDialog.close());
  document.querySelector('#resetButton').addEventListener('click', () => {
    const next = new URL(location.href);
    next.searchParams.set('seed', Math.floor(Math.random() * 2 ** 31));
    location.href = next;
  });
  document.querySelector('#soundButton').addEventListener('click', (event) => {
    event.currentTarget.classList.toggle('active');
    controller.toggleSound?.();
  });

  function showToastLocal(title, body, icon) {
    clearTimeout(toastTimer);
    showToast(title, body, icon);
    toastTimer = setTimeout(() => document.querySelector('#eventToast').classList.remove('show'), 3900);
  }
  window.showToast = showToastLocal;
  requestAnimationFrame(update);
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
