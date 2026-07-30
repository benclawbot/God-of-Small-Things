const TAU = Math.PI * 2;

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

export class FallbackRenderer {
  constructor(canvas, simulation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.simulation = simulation;
    this.pointer = { x: 0, y: 0 };
    this.powerBursts = [];
    this.rotation = -0.16;
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.start = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.floor(innerWidth * ratio);
    this.canvas.height = Math.floor(innerHeight * ratio);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  usePower(power, x = innerWidth / 2, y = innerHeight / 2) {
    this.powerBursts.push({ power, x, y, time: performance.now() });
  }

  loop(now) {
    this.draw((now - this.start) / 1000, now);
    this.raf = requestAnimationFrame(this.loop);
  }

  draw(time, now) {
    const ctx = this.ctx;
    const width = innerWidth;
    const height = innerHeight;
    const state = this.simulation.snapshot();
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, state.seasonIndex === 3 ? '#7d99a4' : '#547a7c');
    sky.addColorStop(0.5, '#16302d');
    sky.addColorStop(1, '#071110');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    this.drawClouds(ctx, time, width, height, state);
    this.drawStars(ctx, time, width, height);

    const cx = width * 0.53;
    const cy = height * 0.55;
    const scale = Math.min(width / 1200, height / 700) * 1.06;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.rotate(this.rotation + Math.sin(time * 0.08) * 0.008);
    this.drawIsland(ctx, state, time);
    ctx.restore();

    this.drawBursts(ctx, now);

    if (state.weather === 'rain' || state.weather === 'storm') this.drawRain(ctx, time, width, height, state.weather === 'storm');
  }

  drawIsland(ctx, state, time) {
    const island = new Path2D();
    island.moveTo(-390, -10);
    island.bezierCurveTo(-370, -150, -200, -225, 20, -220);
    island.bezierCurveTo(235, -224, 405, -135, 420, 5);
    island.bezierCurveTo(404, 145, 220, 228, -15, 236);
    island.bezierCurveTo(-245, 226, -405, 140, -390, -10);
    island.closePath();

    ctx.save();
    ctx.translate(0, 34);
    ctx.fillStyle = '#3b3026';
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 20;
    ctx.fill(island);
    ctx.restore();

    ctx.save();
    ctx.clip(island);
    const ground = ctx.createRadialGradient(-70, -50, 30, 0, 20, 450);
    ground.addColorStop(0, state.seasonIndex === 3 ? '#d7ded7' : '#8eb36d');
    ground.addColorStop(0.55, state.seasonIndex === 2 ? '#9d9858' : '#658f54');
    ground.addColorStop(1, '#3b6745');
    ctx.fillStyle = ground;
    ctx.fillRect(-450, -270, 900, 540);

    this.drawRiver(ctx, time);
    this.drawMountains(ctx, state);
    this.drawFields(ctx, state);
    this.drawForests(ctx, state, time);
    this.drawSettlements(ctx, state, time);
    this.drawPaths(ctx);
    ctx.restore();

    ctx.strokeStyle = 'rgba(245,237,191,.28)';
    ctx.lineWidth = 2;
    ctx.stroke(island);
  }

  drawRiver(ctx, time) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-120, -225);
    ctx.bezierCurveTo(-90, -120, -170, -58, -92, 15);
    ctx.bezierCurveTo(-20, 78, -22, 152, 45, 236);
    ctx.strokeStyle = '#3f9fa8';
    ctx.lineWidth = 48;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = `rgba(190,242,232,${0.25 + Math.sin(time) * 0.06})`;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }

  drawMountains(ctx, state) {
    const mountains = [
      [-200, -130, 95], [-120, -162, 72], [190, -145, 82], [270, -105, 58]
    ];
    for (const [x, y, size] of mountains) {
      ctx.beginPath();
      ctx.moveTo(x - size, y + size * .7);
      ctx.lineTo(x, y - size);
      ctx.lineTo(x + size, y + size * .7);
      ctx.closePath();
      const grad = ctx.createLinearGradient(x - size, y, x + size, y);
      grad.addColorStop(0, '#505b4c');
      grad.addColorStop(.55, '#8b8b71');
      grad.addColorStop(1, '#454d42');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size * .28, y - size * .3);
      ctx.lineTo(x + size * .1, y - size * .18);
      ctx.lineTo(x + size * .3, y - size * .32);
      ctx.closePath();
      ctx.fillStyle = state.seasonIndex === 3 ? '#f2f2eb' : '#d4d2bd';
      ctx.fill();
    }
  }

  drawFields(ctx, state) {
    const fields = [[80,-70,125,66],[180,15,100,58],[-225,65,110,60]];
    for (const [x,y,w,h] of fields) {
      roundedRect(ctx, x-w/2, y-h/2, w, h, 12);
      ctx.fillStyle = state.seasonIndex === 3 ? '#b7c1ab' : state.seasonIndex === 2 ? '#c49b4e' : '#b6ad58';
      ctx.fill();
      ctx.strokeStyle = 'rgba(83,70,34,.45)';
      ctx.lineWidth = 2;
      for (let offset = -w/2 + 12; offset < w/2; offset += 13) {
        ctx.beginPath();
        ctx.moveTo(x + offset, y - h/2 + 8);
        ctx.lineTo(x + offset + 8, y + h/2 - 8);
        ctx.stroke();
      }
    }
  }

  drawForests(ctx, state, time) {
    const count = Math.round(34 + state.forest * .55);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399 + 0.3;
      const radius = 80 + ((i * 47) % 270);
      let x = Math.cos(angle) * radius;
      let y = Math.sin(angle) * radius * .52;
      if (Math.abs(x + 75) < 65 && y > -190) x += 90;
      const size = 7 + (i % 5) * 1.6;
      const sway = Math.sin(time * .8 + i) * .8;
      ctx.fillStyle = '#3f3424';
      ctx.fillRect(x - 1.5, y, 3, size * .8);
      ctx.beginPath();
      ctx.moveTo(x + sway, y - size * 1.8);
      ctx.lineTo(x - size, y + size * .3);
      ctx.lineTo(x + size, y + size * .3);
      ctx.closePath();
      ctx.fillStyle = state.seasonIndex === 2 ? (i % 3 === 0 ? '#a86638' : '#6e7f3f') : state.seasonIndex === 3 ? '#738977' : (i % 4 === 0 ? '#4f8b55' : '#356f49');
      ctx.fill();
    }
  }

  drawPaths(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(203,184,127,.55)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const routes = [
      [[-95,35],[30,15],[120,-35]],
      [[20,15],[80,100],[210,80]],
      [[-110,40],[-200,72],[-265,35]]
    ];
    for (const route of routes) {
      ctx.beginPath();
      ctx.moveTo(...route[0]);
      ctx.quadraticCurveTo(...route[1], ...route[2]);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSettlements(ctx, state, time) {
    const homes = Math.min(30, state.settlements.reduce((sum, settlement) => sum + settlement.houses, 0));
    for (let i = 0; i < homes; i++) {
      const cluster = i % 2;
      const baseX = cluster ? 150 : -15;
      const baseY = cluster ? 72 : 32;
      const ring = Math.floor(i / 5);
      const angle = i * 1.75;
      const x = baseX + Math.cos(angle) * (20 + ring * 13);
      const y = baseY + Math.sin(angle) * (12 + ring * 8);
      const size = 8 + (i % 3);
      ctx.fillStyle = '#d0a76e';
      ctx.fillRect(x - size, y - size * .5, size * 2, size * 1.25);
      ctx.beginPath();
      ctx.moveTo(x - size - 2, y - size * .5);
      ctx.lineTo(x, y - size * 1.45);
      ctx.lineTo(x + size + 2, y - size * .5);
      ctx.closePath();
      ctx.fillStyle = i % 4 === 0 ? '#6d4935' : '#80563b';
      ctx.fill();
      if (i % 3 === 0) {
        ctx.fillStyle = `rgba(255,220,130,${.65 + Math.sin(time * 2 + i) * .2})`;
        ctx.fillRect(x - 2, y, 3, 3);
      }
    }
    const citizens = Math.min(48, Math.round(state.population / 2.2));
    for (let i = 0; i < citizens; i++) {
      const cluster = i % 2;
      const t = (time * .03 + i / citizens) % 1;
      const x = (cluster ? 145 : -30) + Math.cos(t * TAU + i) * (42 + (i % 4) * 7);
      const y = (cluster ? 72 : 38) + Math.sin(t * TAU + i) * (19 + (i % 3) * 5);
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, TAU);
      ctx.fillStyle = i % 3 === 0 ? '#e4bf67' : '#f0dfbd';
      ctx.fill();
    }
  }

  drawClouds(ctx, time, width, height, state) {
    ctx.save();
    ctx.globalAlpha = state.weather === 'storm' ? .5 : .25;
    for (let i = 0; i < 8; i++) {
      const x = ((time * (5 + i) + i * 241) % (width + 300)) - 150;
      const y = 110 + (i % 4) * 70;
      ctx.fillStyle = state.weather === 'storm' ? '#a7aeaa' : '#dce4db';
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.ellipse(x + j * 24, y + Math.sin(j) * 8, 38, 18, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawStars(ctx, time, width, height) {
    const night = (Math.sin(time * .035) + 1) / 2;
    if (night < .58) return;
    ctx.save();
    ctx.globalAlpha = (night - .58) * 1.3;
    for (let i = 0; i < 55; i++) {
      const x = (i * 193) % width;
      const y = 30 + (i * 71) % Math.max(120, height * .45);
      ctx.fillStyle = i % 5 === 0 ? '#f2d881' : '#d8e3dd';
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();
  }

  drawRain(ctx, time, width, height, storm) {
    ctx.save();
    ctx.strokeStyle = storm ? 'rgba(195,220,225,.42)' : 'rgba(184,220,222,.26)';
    ctx.lineWidth = storm ? 1.4 : 1;
    const count = storm ? 170 : 95;
    for (let i = 0; i < count; i++) {
      const x = (i * 83 + time * (storm ? 520 : 330)) % (width + 80) - 40;
      const y = (i * 47 + time * (storm ? 720 : 510)) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + (storm ? 22 : 15));
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBursts(ctx, now) {
    this.powerBursts = this.powerBursts.filter((burst) => now - burst.time < 1200);
    for (const burst of this.powerBursts) {
      const progress = (now - burst.time) / 1200;
      const radius = 20 + progress * 110;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = burst.power === 'storm' ? '#d28a68' : '#f0d887';
      ctx.lineWidth = 3 - progress * 2;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
  }
}
