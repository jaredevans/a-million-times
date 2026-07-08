import { PATTERN_NAMES, setPatternOverride, getPatternOverride } from './core/choreography';
import { poseAt, setFormat24h, getFormat24h } from './core/timeline';
import { computeGeometry, drawFrame, type Geometry } from './render/renderer';
import { createFaceSprite } from './render/sprite';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const ctx = canvas.getContext('2d');

if (!ctx) {
  document.body.textContent = 'This page requires HTML canvas support.';
} else {
  const loadMs = Date.now();
  let dpr = 1;
  let geom!: Geometry;
  let sprite!: HTMLCanvasElement;

  const resize = (): void => {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    geom = computeGeometry(window.innerWidth, window.innerHeight);
    sprite = createFaceSprite(geom.clockRadius * 2, dpr);
  };

  window.addEventListener('resize', resize);
  resize();

  // --- Pattern selector bar ---
  const bar = document.getElementById('pattern-bar')!;
  const buttons: HTMLButtonElement[] = [];

  const updateActiveButton = (): void => {
    const override = getPatternOverride();
    buttons.forEach((btn, i) => {
      // Index 0 = Auto, indices 1..N = patterns
      const isActive = i === 0 ? override === null : override === i - 1;
      btn.classList.toggle('active', isActive);
    });
  };

  // 12/24H Format Toggle Button
  const formatBtn = document.createElement('button');
  formatBtn.textContent = getFormat24h() ? '12H' : '24H';
  formatBtn.id = 'btn-format';
  formatBtn.style.marginRight = '16px'; // visually separate from patterns
  formatBtn.addEventListener('click', () => {
    const is24 = !getFormat24h();
    setFormat24h(is24);
    formatBtn.textContent = is24 ? '12H' : '24H';
  });
  bar.appendChild(formatBtn);

  // "Auto" button
  const autoBtn = document.createElement('button');
  autoBtn.textContent = 'Auto';
  autoBtn.id = 'btn-auto';
  autoBtn.addEventListener('click', () => {
    setPatternOverride(null);
    updateActiveButton();
  });
  bar.appendChild(autoBtn);
  buttons.push(autoBtn);

  // One button per pattern
  PATTERN_NAMES.forEach((name, index) => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.id = `btn-${name.toLowerCase()}`;
    btn.addEventListener('click', () => {
      setPatternOverride(index);
      updateActiveButton();
    });
    bar.appendChild(btn);
    buttons.push(btn);
  });

  updateActiveButton();

  // Auto-hide the bar after 3s of no mouse movement
  let hideTimer: ReturnType<typeof setTimeout>;
  const showBar = (): void => {
    bar.classList.remove('hidden');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => bar.classList.add('hidden'), 3000);
  };
  window.addEventListener('mousemove', showBar);
  window.addEventListener('pointerdown', showBar);
  showBar();

  // --- Animation loop ---
  const frame = (): void => {
    drawFrame(ctx, poseAt(Date.now(), loadMs), geom, sprite, dpr, window.innerWidth, window.innerHeight);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
