<p align="center">
  <img src="assets/hero-banner.svg" alt="God of Small Things — shape worlds and inspire civilizations" width="100%" />
</p>

<h1 align="center">God of Small Things</h1>

<p align="center">
  <strong>A living tabletop civilization simulator built with Three.js.</strong><br />
  Shape terrain, climate, and culture—then watch tiny societies adapt, remember, and tell their own history.
</p>

<p align="center">
  <a href="https://god-of-small-things.vercel.app"><strong>Play the browser build</strong></a>
  · <a href="#how-to-play">How to play</a>
  · <a href="#development">Development</a>
  · <a href="ROADMAP.md">Roadmap</a>
</p>

<p align="center">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-r180-black?logo=threedotjs" />
  <img alt="Playwright" src="https://img.shields.io/badge/tested-Playwright-45ba4b?logo=playwright" />
  <img alt="Integrated graphics friendly" src="https://img.shields.io/badge/GPU-integrated--friendly-c79e3b" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
</p>

## The idea

You are a god, but not a commander. The people build, migrate, celebrate, struggle, and change on their own. Your influence is indirect: grow forests, call rain, raise ridges, inspire communities, or unleash storms. Every intervention improves some conditions while putting pressure on others.

The game is designed for modest laptops and integrated graphics without sacrificing a strong visual identity.

## Screenshots

<p align="center">
  <img src="assets/screenshots/world-overview.svg" alt="Summer gameplay overview" width="100%" />
</p>

<p align="center">
  <img src="assets/screenshots/winter-world.svg" alt="Winter gameplay state" width="100%" />
</p>

## Features

- **Autonomous villagers** with farmer, builder, warden, storyteller, and scout roles that react to scarcity, housing, forest health, and social conditions.
- **Reactive world systems** covering food, water, soil, forests, climate stress, migration pressure, civic energy, seasons, droughts, rain, and storms.
- **Emergent stories and a world chronicle** that records milestones, traditions, weather events, settlement growth, and small cultural moments.
- **Four-stage legacy progression** with visible objectives and rewards instead of a single population target.
- **Save and load** through local browser storage, including automatic periodic saves.
- **Shareable worlds** encoded into a URL so another player can continue the current moment in history.
- **A procedural floating island** with mountains, rivers, forests, fields, paths, growing settlements, and visible citizens.
- **Six divine powers** with ecological and social trade-offs.
- **Adaptive Three.js rendering** plus a Canvas 2D fallback for low-power devices or unavailable WebGL.
- **Seeded deterministic worlds** for reproducible simulations and regression tests.
- **Keyboard, mouse, trackpad, and touch controls** with no installation required.

## How to play

| Action | Control |
|---|---|
| Orbit the island | Drag the pointer |
| Zoom | Mouse wheel or trackpad pinch |
| Select a power | Bottom toolbar or keys `1`–`6` |
| Apply a power | Click or tap the island |
| Pause/resume | `Space` or time controls |
| Accelerate history | `▶▶` and `▶▶▶` |
| Save or restore | Top-right save/load buttons |
| Share the current world | Top-right share button |
| Review history | Open the chronicle |
| Generate a new world | Reset button |

### Powers

| Power | Benefit | Cost or risk |
|---|---|---|
| Observe | Lets the simulation develop naturally | No direct intervention |
| Grow | Restores forest, soil, and wonder | Uses valuable land |
| Rain | Replenishes water and food | Can shift weather patterns |
| Raise | Improves soil and creates wonder | Temporarily reduces food |
| Inspire | Improves harmony and wonder | Communities pause production |
| Storm | Replenishes water quickly | Damages forest and harmony |

## Persistence and sharing

The game automatically saves the complete world state in the browser every 12 seconds and when the page is hidden or closed. Manual save and load controls are also available.

The share button creates a compact URL fragment containing the seed, simulation state, legacy progress, settlements, and recent chronicle. Shared state stays client-side; no account or backend is required.

## Performance profile

The default scene is intentionally bounded for integrated graphics:

- Device pixel ratio capped near `1.5`
- Compact island rather than an open world
- Instanced trees and citizens
- One primary shadow-casting light
- Limited visible houses and agents
- Lightweight simulation updates independent of frame rate
- Automatic Canvas 2D fallback

Use `?lite=1` or `?fallback=1` for the lowest-power renderer. Use `?seed=42042` for a repeatable world.

## Architecture

```text
index.html
├── src/bootstrap.js          UI, persistence, sharing, renderer selection
├── src/game.js               Three.js world, camera, effects, interaction
├── src/fallback.js           Canvas 2D low-power renderer
├── src/simulation.js         Deterministic agents, systems, goals, stories
├── styles.css                Responsive glass-interface styling
├── tests/simulation.test.mjs Node-native deterministic tests
├── tests/e2e/                Playwright browser regression tests
└── .github/workflows/ci.yml  Unit, syntax, and Chromium CI
```

Three.js is loaded as an ES module from cdnjs. There is no bundler or production build step; the repository can be hosted as static files.

## Development

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/benclawbot/God-of-Small-Things.git
cd God-of-Small-Things
npm install
npx playwright install chromium
npm start
```

Open `http://localhost:4173`.

```bash
npm run check       # syntax and deterministic simulation tests
npm run test:e2e    # Chromium browser tests
npm run check:all   # everything
```

The browser suite deliberately exercises `?fallback=1`, making CI independent of the external Three.js CDN while still validating the full interface, persistence, sharing, chronicle, powers, and keyboard controls.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the prioritized path toward cultural identities, diplomacy, deeper settlement specialisation, monuments, additional biomes, accessibility improvements, and richer world sharing.

## License

Released under the [MIT License](LICENSE).
