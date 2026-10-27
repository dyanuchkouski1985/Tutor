type BurstShape = 'peony' | 'crossette';

interface Rocket {
  x: number;
  y: number;
  speed: number;
  targetY: number;
  hue: number;
  shape: BurstShape;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  hue: number;
  size: number;
  isHot: boolean;
  splitIn: number;
}

interface Flash {
  x: number;
  y: number;
  alpha: number;
  hue: number;
}

const launchIntervalMs = 300;
const successRocketsCount = 5;
const fadeOutMs = 1500;
const particlesPerExplosion = 120;
const rocketRadius = 3.75;
const particleRadius = 3;
const particleMaxSpeed = 7.5;
const particleDrag = 0.98;
const trailLength = 3;
const flashRadius = 140;
const flashDecay = 0.12;
const rocketSparkDecay = 0.06;
const crossetteParticlesCount = 36;
const crossetteSpeed = 5;
const crossetteSplitFrames = 30;
const crossetteSplitSpread = 0.3;
const crossetteChildrenCount = 4;
const crossetteChildSpeed = 3;
const crossetteChildSpeedSpread = 0.25;
const crossetteChildAngleSpread = 0.25;
const crossetteChildDecay = 0.03;
const crossetteInheritedSpeed = 0.5;
const crossetteSparkChance = 0.35;
const saturationDrive = 7.2;
const masterVolume = 0.1;
const bodyDurationSeconds = 0.9;
const crackDurationSeconds = 0.06;
const crackleDurationSeconds = 1.2;
const crackleDelaySeconds = 0.12;
const thumpDurationSeconds = 0.45;
const reverbDurationSeconds = 2.5;
const reverbWetGain = 0.35;

interface PopSound {
  play: (pan: number) => void;
  close: () => void;
}

function createNoiseBuffer(
  audio: AudioContext,
  seconds: number,
  channels: number,
  sample: (position: number) => number,
): AudioBuffer {
  const buffer = audio.createBuffer(
    channels,
    Math.floor(audio.sampleRate * seconds),
    audio.sampleRate,
  );
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      data[i] = sample(i / data.length);
    }
  }
  return buffer;
}

function createCrackleBuffer(audio: AudioContext): AudioBuffer {
  const buffer = audio.createBuffer(
    1,
    Math.floor(audio.sampleRate * crackleDurationSeconds),
    audio.sampleRate,
  );
  const data = buffer.getChannelData(0);
  const clickLength = Math.floor(audio.sampleRate * 0.004);
  for (let i = 0; i < data.length - clickLength; i++) {
    const position = i / data.length;
    if (Math.random() < 0.0012 * (1 - position)) {
      const amplitude = (0.4 + Math.random() * 0.6) * (1 - position);
      for (let j = 0; j < clickLength; j++) {
        data[i + j] += (Math.random() * 2 - 1) * amplitude * (1 - j / clickLength);
      }
    }
  }
  return buffer;
}

function playBuffer(
  audio: AudioContext,
  buffer: AudioBuffer,
  destination: AudioNode,
  start: number,
  volume: number,
  filterType: BiquadFilterType,
  frequency: number,
  playbackRate = 1,
) {
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const filter = audio.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;

  const gain = audio.createGain();
  gain.gain.value = volume;

  source.connect(filter).connect(gain).connect(destination);
  source.start(start);
}

function createPopSound(): PopSound | null {
  let audio: AudioContext;
  try {
    audio = new AudioContext();
  } catch {
    return null;
  }
  audio.resume();

  const crackBuffer = createNoiseBuffer(
    audio,
    crackDurationSeconds,
    1,
    (position) => (Math.random() * 2 - 1) * Math.pow(1 - position, 6),
  );
  const bodyBuffer = createNoiseBuffer(
    audio,
    bodyDurationSeconds,
    1,
    (position) => (Math.random() * 2 - 1) * Math.pow(1 - position, 3),
  );
  const crackleBuffer = createCrackleBuffer(audio);

  const master = audio.createGain();
  master.gain.value = masterVolume;
  master.connect(audio.destination);

  const compressor = audio.createDynamicsCompressor();
  compressor.connect(master);

  const saturation = audio.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(saturationDrive * x) / Math.tanh(saturationDrive);
  }
  saturation.curve = curve;
  saturation.oversample = '4x';
  saturation.connect(compressor);

  const reverb = audio.createConvolver();
  reverb.buffer = createNoiseBuffer(
    audio,
    reverbDurationSeconds,
    2,
    (position) => (Math.random() * 2 - 1) * Math.pow(1 - position, 4),
  );
  const reverbGain = audio.createGain();
  reverbGain.gain.value = reverbWetGain;
  reverb.connect(reverbGain).connect(compressor);

  const play = (pan: number) => {
    const now = audio.currentTime;
    const panner = audio.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(saturation);
    panner.connect(reverb);

    playBuffer(audio, crackBuffer, panner, now, 0.7, 'highpass', 800);
    playBuffer(
      audio,
      bodyBuffer,
      panner,
      now,
      0.45 + Math.random() * 0.15,
      'lowpass',
      600 + Math.random() * 600,
      0.7 + Math.random() * 0.3,
    );
    playBuffer(
      audio,
      crackleBuffer,
      panner,
      now + crackleDelaySeconds,
      0.25,
      'highpass',
      2000,
      0.8 + Math.random() * 0.4,
    );

    const thump = audio.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(90 + Math.random() * 40, now);
    thump.frequency.exponentialRampToValueAtTime(40, now + thumpDurationSeconds);

    const thumpGain = audio.createGain();
    thumpGain.gain.setValueAtTime(0.5 + Math.random() * 0.2, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + thumpDurationSeconds);

    thump.connect(thumpGain).connect(panner);
    thump.start(now);
    thump.stop(now + thumpDurationSeconds);
  };

  return {
    play: play,
    close: () => setTimeout(() => audio.close(), reverbDurationSeconds * 1000),
  };
}

function sphereSpeed() {
  const z = Math.random() * 2 - 1;
  return Math.sqrt(1 - z * z) * (0.92 + Math.random() * 0.08);
}

function spark(fields: Pick<Particle, 'x' | 'y' | 'vx' | 'vy' | 'hue'> & Partial<Particle>) {
  return {
    alpha: 1,
    decay: 0.012 + Math.random() * 0.01,
    size: particleRadius,
    isHot: false,
    splitIn: 0,
    ...fields,
  } as Particle;
}

export function launchSuccessFireworks(withSound: boolean) {
  launchFireworks(
    successRocketsCount * launchIntervalMs + fadeOutMs,
    withSound,
    successRocketsCount,
    ['peony', 'crossette'],
  );
}

export function launchFireworks(
  durationMs: number,
  withSound: boolean,
  rocketsCount = Infinity,
  shapes: BurstShape[] = ['peony'],
) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:20000';
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return;
  }

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const popSound = withSound ? createPopSound() : null;
  const rockets: Rocket[] = [];
  const particles: Particle[] = [];
  const flashes: Flash[] = [];
  const start = performance.now();
  let lastFrame = start;
  let lastLaunch = -Infinity;
  let launchedCount = 0;

  const zones = Number.isFinite(rocketsCount)
    ? Array.from({ length: rocketsCount }, (_, i) => i).sort(() => Math.random() - 0.5)
    : [];
  const launchX = (width: number) => {
    if (launchedCount >= zones.length) {
      return width * (0.1 + Math.random() * 0.8);
    }
    const zoneWidth = 0.8 / zones.length;
    return width * (0.1 + (zones[launchedCount] + Math.random()) * zoneWidth);
  };

  const explode = (rocket: Rocket) => {
    popSound?.play(((rocket.x / window.innerWidth) * 2 - 1) * 0.6);
    flashes.push({ x: rocket.x, y: rocket.y, alpha: 1, hue: rocket.hue });

    const isCrossette = rocket.shape === 'crossette';
    const count = isCrossette ? crossetteParticlesCount : particlesPerExplosion;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = sphereSpeed() * (isCrossette ? crossetteSpeed : particleMaxSpeed);
      particles.push(
        spark({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          decay: isCrossette ? 0 : 0.012 + Math.random() * 0.01,
          hue: rocket.hue + Math.random() * 40 - 20,
          isHot: !isCrossette,
          splitIn: isCrossette
            ? crossetteSplitFrames * (1 + (Math.random() * 2 - 1) * crossetteSplitSpread)
            : 0,
        }),
      );
    }
  };

  const split = (particle: Particle) => {
    const rotation = Math.random() * Math.PI * 2;
    for (let i = 0; i < crossetteChildrenCount; i++) {
      const angle =
        rotation +
        (i / crossetteChildrenCount) * Math.PI * 2 +
        (Math.random() * 2 - 1) * crossetteChildAngleSpread;
      const speed =
        crossetteChildSpeed * (1 + (Math.random() * 2 - 1) * crossetteChildSpeedSpread);
      particles.push(
        spark({
          x: particle.x,
          y: particle.y,
          vx: particle.vx * crossetteInheritedSpeed + Math.cos(angle) * speed,
          vy: particle.vy * crossetteInheritedSpeed + Math.sin(angle) * speed,
          decay: crossetteChildDecay + Math.random() * 0.01,
          hue: particle.hue,
          size: particleRadius * 0.8,
          isHot: true,
        }),
      );
    }
  };

  const frame = (now: number) => {
    const elapsed = now - start;
    const dt = Math.min(3, (now - lastFrame) / (1000 / 60));
    lastFrame = now;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (
      launchedCount < rocketsCount &&
      (launchedCount === 0 || elapsed < durationMs - fadeOutMs) &&
      now - lastLaunch > launchIntervalMs
    ) {
      lastLaunch = now;
      rockets.push({
        x: launchX(width),
        y: height,
        speed: height / 60 + Math.random() * (height / 120),
        targetY: height * (0.1 + Math.random() * 0.35),
        hue: Math.random() * 360,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
      launchedCount++;
    }

    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'rgba(0, 0, 0, 0.25)';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';

    for (let i = rockets.length - 1; i >= 0; i--) {
      const rocket = rockets[i];
      rocket.y -= rocket.speed * dt;
      particles.push(
        spark({
          x: rocket.x + Math.random() * 2 - 1,
          y: rocket.y + rocketRadius,
          vx: Math.random() * 0.6 - 0.3,
          vy: Math.random() * 0.8,
          alpha: 0.8,
          decay: rocketSparkDecay + Math.random() * 0.03,
          hue: 40,
          size: 1.5,
        }),
      );
      context.fillStyle = `hsl(${rocket.hue}, 100%, 70%)`;
      context.beginPath();
      context.arc(rocket.x, rocket.y, rocketRadius, 0, Math.PI * 2);
      context.fill();
      if (rocket.y <= rocket.targetY) {
        explode(rocket);
        rockets.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.vx *= particleDrag;
      particle.vy = particle.vy * particleDrag + 0.06 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.alpha -= particle.decay * dt;
      if (particle.splitIn > 0) {
        particle.splitIn -= dt;
        if (Math.random() < crossetteSparkChance) {
          particles.push(
            spark({
              x: particle.x,
              y: particle.y,
              vx: Math.random() * 0.4 - 0.2,
              vy: Math.random() * 0.4,
              alpha: 0.7,
              decay: rocketSparkDecay + Math.random() * 0.03,
              hue: particle.hue,
              size: 1.2,
            }),
          );
        }
        if (particle.splitIn <= 0) {
          split(particle);
          particles.splice(i, 1);
          continue;
        }
      }
      if (particle.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      const heat = particle.isHot ? Math.max(0, (particle.alpha - 0.75) / 0.25) : 0;
      context.strokeStyle = `hsla(${particle.hue}, ${100 - heat * 60}%, ${60 + heat * 35}%, ${particle.alpha})`;
      context.lineWidth = particle.size * 2 * (0.35 + 0.65 * particle.alpha);
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(
        particle.x - particle.vx * dt * trailLength,
        particle.y - particle.vy * dt * trailLength,
      );
      context.lineTo(particle.x, particle.y);
      context.stroke();
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const flash = flashes[i];
      flash.alpha -= flashDecay * dt;
      if (flash.alpha <= 0) {
        flashes.splice(i, 1);
        continue;
      }
      const gradient = context.createRadialGradient(
        flash.x,
        flash.y,
        0,
        flash.x,
        flash.y,
        flashRadius,
      );
      gradient.addColorStop(0, `hsla(${flash.hue}, 100%, 90%, ${flash.alpha * 0.6})`);
      gradient.addColorStop(1, `hsla(${flash.hue}, 100%, 60%, 0)`);
      context.fillStyle = gradient;
      context.fillRect(
        flash.x - flashRadius,
        flash.y - flashRadius,
        flashRadius * 2,
        flashRadius * 2,
      );
    }

    if (elapsed < durationMs || rockets.length || particles.length || flashes.length) {
      requestAnimationFrame(frame);
    } else {
      window.removeEventListener('resize', resize);
      canvas.remove();
      popSound?.close();
    }
  };

  requestAnimationFrame(frame);
}
