import { COLS, ROWS } from '../core/layout';
import type { GridPose } from '../core/types';

export interface Geometry {
  cell: number;
  originX: number;
  originY: number;
  clockRadius: number;
}

export function computeGeometry(width: number, height: number): Geometry {
  const cell = Math.min(width / (COLS + 1), height / (ROWS + 1));
  return {
    cell,
    originX: (width - cell * COLS) / 2,
    originY: (height - cell * ROWS) / 2,
    clockRadius: cell * 0.47,
  };
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angleDeg: number,
  len: number,
  width: number,
): void {
  const rad = (angleDeg * Math.PI) / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(rad) * len, cy - Math.cos(rad) * len);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1c1b1a';
  ctx.stroke();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  pose: GridPose,
  geom: Geometry,
  sprite: HTMLCanvasElement,
  dpr: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#d8d3ca';
  ctx.fillRect(0, 0, width, height);

  const spriteCss = sprite.width / dpr;
  const handLen = geom.clockRadius * 0.9;
  const handWidth = Math.max(1.5, geom.clockRadius * 0.11);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cx = geom.originX + (col + 0.5) * geom.cell;
      const cy = geom.originY + (row + 0.5) * geom.cell;
      ctx.drawImage(sprite, cx - spriteCss / 2, cy - spriteCss / 2, spriteCss, spriteCss);

      const [a, b] = pose[row * COLS + col];
      drawHand(ctx, cx, cy, a, handLen, handWidth);
      drawHand(ctx, cx, cy, b, handLen, handWidth);

      ctx.beginPath();
      ctx.arc(cx, cy, handWidth * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1b1a';
      ctx.fill();
    }
  }
  ctx.restore();
}
