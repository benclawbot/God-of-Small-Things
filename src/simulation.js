export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const SEASONS = [
  { name: 'Spring', temperature: 16, color: '#78ae67' },
  { name: 'Summer', temperature: 24, color: '#e1bf59' },
  { name: 'Autumn', temperature: 12, color: '#cf8755' },
  { name: 'Winter', temperature: 2, color: '#9bb8c4' }
];

export class WorldSimulation {
  constructor(seed = Date.now()) {
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
    this.powerCooldown = 0;
    this.events = [];
    this.settlements = [
      { id: 'riverhome', population: 12, houses: 5, growth: 0 },
      { id: 'sunfield', population: 6, houses: 3, growth: 0 }
    ];
  }

  get season() {
    return SEASONS[this.seasonIndex];
  }

  get objectiveTarget() {
    return 120;
  }

  get status() {
    if (this.population >= this.objectiveTarget) return 'Flourishing';
    if (this.harmony < 30) return 'Unrest';
    if (this.food < 25) return 'Hungry';
    if (this.forest < 20) return 'Strained';
    if (this.population > 70) return 'Growing';
    if (this.population > 32) return 'Settling';
    return 'Awakening';
  }

  snapshot() {
    return {
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
      temperature: Math.round(this.season.temperature + (this.weather === 'storm' ? -4 : this.weather === 'rain' ? -2 : 0)),
      status: this.status,
      objectiveTarget: this.objectiveTarget,
      settlements: this.settlements.map((entry) => ({ ...entry }))
    };
  }

  tick(deltaSeconds) {
    if (this.speed === 0) return this.snapshot();
    const delta = Math.min(deltaSeconds, 0.1) * this.speed;
    this.elapsed += delta;
    this.weatherTime -= delta;
    this.powerCooldown = Math.max(0, this.powerCooldown - delta);

    if (this.weatherTime <= 0 && this.random() < delta * 0.025) {
      const roll = this.random();
      this.weather = roll < 0.22 ? 'rain' : roll < 0.28 ? 'storm' : 'clear';
      this.weatherTime = 18 + this.random() * 26;
      if (this.weather === 'rain') this.pushEvent('Gentle rain', 'The fields drink deeply and the river swells.', '◒');
      if (this.weather === 'storm') this.pushEvent('A sudden storm', 'The people shelter while the old trees bend.', 'ϟ');
    }

    const seasonLength = 36;
    const absoluteSeason = Math.floor(this.elapsed / seasonLength);
    const newSeason = absoluteSeason % 4;
    const newYear = Math.floor(absoluteSeason / 4) + 1;
    if (newSeason !== this.seasonIndex) {
      this.seasonIndex = newSeason;
      this.pushEvent(`${this.season.name} arrives`, this.seasonMessage(), '✦');
    }
    this.year = newYear;

    const rainBonus = this.weather === 'rain' ? 0.22 : this.weather === 'storm' ? 0.08 : 0;
    const winterPenalty = this.seasonIndex === 3 ? 0.3 : 0;
    const forestBenefit = this.forest / 100;
    const carryingCapacity = 38 + this.food * 1.25 + this.forest * 0.45;
    const growthPotential = clamp((carryingCapacity - this.population) / Math.max(60, carryingCapacity), -0.5, 1);
    const harmonyFactor = clamp(this.harmony / 70, 0.15, 1.25);
    const growthRate = (0.06 + growthPotential * 0.16) * harmonyFactor * (1 - winterPenalty);
    this.population = clamp(this.population + growthRate * delta, 4, 999);

    const consumption = this.population * 0.0025;
    const production = (this.soil / 100) * 0.36 + rainBonus + forestBenefit * 0.08 - winterPenalty * 0.23;
    this.food = clamp(this.food + (production - consumption) * delta, 0, 100);
    this.soil = clamp(this.soil + (this.forest * 0.0008 + rainBonus * 0.03 - this.population * 0.00025) * delta, 0, 100);
    this.water = clamp(this.water + (rainBonus * 0.36 - 0.025 - this.population * 0.0001) * delta, 0, 100);
    this.forest = clamp(this.forest + (0.012 + rainBonus * 0.06 - this.population * 0.00035) * delta, 4, 96);

    const scarcity = Math.max(0, 38 - this.food) * 0.006;
    const crowding = Math.max(0, this.population - 110) * 0.0015;
    this.harmony = clamp(this.harmony + (0.014 + this.wonder * 0.0004 - scarcity - crowding) * delta, 0, 100);
    this.wonder = clamp(this.wonder + (0.009 + this.forest * 0.0001) * delta, 0, 100);

    this.updateSettlements(delta);
    return this.snapshot();
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
        this.pushEvent('A new home rises', 'Another family puts down roots beside the paths.', '⌂');
      }
    }
  }

  usePower(power) {
    const effects = {
      observe: () => ({ title: 'The world continues', body: 'You listen instead of intervening.', icon: '◉' }),
      forest: () => {
        this.forest = clamp(this.forest + 9, 0, 100);
        this.soil = clamp(this.soil + 4, 0, 100);
        this.wonder = clamp(this.wonder + 2, 0, 100);
        return { title: 'A grove takes root', body: 'New trees protect the soil and shelter small lives.', icon: '♣' };
      },
      rain: () => {
        this.weather = 'rain';
        this.weatherTime = 16;
        this.water = clamp(this.water + 14, 0, 100);
        this.food = clamp(this.food + 5, 0, 100);
        return { title: 'Rain answers', body: 'The river brightens and the fields drink deeply.', icon: '◒' };
      },
      raise: () => {
        this.soil = clamp(this.soil + 7, 0, 100);
        this.food = clamp(this.food - 2, 0, 100);
        this.wonder = clamp(this.wonder + 4, 0, 100);
        return { title: 'The earth remembers', body: 'A new ridge rises where your touch meets stone.', icon: '▲' };
      },
      inspire: () => {
        this.harmony = clamp(this.harmony + 9, 0, 100);
        this.wonder = clamp(this.wonder + 8, 0, 100);
        this.food = clamp(this.food - 3, 0, 100);
        return { title: 'A shared dream', body: 'Songs spread from fire to fire, binding strangers together.', icon: '✦' };
      },
      storm: () => {
        this.weather = 'storm';
        this.weatherTime = 13;
        this.water = clamp(this.water + 9, 0, 100);
        this.forest = clamp(this.forest - 5, 0, 100);
        this.harmony = clamp(this.harmony - 6, 0, 100);
        return { title: 'Thunder walks the hills', body: 'The land is renewed, but fear follows the lightning.', icon: 'ϟ' };
      }
    };
    const effect = (effects[power] || effects.observe)();
    this.pushEvent(effect.title, effect.body, effect.icon);
    return effect;
  }

  pushEvent(title, body, icon = '✦') {
    this.events.push({ title, body, icon, timestamp: this.elapsed });
    if (this.events.length > 12) this.events.shift();
  }

  takeEvents() {
    return this.events.splice(0, this.events.length);
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
