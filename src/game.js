const TAU = Math.PI * 2;

export class ThreeWorld {
  constructor(canvas, THREE, simulation) {
    this.THREE = THREE;
    this.canvas = canvas;
    this.simulation = simulation;
    this.selectedPower = 'observe';
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.orbit = { azimuth: -0.7, polar: 0.88, radius: 29, dragging: false, x: 0, y: 0 };
    this.effects = [];
    this.audio = null;
    this.time = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.4));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x315c5a);
    this.scene.fog = new THREE.FogExp2(0x244744, 0.018);
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 120);
    this.world = new THREE.Group();
    this.scene.add(this.world);

    this.buildLights();
    this.buildIsland();
    this.buildWater();
    this.buildMountains();
    this.buildVegetation();
    this.buildSettlements();
    this.buildAtmosphere();
    this.bindControls();

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    window.addEventListener('resize', this.resize);
    this.renderer.setAnimationLoop(this.animate);
  }

  random(index) {
    const value = Math.sin(this.simulation.seed * 0.013 + index * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  height(x, z) {
    const edge = Math.max(0, 1 - Math.hypot(x, z) / 11.4);
    return Math.max(-0.3, edge * (0.42 + Math.sin(x * 0.52) * 0.36 + Math.cos(z * 0.58) * 0.32));
  }

  buildLights() {
    const T = this.THREE;
    this.hemi = new T.HemisphereLight(0xd6ebe2, 0x263426, 1.9);
    this.sun = new T.DirectionalLight(0xffe5a1, 3.2);
    this.sun.position.set(-12, 18, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 50 });
    this.sun.shadow.bias = -0.0002;
    this.rim = new T.DirectionalLight(0x73aab3, 0.9);
    this.rim.position.set(10, 8, -12);
    this.scene.add(this.hemi, this.sun, this.rim);
  }

  buildIsland() {
    const T = this.THREE;
    const geometry = new T.CircleGeometry(11.6, 96);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    const colors = [];
    const color = new T.Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const y = this.height(x, z);
      position.setY(i, y);
      color.setHSL(0.29, 0.34, 0.34 + Math.max(0, y) * 0.08);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.terrain = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }));
    this.terrain.receiveShadow = true;
    this.world.add(this.terrain);

    const cliff = new T.Mesh(
      new T.CylinderGeometry(10.9, 6.5, 4.7, 64, 4),
      new T.MeshStandardMaterial({ color: 0x514638, roughness: 1, flatShading: true })
    );
    cliff.position.y = -2.7;
    cliff.castShadow = cliff.receiveShadow = true;
    const underside = new T.Mesh(
      new T.ConeGeometry(6.5, 5.2, 48, 2),
      new T.MeshStandardMaterial({ color: 0x302b24, roughness: 1, flatShading: true })
    );
    underside.position.y = -7.5;
    underside.castShadow = true;
    this.world.add(cliff, underside);
  }

  buildWater() {
    const T = this.THREE;
    const material = new T.MeshStandardMaterial({ color: 0x4aa4a8, emissive: 0x123c40, emissiveIntensity: 0.45, roughness: 0.25, transparent: true, opacity: 0.94 });
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(-3.8, 1.05, -5.5), new T.Vector3(-3.1, 0.65, -2.8),
      new T.Vector3(-1.7, 0.35, -0.5), new T.Vector3(-1.0, 0.12, 2.5),
      new T.Vector3(0.2, -0.05, 6), new T.Vector3(1.1, -0.15, 9.2)
    ]);
    this.river = new T.Mesh(new T.TubeGeometry(curve, 72, 0.34, 7), material);
    const lake = new T.Mesh(new T.CircleGeometry(1.7, 40), material.clone());
    lake.rotation.x = -Math.PI / 2;
    lake.scale.set(1.7, 1, 1);
    lake.position.set(-3.8, 1.02, -5.5);
    this.world.add(this.river, lake);
  }

  buildMountains() {
    const T = this.THREE;
    const peaks = [[-4.7, -3.4, 2.6], [-3.0, -4.1, 1.8], [5.8, -4, 1.6], [7.1, -2.5, 1.15]];
    for (const [x, z, size] of peaks) {
      const group = new T.Group();
      const rock = new T.Mesh(new T.ConeGeometry(size, size * 2.8, 7, 3), new T.MeshStandardMaterial({ color: 0x6c7062, roughness: 1, flatShading: true }));
      const snow = new T.Mesh(new T.ConeGeometry(size * 0.55, size * 0.92, 7), new T.MeshStandardMaterial({ color: 0xeeeade, roughness: 0.9, flatShading: true }));
      rock.castShadow = rock.receiveShadow = snow.castShadow = true;
      snow.position.y = size * 1.8;
      group.add(rock, snow);
      group.position.set(x, this.height(x, z) + size * 1.25, z);
      this.world.add(group);
    }
  }

  buildVegetation() {
    const T = this.THREE;
    const count = 150;
    const dummy = new T.Object3D();
    this.crownMaterial = new T.MeshStandardMaterial({ color: 0x376f45, roughness: 0.95, flatShading: true });
    this.trunks = new T.InstancedMesh(new T.CylinderGeometry(0.055, 0.075, 0.58, 5), new T.MeshStandardMaterial({ color: 0x4a3423 }), count);
    this.crowns = new T.InstancedMesh(new T.ConeGeometry(0.34, 0.95, 6, 2), this.crownMaterial, count);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399;
      const radius = 3 + this.random(i) * 7.2;
      let x = Math.cos(angle) * radius;
      let z = Math.sin(angle) * radius;
      if (Math.abs(x + 1.5) < 1.4) x += 1.9;
      const scale = 0.72 + this.random(i + 300) * 0.7;
      dummy.position.set(x, this.height(x, z) + 0.28 * scale, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.y = this.random(i + 600) * TAU;
      dummy.updateMatrix();
      this.trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.56 * scale;
      dummy.updateMatrix();
      this.crowns.setMatrixAt(i, dummy.matrix);
    }
    this.trunks.castShadow = this.crowns.castShadow = true;
    this.world.add(this.trunks, this.crowns);

    this.fields = new T.Group();
    for (const [x, z, sx, sz] of [[2.1, -0.5, 2.2, 1.3], [4, 2.2, 1.7, 1.2], [-4.5, 2.7, 1.8, 1.2]]) {
      const field = new T.Mesh(new T.BoxGeometry(sx, 0.08, sz), new T.MeshStandardMaterial({ color: 0xaaa14a, roughness: 1 }));
      field.position.set(x, this.height(x, z) + 0.08, z);
      field.rotation.y = x * 0.18;
      field.receiveShadow = true;
      this.fields.add(field);
    }
    this.world.add(this.fields);
  }

  buildSettlements() {
    const T = this.THREE;
    this.houses = [];
    const centers = [new T.Vector3(-0.2, 0, 1.1), new T.Vector3(4.4, 0, 2.8)];
    for (let i = 0; i < 34; i++) {
      const center = centers[i % 2];
      const ring = Math.floor(i / 7);
      const angle = i * 1.8;
      const x = center.x + Math.cos(angle) * (0.7 + ring * 0.5);
      const z = center.z + Math.sin(angle) * (0.5 + ring * 0.36);
      const house = new T.Group();
      const body = new T.Mesh(new T.BoxGeometry(0.46, 0.34, 0.38), new T.MeshStandardMaterial({ color: 0xd2aa70, roughness: 1 }));
      const roof = new T.Mesh(new T.ConeGeometry(0.39, 0.29, 4), new T.MeshStandardMaterial({ color: i % 4 ? 0x7b5137 : 0x674633, roughness: 1 }));
      body.position.y = 0.17;
      roof.position.y = 0.47;
      roof.rotation.y = Math.PI / 4;
      body.castShadow = roof.castShadow = true;
      house.add(body, roof);
      house.position.set(x, this.height(x, z), z);
      house.rotation.y = angle;
      house.scale.setScalar(i < 8 ? 0.9 : 0.001);
      this.houses.push(house);
      this.world.add(house);
    }

    this.citizenCount = 64;
    this.citizenData = [];
    const citizens = new T.InstancedMesh(new T.CapsuleGeometry(0.055, 0.16, 2, 5), new T.MeshStandardMaterial({ color: 0xf0d99e, roughness: 0.8 }), this.citizenCount);
    const dummy = new T.Object3D();
    for (let i = 0; i < this.citizenCount; i++) {
      const center = centers[i % 2];
      this.citizenData.push({ center, angle: this.random(i + 900) * TAU, radius: 0.8 + this.random(i + 1000) * 2.2, speed: 0.2 + this.random(i + 1100) * 0.35 });
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      citizens.setMatrixAt(i, dummy.matrix);
    }
    citizens.castShadow = true;
    this.citizens = citizens;
    this.world.add(citizens);
  }

  buildAtmosphere() {
    const T = this.THREE;
    this.clouds = new T.Group();
    const cloudMaterial = new T.MeshStandardMaterial({ color: 0xe6ece5, transparent: true, opacity: 0.42, roughness: 1 });
    for (let i = 0; i < 12; i++) {
      const cloud = new T.Group();
      for (let j = 0; j < 4; j++) {
        const puff = new T.Mesh(new T.SphereGeometry(0.55 + j * 0.08, 10, 7), cloudMaterial);
        puff.position.set(j * 0.55, Math.sin(j) * 0.16, 0);
        cloud.add(puff);
      }
      cloud.position.set(-18 + this.random(i) * 36, 6 + this.random(i + 20) * 7, -14 + this.random(i + 40) * 28);
      cloud.scale.setScalar(0.7 + this.random(i + 60));
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);

    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      positions[i * 3] = (this.random(i + 1300) - 0.5) * 34;
      positions[i * 3 + 1] = this.random(i + 1500) * 16;
      positions[i * 3 + 2] = (this.random(i + 1700) - 0.5) * 34;
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    this.rainMaterial = new T.PointsMaterial({ color: 0xbde2e5, size: 0.08, transparent: true, opacity: 0 });
    this.rain = new T.Points(geometry, this.rainMaterial);
    this.scene.add(this.rain);
  }

  bindControls() {
    this.canvas.addEventListener('pointerdown', (event) => {
      this.orbit.dragging = true;
      this.orbit.x = event.clientX;
      this.orbit.y = event.clientY;
      this.canvas.setPointerCapture?.(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.orbit.dragging) return;
      this.orbit.azimuth -= (event.clientX - this.orbit.x) * 0.005;
      this.orbit.polar = Math.max(0.38, Math.min(1.3, this.orbit.polar + (event.clientY - this.orbit.y) * 0.004));
      this.orbit.x = event.clientX;
      this.orbit.y = event.clientY;
    });
    const stop = () => { this.orbit.dragging = false; };
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointercancel', stop);
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.orbit.radius = Math.max(18, Math.min(38, this.orbit.radius + event.deltaY * 0.012));
    }, { passive: false });
  }

  updateCamera() {
    const { azimuth, polar, radius } = this.orbit;
    this.camera.position.set(Math.cos(azimuth) * Math.sin(polar) * radius, Math.cos(polar) * radius + 1.5, Math.sin(azimuth) * Math.sin(polar) * radius);
    this.camera.lookAt(0, 0, 0);
  }

  updateSimulation(state, delta) {
    const T = this.THREE;
    const visibleHouses = Math.min(this.houses.length, state.settlements.reduce((sum, settlement) => sum + settlement.houses, 0));
    this.houses.forEach((house, index) => {
      const target = index < visibleHouses ? 0.9 : 0.001;
      const scale = house.scale.x + (target - house.scale.x) * Math.min(1, delta * 5);
      house.scale.setScalar(scale);
    });

    const visibleCitizens = Math.min(this.citizenCount, Math.max(8, Math.round(state.population * 0.42)));
    const dummy = new T.Object3D();
    this.citizenData.forEach((data, index) => {
      data.angle += data.speed * delta * Math.max(0.2, this.simulation.speed);
      const x = data.center.x + Math.cos(data.angle) * data.radius;
      const z = data.center.z + Math.sin(data.angle) * data.radius * 0.72;
      dummy.position.set(x, this.height(x, z) + 0.16, z);
      dummy.rotation.y = -data.angle;
      dummy.scale.setScalar(index < visibleCitizens ? 1 : 0.001);
      dummy.updateMatrix();
      this.citizens.setMatrixAt(index, dummy.matrix);
    });
    this.citizens.instanceMatrix.needsUpdate = true;

    const treeColors = [0x376f45, 0x427c48, 0x75693a, 0x71847b];
    this.crownMaterial.color.lerp(new T.Color(treeColors[state.seasonIndex]), Math.min(1, delta));
    const fieldColors = [0x9f984a, 0xb6a84e, 0xa87b3e, 0xa8b19e];
    this.fields.children.forEach((field) => field.material.color.lerp(new T.Color(fieldColors[state.seasonIndex]), Math.min(1, delta)));
    const weatherOpacity = state.weather === 'clear' ? 0 : state.weather === 'rain' ? 0.3 : 0.65;
    this.rainMaterial.opacity += (weatherOpacity - this.rainMaterial.opacity) * Math.min(1, delta * 3);
  }

  setPower(power) {
    this.selectedPower = power;
  }

  usePower(power, clientX, clientY) {
    const T = this.THREE;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const point = this.raycaster.intersectObject(this.terrain)[0]?.point || new T.Vector3();
    const colors = { observe: 0xc9d9d2, forest: 0x77bd72, rain: 0x6eb3c7, raise: 0xd8b255, inspire: 0xf0d887, storm: 0xd0775b };
    const ring = new T.Mesh(new T.RingGeometry(0.35, 0.5, 40), new T.MeshBasicMaterial({ color: colors[power], transparent: true, side: T.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(point).add(new T.Vector3(0, 0.08, 0));
    this.scene.add(ring);
    this.effects.push({ object: ring, age: 0 });
  }

  updateEffects(delta) {
    this.effects = this.effects.filter((effect) => {
      effect.age += delta;
      effect.object.scale.setScalar(1 + effect.age * 4.5);
      effect.object.material.opacity = Math.max(0, 1 - effect.age * 1.25);
      if (effect.age > 0.8) {
        this.scene.remove(effect.object);
        effect.object.geometry.dispose();
        effect.object.material.dispose();
        return false;
      }
      return true;
    });
  }

  animate() {
    const delta = Math.min(0.05, this.clock.getDelta());
    this.time += delta * Math.max(0.25, this.simulation.speed);
    const daylight = 0.5 + 0.5 * Math.sin(this.time * 0.035 + 0.45);
    const angle = this.time * 0.016;
    this.sun.position.set(Math.cos(angle) * 18, 7 + daylight * 16, Math.sin(angle) * 15);
    this.sun.intensity = 0.35 + daylight * 3;
    this.hemi.intensity = 0.5 + daylight * 1.6;
    this.renderer.toneMappingExposure = 0.72 + daylight * 0.48;
    this.scene.background.set(0x07141c).lerp(new this.THREE.Color(0x315f5e), 0.2 + daylight * 0.8);
    this.scene.fog.color.copy(this.scene.background);
    this.updateCamera();
    this.clouds.children.forEach((cloud, index) => {
      cloud.position.x += delta * (0.18 + index * 0.01);
      if (cloud.position.x > 22) cloud.position.x = -22;
    });
    const positions = this.rain.geometry.attributes.position;
    if (this.rainMaterial.opacity > 0.01) {
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) - delta * 12;
        if (y < -1) y = 15;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
    this.updateEffects(delta);
    this.river.material.emissiveIntensity = 0.42 + Math.sin(this.time * 1.5) * 0.08;
    this.world.rotation.y += this.orbit.dragging ? 0 : delta * 0.012;
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 900 ? 1.15 : 1.4));
    this.renderer.setSize(innerWidth, innerHeight, false);
  }

  toggleSound() {
    if (!this.audio) {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0.035;
      const first = context.createOscillator();
      const second = context.createOscillator();
      first.frequency.value = 110;
      second.frequency.value = 164.8;
      second.type = 'triangle';
      first.connect(gain);
      second.connect(gain);
      gain.connect(context.destination);
      first.start();
      second.start();
      this.audio = { context, gain, muted: false };
      return;
    }
    this.audio.muted = !this.audio.muted;
    this.audio.gain.gain.setTargetAtTime(this.audio.muted ? 0 : 0.035, this.audio.context.currentTime, 0.2);
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.audio?.context.close();
  }
}
