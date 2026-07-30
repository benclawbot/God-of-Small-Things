export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function mulberry32(seed, initialState = seed) {
  let state = Number(initialState) >>> 0;
  const random = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  random.getState = () => state >>> 0;
  random.setState = (nextState) => { state = Number(nextState) >>> 0; };
  return random;
}

const SEASONS = [
  { name: 'Spring', temperature: 16, color: '#78ae67' },
  { name: 'Summer', temperature: 24, color: '#e1bf59' },
  { name: 'Autumn', temperature: 12, color: '#cf8755' },
  { name: 'Winter', temperature: 2, color: '#9bb8c4' }
];

const ROLES = ['farmer', 'builder', 'warden', 'storyteller', 'scout'];
const ROLE_LABELS = {
  farmer: 'Farmers',
  builder: 'Builders',
  warden: 'Forest wardens',
  storyteller: 'Storytellers',
  scout: 'Scouts'
};

const OBJECTIVES = [
  {
    id: 'first-roots',
    title: 'First Roots',
    description: 'Grow to 40 citizens while keeping food above 45%.',
    reward: 25,
    progress: (world) => Math.min(world.population / 40, world.food / 45),
    complete: (world) => world.population >= 40 && world.food >= 45
  },
  {
    id: 'gentle-balance',
    title: 'Gentle Balance',
    description: 'Restore forest and harmony to 60% at the same time.',
    reward: 35,
    progress: (world) => Math.min(world.forest / 60, world.harmony / 60),
    complete: (world) => world.forest >= 60 && world.harmony >= 60
  },
  {
    id: 'seasoned-people',
    title: 'Seasoned People',
    description: 'Guide the settlements into Year 3 with at least 80 citizens.',
    reward: 50,
    progress: (world) => Math.min(world.year / 3, world.population / 80),
    complete: (world) => world.year >= 3 && world.population >= 80
  },
  {
    id: 'flourishing-accord',
    title: 'Flourishing Accord',
    description: 'Reach 120 citizens with food and harmony both above 55%.',
    reward: 90,
    progress: (world) => Math.min(world.population / 120, world.food / 55, world.harmony / 55),
    complete: (world) => world.population >= 120 && world.food >= 55 && world.harmony >= 55
  }
];

const STORY_DEFINITIONS = [
  {
    id: 'first-harvest',
    when: (world) => world.population >= 28 && world.food >= 82,
    title: 'The first great harvest',
    body: 'Baskets overflow, and the villages trade recipes beside the river.',
    icon: '❦'
  },
  {
    id: 'forest-oath',
    when: (world) => world.forest >= 72 && world.harmony >= 62,
    title: 'The forest oath',
    body: 'Wardens mark old trees with woven ribbons and promise to protect them.',
    icon: '♣'
  },
  {
    id: 'two-bells',
    when: (world) => world.settlements.every((settlement) => settlement.population >= 24),
    title: 'Two bells answer',
    body: 'The settlements ring across the valley and begin sharing tools and stories.',
    icon: '◌'
  },
  {
    id: 'winter-table',
    when: (world) => world.seasonIndex === 3 && world.food >= 62 && world.population >= 45,
    title: 'A table through winter',
    body: 'No household eats alone; every door keeps a place for a neighbour.',
    icon: '❄'
  },
  {
    id: 'monument',
    when: (world) => world.wonder >= 72 && world.population >= 70,
    title: 'A monument without a king',
    body: 'Builders raise a circle of stones to remember everyone who shaped the island.',
    icon: '▲'
  },
  {
    id: 'scarcity-council',
    when: (world) => world.food <= 24 && world.population >= 35,
    title: 'The scarcity council',
    body: 'Farmers, scouts, and elders gather to decide which stores must be shared first.',
    icon: '◇'
  }
];

const VERSION = 2;

export class WorldSimulation {
  constructor(seed = Date.now(), savedState = null) {
    this.seed = Number(seed) >>> 0;
    this.random = mulberry32(this.seed);
    this.speed = 1;
    this.elapsed = 0;
    this.year = 1;
    this.seasonIndex = 0;
    this.population = 18;
    this.food = 72;
    this.harmony = 68;
    this.wonder = 12;
    this.forest = 42;
    this.soil = 64;
    this.water = 58;
    this.weather = 'clear';
    this.weatherTime = 0;
    this.previousWeather = 'clear';
    this.powerCooldown = 0;
    this.events = [];
    this.chronicle = [];
    this.storyFlags = {};
    this.completedGoals = [];
    this.legacyPoints = 0;
    this.storyTimer = 0;
    this.agentTimer = 0;
    this.systems = { climateStress: 8, migrationPressure: 0, civicEnergy: 55 };
    this.settlements = [
      { id: 'riverhome', name: 'Riverhome', population: 12, houses: 5, growth: 0, specialty: 'farming' },
      { id: 'sunfield', name: 'Sunfield', population: 6, houses: 3, growth: 0, specialty: 'craft' }
    ];
    this.villagers = this.createVillagers(18);
    if (savedState) this.loadState(savedState);
  }

  get season() {
    return SEASONS[this.seasonIndex];
  }

  get objectiveTarget() {
    return 120;
  }

  get currentObjective() {
    return OBJECTIVES.find((objective) => !this.completedGoals.includes(objective.id)) || null;
  }

  get legacyLevel() {
    return Math.min(OBJECTIVES.length + 1, this.completedGoals.length + 1);
  }

  get status() {
    if (!this.currentObjective) return 'Stewarded';
    if (this.harmony < 30) return 'Unrest';
    if (this.food < 25) return 'Hungry';
    if (this.water < 20) return 'Thirsty';
    if (this.forest < 20) return 'Strained';
    if (this.population > 90) return 'Flourishing';
    if (this.population > 55) return 'Growing';
    if (this.population > 28) return 'Settling';
    return 'Awakening';
  }

  createVillagers(count) {
    return Array.from({ length: count }, (_, index) => ({
      id: `villager-${index + 1}`,
      settlementId: index % 3 === 0 ? 'sunfield' : 'riverhome',
      role: ROLES[index % ROLES.length],
      intent: index % 2 ? 'work' : 'rest',
      intentTime: 2 + this.random() * 7,
      mood: 58 + this.random() * 25,
      skill: 0.35 + this.random() * 0.55
    }));
  }

  snapshot() {
    const objective = this.currentObjective;
    const activity = this.activitySummary();
    return {
      version: VERSION,
      seed: this.seed,
      speed: this.speed,
      year: this.year,
      seasonIndex: this.seasonIndex,
      season: this.season,
      population: Math.round(this.population),
      food: Math.round(this.food),
      harmony: Math.round(this.harmony),
      wonder: Math.round(this.wonder),
      forest: Math.round(this.forest),
      soil: Math.round(this.soil),
      water: Math.round(this.water),
      weather: this.weather,
      temperature: Math.round(this.season.temperature + ({ storm: -4, rain: -2, drought: 5 }[this.weather] || 0)),
      status: this.status,
      objectiveTarget: this.objectiveTarget,
      objective: objective ? {
        id: objective.id,
        title: objective.title,
        description: objective.description,
        progress: Math.round(clamp(objective.progress(this), 0, 1) * 100),
        reward: objective.reward
      } : {
        id: 'stewardship',
        title: 'Enduring Stewardship',
        description: 'All legacy goals are complete. Keep the world resilient across the seasons.',
        progress: 100,
        reward: 0
      },
      legacyLevel: this.legacyLevel,
      legacyPoints: this.legacyPoints,
      completedGoals: [...this.completedGoals],
      activity,
      systems: { ...this.systems },
      chronicle: this.chronicle.slice(-24).map((entry) => ({ ...entry })),
      villagers: this.villagers.map((villager) => ({ ...villager, mood: Math.round(villager.mood) })),
      settlements: this.settlements.map((entry) => ({ ...entry, population: Math.round(entry.population) }))
    };
  }

  tick(deltaSeconds) {
    if (this.speed === 0) return this.snapshot();
    const delta = Math.min(deltaSeconds, 0.1) * this.speed;
    this.elapsed += delta;
    this.weatherTime -= delta;
    this.powerCooldown = Math.max(0, this.powerCooldown - delta);
    this.storyTimer -= delta;
    this.agentTimer -= delta;

    this.updateWeather(delta);
    this.updateSeason();

    const rainBonus = this.weather === 'rain' ? 0.22 : this.weather === 'storm' ? 0.08 : 0;
    const droughtPenalty = this.weather === 'drought' ? 0.24 : 0;
    const winterPenalty = this.seasonIndex === 3 ? 0.3 : 0;
    const forestBenefit = this.forest / 100;
    const carryingCapacity = 38 + this.food * 1.25 + this.forest * 0.45 + this.water * 0.18;
    const growthPotential = clamp((carryingCapacity - this.population) / Math.max(60, carryingCapacity), -0.5, 1);
    const harmonyFactor = clamp(this.harmony / 70, 0.15, 1.25);
    const growthRate = (0.06 + growthPotential * 0.16) * harmonyFactor * (1 - winterPenalty);
    this.population = clamp(this.population + growthRate * delta, 4, 999);

    const consumption = this.population * 0.0025;
    const production = (this.soil / 100) * 0.36 + rainBonus + forestBenefit * 0.08 - winterPenalty * 0.23 - droughtPenalty;
    this.food = clamp(this.food + (production - consumption) * delta, 0, 100);
    this.soil = clamp(this.soil + (this.forest * 0.0008 + rainBonus * 0.03 - droughtPenalty * 0.08 - this.population * 0.00025) * delta, 0, 100);
    this.water = clamp(this.water + (rainBonus * 0.36 - 0.025 - droughtPenalty * 0.28 - this.population * 0.0001) * delta, 0, 100);
    this.forest = clamp(this.forest + (0.012 + rainBonus * 0.06 - droughtPenalty * 0.05 - this.population * 0.00035) * delta, 4, 96);

    const scarcity = Math.max(0, 38 - this.food) * 0.006;
    const crowding = Math.max(0, this.population - 110) * 0.0015;
    const thirst = Math.max(0, 30 - this.water) * 0.004;
    this.harmony = clamp(this.harmony + (0.014 + this.wonder * 0.0004 - scarcity - crowding - thirst) * delta, 0, 100);
    this.wonder = clamp(this.wonder + (0.009 + this.forest * 0.0001) * delta, 0, 100);

    this.systems.climateStress = clamp(this.systems.climateStress + (droughtPenalty * 0.7 + (this.weather === 'storm' ? 0.18 : -0.035)) * delta, 0, 100);
    this.systems.migrationPressure = clamp((this.population - carryingCapacity * 0.82) * 0.7 + Math.max(0, 45 - this.food), 0, 100);
    this.systems.civicEnergy = clamp(this.harmony * 0.62 + this.wonder * 0.38, 0, 100);

    this.updateVillagers(delta);
    this.updateSettlements(delta);
    this.evaluateObjectives();
    if (this.storyTimer <= 0) {
      this.evaluateStories();
      this.storyTimer = 4;
    }
    return this.snapshot();
  }

  updateWeather(delta) {
    if (this.weatherTime > 0) return;
    if (this.random() >= delta * 0.025) return;
    this.previousWeather = this.weather;
    const dryRisk = clamp((45 - this.water) / 100 + (this.seasonIndex === 1 ? 0.12 : 0), 0, 0.32);
    const roll = this.random();
    this.weather = roll < dryRisk ? 'drought' : roll < dryRisk + 0.22 ? 'rain' : roll < dryRisk + 0.28 ? 'storm' : 'clear';
    this.weatherTime = 18 + this.random() * 26;
    if (this.weather === 'rain') this.pushEvent('Gentle rain', 'The fields drink deeply and the river swells.', '◒', 'weather');
    if (this.weather === 'storm') this.pushEvent('A sudden storm', 'The people shelter while the old trees bend.', 'ϟ', 'weather');
    if (this.weather === 'drought') this.pushEvent('A dry wind settles', 'Scouts walk farther for water while farmers shade the youngest crops.', '☼', 'weather');
  }

  updateSeason() {
    const seasonLength = 36;
    const absoluteSeason = Math.floor(this.elapsed / seasonLength);
    const newSeason = absoluteSeason % 4;
    const newYear = Math.floor(absoluteSeason / 4) + 1;
    if (newSeason !== this.seasonIndex) {
      this.seasonIndex = newSeason;
      this.pushEvent(`${this.season.name} arrives`, this.seasonMessage(), '✦', 'season');
    }
    this.year = newYear;
  }

  updateVillagers(delta) {
    const targetAgents = Math.min(64, Math.max(18, Math.round(this.population / 2.2)));
    while (this.villagers.length < targetAgents) {
      const index = this.villagers.length;
      this.villagers.push({
        id: `villager-${index + 1}`,
        settlementId: index % 2 ? 'sunfield' : 'riverhome',
        role: ROLES[index % ROLES.length],
        intent: 'arrive',
        intentTime: 2 + this.random() * 5,
        mood: 60,
        skill: 0.35 + this.random() * 0.55
      });
    }
    if (this.villagers.length > targetAgents) this.villagers.length = targetAgents;

    const contributions = { farm: 0, build: 0, tend: 0, gather: 0, explore: 0, rest: 0 };
    for (const villager of this.villagers) {
      villager.intentTime -= delta;
      if (villager.intentTime <= 0) {
        villager.intent = this.chooseIntent(villager);
        villager.intentTime = 4 + this.random() * 10;
      }
      const desiredMood = clamp((this.food + this.harmony + this.water) / 3 + (villager.intent === 'rest' ? 8 : 0), 12, 96);
      villager.mood += (desiredMood - villager.mood) * Math.min(1, delta * 0.12);
      const intent = contributions[villager.intent] === undefined ? 'rest' : villager.intent;
      contributions[intent] += villager.skill;
    }

    this.food = clamp(this.food + contributions.farm * 0.0036 * delta, 0, 100);
    this.forest = clamp(this.forest + contributions.tend * 0.0022 * delta, 0, 100);
    this.harmony = clamp(this.harmony + contributions.gather * 0.0025 * delta + contributions.rest * 0.0004 * delta, 0, 100);
    this.wonder = clamp(this.wonder + (contributions.gather + contributions.explore) * 0.0014 * delta, 0, 100);
    this.water = clamp(this.water + contributions.explore * 0.0008 * delta, 0, 100);
    const buildEnergy = contributions.build * 0.0028 * delta;
    for (const settlement of this.settlements) settlement.growth += buildEnergy / this.settlements.length;
  }

  chooseIntent(villager) {
    if (this.food < 42 && villager.role !== 'storyteller') return villager.role === 'scout' ? 'explore' : 'farm';
    if (this.water < 34 && villager.role === 'scout') return 'explore';
    if (this.forest < 48 && villager.role === 'warden') return 'tend';
    if (this.harmony < 58 && villager.role === 'storyteller') return 'gather';
    const settlement = this.settlements.find((entry) => entry.id === villager.settlementId);
    if (villager.role === 'builder' && settlement && settlement.houses < Math.ceil(settlement.population / 3.4)) return 'build';
    const preferred = {
      farmer: 'farm',
      builder: 'build',
      warden: 'tend',
      storyteller: 'gather',
      scout: 'explore'
    }[villager.role];
    return this.random() < 0.78 ? preferred : 'rest';
  }

  activitySummary() {
    const counts = this.villagers.reduce((summary, villager) => {
      summary[villager.intent] = (summary[villager.intent] || 0) + 1;
      return summary;
    }, {});
    const [intent = 'rest', count = 0] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
    const labels = {
      farm: 'Tending fields',
      build: 'Raising homes',
      tend: 'Guarding forests',
      gather: 'Sharing stories',
      explore: 'Exploring paths',
      rest: 'Resting together',
      arrive: 'Welcoming newcomers',
      work: 'Beginning the day'
    };
    const roles = ROLES.map((role) => ({ role, label: ROLE_LABELS[role], count: this.villagers.filter((villager) => villager.role === role).length }));
    return { intent, label: labels[intent] || 'Living quietly', count, roles };
  }

  updateSettlements(delta) {
    const totalWeight = this.settlements.reduce((sum, settlement) => sum + settlement.population, 0);
    for (const settlement of this.settlements) {
      const desired = this.population * (settlement.population / totalWeight);
      settlement.population += (desired - settlement.population) * 0.05 * delta;
      settlement.growth += Math.max(0, this.food - 45) * 0.001 * delta;
      const desiredHouses = Math.max(3, Math.ceil(settlement.population / 3.4));
      if (settlement.houses < desiredHouses && settlement.growth > 1) {
        settlement.houses += 1;
        settlement.growth = 0;
        this.pushEvent('A new home rises', `Another family puts down roots in ${settlement.name}.`, '⌂', 'settlement');
      }
    }
  }

  evaluateObjectives() {
    for (const objective of OBJECTIVES) {
      if (this.completedGoals.includes(objective.id) || !objective.complete(this)) continue;
      this.completedGoals.push(objective.id);
      this.legacyPoints += objective.reward;
      this.pushEvent(`${objective.title} complete`, `The world earns ${objective.reward} legacy points.`, '✦', 'milestone');
    }
  }

  evaluateStories() {
    for (const story of STORY_DEFINITIONS) {
      if (this.storyFlags[story.id] || !story.when(this)) continue;
      this.storyFlags[story.id] = true;
      this.pushEvent(story.title, story.body, story.icon, 'story');
    }

    if (this.random() < 0.12 && this.population >= 30) {
      const activity = this.activitySummary();
      const moments = [
        ['A name enters the songs', `A ${activity.roles.sort((a, b) => b.count - a.count)[0]?.label.toLowerCase() || 'villager'} becomes known for helping strangers.`, '♪'],
        ['Lanterns along the river', 'Children float small lights downstream to mark the turning season.', '·'],
        ['A path becomes a promise', 'Travellers leave stones at every fork so no one has to return alone.', '◇']
      ];
      const [title, body, icon] = moments[Math.floor(this.random() * moments.length)];
      this.pushEvent(title, body, icon, 'moment');
    }
  }

  usePower(power) {
    const effects = {
      observe: () => ({ title: 'The world continues', body: 'You listen instead of intervening.', icon: '◉' }),
      forest: () => {
        this.forest = clamp(this.forest + 9, 0, 100);
        this.soil = clamp(this.soil + 4, 0, 100);
        this.wonder = clamp(this.wonder + 2, 0, 100);
        this.villagers.filter((villager) => villager.role === 'warden').forEach((villager) => { villager.intent = 'tend'; villager.intentTime = 8; });
        return { title: 'A grove takes root', body: 'Wardens gather as new trees protect the soil and shelter small lives.', icon: '♣' };
      },
      rain: () => {
        this.previousWeather = this.weather;
        this.weather = 'rain';
        this.weatherTime = 16;
        this.water = clamp(this.water + 14, 0, 100);
        this.food = clamp(this.food + 5, 0, 100);
        return { title: 'Rain answers', body: 'The river brightens and farmers hurry into the fields.', icon: '◒' };
      },
      raise: () => {
        this.soil = clamp(this.soil + 7, 0, 100);
        this.food = clamp(this.food - 2, 0, 100);
        this.wonder = clamp(this.wonder + 4, 0, 100);
        return { title: 'The earth remembers', body: 'A new ridge rises, and scouts immediately seek a path across it.', icon: '▲' };
      },
      inspire: () => {
        this.harmony = clamp(this.harmony + 9, 0, 100);
        this.wonder = clamp(this.wonder + 8, 0, 100);
        this.food = clamp(this.food - 3, 0, 100);
        this.villagers.filter((villager) => villager.role === 'storyteller').forEach((villager) => { villager.intent = 'gather'; villager.intentTime = 10; });
        return { title: 'A shared dream', body: 'Songs spread from fire to fire, binding strangers together.', icon: '✦' };
      },
      storm: () => {
        this.previousWeather = this.weather;
        this.weather = 'storm';
        this.weatherTime = 13;
        this.water = clamp(this.water + 9, 0, 100);
        this.forest = clamp(this.forest - 5, 0, 100);
        this.harmony = clamp(this.harmony - 6, 0, 100);
        return { title: 'Thunder walks the hills', body: 'The land is renewed, but fear follows the lightning.', icon: 'ϟ' };
      }
    };
    const effect = (effects[power] || effects.observe)();
    this.pushEvent(effect.title, effect.body, effect.icon, 'power');
    return effect;
  }

  pushEvent(title, body, icon = '✦', category = 'world') {
    const event = { title, body, icon, category, timestamp: this.elapsed, year: this.year, season: this.season.name };
    this.events.push(event);
    this.chronicle.push(event);
    if (this.events.length > 12) this.events.shift();
    if (this.chronicle.length > 80) this.chronicle.shift();
  }

  takeEvents() {
    return this.events.splice(0, this.events.length);
  }

  exportState({ compact = false } = {}) {
    const state = {
      version: VERSION,
      seed: this.seed,
      randomState: this.random.getState(),
      speed: this.speed,
      elapsed: this.elapsed,
      year: this.year,
      seasonIndex: this.seasonIndex,
      population: this.population,
      food: this.food,
      harmony: this.harmony,
      wonder: this.wonder,
      forest: this.forest,
      soil: this.soil,
      water: this.water,
      weather: this.weather,
      weatherTime: this.weatherTime,
      previousWeather: this.previousWeather,
      completedGoals: [...this.completedGoals],
      legacyPoints: this.legacyPoints,
      storyFlags: { ...this.storyFlags },
      systems: { ...this.systems },
      settlements: this.settlements.map((entry) => ({ ...entry })),
      chronicle: this.chronicle.slice(compact ? -10 : -80).map((entry) => ({ ...entry }))
    };
    if (!compact) state.villagers = this.villagers.map((villager) => ({ ...villager }));
    return state;
  }

  loadState(state) {
    if (!state || typeof state !== 'object') throw new TypeError('World state must be an object.');
    if (Number(state.version || 1) > VERSION) throw new Error('This saved world was created by a newer version.');
    this.seed = Number(state.seed ?? this.seed) >>> 0;
    this.random = mulberry32(this.seed, state.randomState ?? this.seed);
    const numericFields = ['speed', 'elapsed', 'year', 'seasonIndex', 'population', 'food', 'harmony', 'wonder', 'forest', 'soil', 'water', 'weatherTime'];
    for (const field of numericFields) {
      if (Number.isFinite(Number(state[field]))) this[field] = Number(state[field]);
    }
    this.speed = [0, 1, 3, 8].includes(this.speed) ? this.speed : 1;
    this.seasonIndex = ((Math.round(this.seasonIndex) % 4) + 4) % 4;
    this.weather = ['clear', 'rain', 'storm', 'drought'].includes(state.weather) ? state.weather : 'clear';
    this.previousWeather = ['clear', 'rain', 'storm', 'drought'].includes(state.previousWeather) ? state.previousWeather : 'clear';
    this.completedGoals = Array.isArray(state.completedGoals) ? state.completedGoals.filter((id) => OBJECTIVES.some((objective) => objective.id === id)) : [];
    this.legacyPoints = Number.isFinite(Number(state.legacyPoints)) ? Number(state.legacyPoints) : 0;
    this.storyFlags = state.storyFlags && typeof state.storyFlags === 'object' ? { ...state.storyFlags } : {};
    this.systems = state.systems && typeof state.systems === 'object' ? { ...this.systems, ...state.systems } : this.systems;
    if (Array.isArray(state.settlements) && state.settlements.length) this.settlements = state.settlements.map((entry) => ({ ...entry }));
    this.chronicle = Array.isArray(state.chronicle) ? state.chronicle.slice(-80).map((entry) => ({ ...entry })) : [];
    this.villagers = Array.isArray(state.villagers) && state.villagers.length ? state.villagers.slice(0, 64).map((entry) => ({ ...entry })) : this.createVillagers(Math.min(64, Math.max(18, Math.round(this.population / 2.2))));
    this.events = [];
    return this;
  }

  seasonMessage() {
    return [
      'New shoots appear along the riverbanks.',
      'Long days fill the fields with grain.',
      'The people gather stores beneath copper leaves.',
      'Snow quiets the paths and tests every household.'
    ][this.seasonIndex];
  }
}
