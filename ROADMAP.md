# Roadmap

God of Small Things should remain a compact, legible simulation rather than becoming an unbounded strategy game. New systems should deepen consequences, stories, and replayability while preserving integrated-GPU performance and the principle that the player shapes conditions instead of issuing orders.

## Now — living world foundation

- Autonomous villager roles and reactive intents
- Food, water, forest, soil, climate, migration, and civic systems
- Emergent stories and world chronicle
- Multi-stage legacy objectives
- Local save/load, autosave, and URL sharing
- Deterministic unit tests, Playwright browser tests, and CI

## Next — cultural identity

- Settlement values that emerge from repeated conditions and divine interventions
- Named festivals, customs, local architecture, and oral traditions
- Visible differences between Riverhome and Sunfield specialisations
- Chronicle filters and a compact end-of-era summary
- Better accessibility: remappable controls, contrast modes, and screen-reader summaries

## Later — relationships and landmarks

- Trade, cooperation, rivalry, migration, and reconciliation between settlements
- Monuments generated from major events rather than placed directly by the player
- Additional island layouts and biome rules
- Disasters with preparation, recovery, and remembered consequences
- Import/export files for durable world archives
- Share cards or replay summaries generated from a world chronicle

## Guardrails

Every addition should:

1. Preserve deterministic seeded simulation where practical.
2. Remain playable in the Canvas fallback.
3. Avoid requiring accounts or a backend for core play.
4. Add a meaningful trade-off or new story outcome.
5. Include unit or browser regression coverage.
6. Stay within the existing compact performance envelope.
