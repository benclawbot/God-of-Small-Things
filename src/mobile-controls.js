const MOBILE_QUERY = window.matchMedia('(max-width: 760px)');
const COARSE_POINTER_QUERY = window.matchMedia('(pointer: coarse)');

function updateViewportHeight() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
}

function setPanelState(panel, button, collapsed) {
  panel.classList.toggle('collapsed', collapsed);
  button.setAttribute('aria-expanded', String(!collapsed));
  const name = button.dataset.panelName || 'panel';
  button.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${name}`);
  button.textContent = collapsed ? '+' : '−';
}

function bindPanels() {
  const toggles = [...document.querySelectorAll('[data-panel-toggle]')];
  const entries = toggles.map((button) => ({
    button,
    panel: document.querySelector(`#${button.getAttribute('aria-controls')}`)
  })).filter((entry) => entry.panel);

  for (const { button, panel } of entries) {
    button.addEventListener('click', () => setPanelState(panel, button, !panel.classList.contains('collapsed')));
  }

  let wasMobile = false;
  const syncLayout = () => {
    const isMobile = MOBILE_QUERY.matches;
    if (isMobile && !wasMobile) {
      for (const { button, panel } of entries) {
        setPanelState(panel, button, panel.id === 'statsPanel');
      }
    } else if (!isMobile && wasMobile) {
      for (const { button, panel } of entries) setPanelState(panel, button, false);
    }
    wasMobile = isMobile;
  };

  MOBILE_QUERY.addEventListener?.('change', syncLayout);
  syncLayout();
}

function distanceBetween(points) {
  const [first, second] = [...points.values()];
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function bindCanvasGestures(canvas) {
  const pointers = new Map();
  let start = null;
  let pinchDistance = 0;
  let suppressClick = false;
  let resetTimer;

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    clearTimeout(resetTimer);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture?.(event.pointerId);

    if (pointers.size === 1) {
      start = { x: event.clientX, y: event.clientY };
      suppressClick = false;
    } else if (pointers.size === 2) {
      pinchDistance = distanceBetween(pointers);
      suppressClick = true;
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1 && start) {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) suppressClick = true;
      return;
    }

    if (pointers.size === 2) {
      event.preventDefault();
      const nextDistance = distanceBetween(pointers);
      if (pinchDistance > 0) {
        canvas.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: (pinchDistance - nextDistance) * 2.4
        }));
      }
      pinchDistance = nextDistance;
      suppressClick = true;
    }
  }, { passive: false });

  const finishPointer = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];
      start = { ...remaining };
    }
    if (pointers.size === 0) {
      start = null;
      resetTimer = setTimeout(() => { suppressClick = false; }, 450);
    }
  };

  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', finishPointer);
  canvas.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, { capture: true });
}

function bootMobileControls() {
  updateViewportHeight();
  bindPanels();

  if (COARSE_POINTER_QUERY.matches || navigator.maxTouchPoints > 0) {
    document.documentElement.classList.add('touch-ui');
    document.querySelectorAll('canvas').forEach(bindCanvasGestures);
  }

  window.addEventListener('orientationchange', updateViewportHeight);
  window.addEventListener('resize', updateViewportHeight);
  window.visualViewport?.addEventListener('resize', updateViewportHeight);
  window.visualViewport?.addEventListener('scroll', updateViewportHeight);
}

bootMobileControls();
