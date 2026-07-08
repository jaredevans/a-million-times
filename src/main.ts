import { poseAt } from './core/timeline';
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

  const frame = (): void => {
    drawFrame(ctx, poseAt(Date.now(), loadMs), geom, sprite, dpr, window.innerWidth, window.innerHeight);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
