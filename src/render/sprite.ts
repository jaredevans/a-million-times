/** Pre-render the static clock face (shadow + face + bezel) once; blitted 288x per frame. */
export function createFaceSprite(faceDiameter: number, dpr: number): HTMLCanvasElement {
  const pad = faceDiameter * 0.18;
  const sizeCss = faceDiameter + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(sizeCss * dpr));
  canvas.height = canvas.width;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const c = sizeCss / 2;
  const r = faceDiameter / 2;

  ctx.shadowColor = 'rgba(60, 50, 40, 0.28)';
  ctx.shadowBlur = faceDiameter * 0.09;
  ctx.shadowOffsetY = faceDiameter * 0.035;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f7f5f0';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.arc(c, c, r - faceDiameter * 0.015, 0, Math.PI * 2);
  ctx.strokeStyle = '#dcd6cb';
  ctx.lineWidth = faceDiameter * 0.03;
  ctx.stroke();

  return canvas;
}
