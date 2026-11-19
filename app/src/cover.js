// Neon Vice Cover Studio — the cover renderer.
//
// Turns a cover state (layout, grade, caption, four panels) into poster art on
// any canvas: multi-panel layouts, sunset/neon gradient-map grades, Anton
// title lettering with a black outline and neon glow, a Pacifico script
// subtitle, film grain and a vignette. Plain Canvas 2D only — no libraries,
// no network, nothing leaves the machine.

/** Every layout the studio can draw. */
export const LAYOUTS = ['hero', 'grid', 'full', 'tilt'];

/** The four colour grades: gradient stops plus a translucent wash. */
export const GRADES = {
  sunset: { a: '#ff2e88', b: '#ff9a3d', wash: 'rgba(255,90,40,0.20)' },
  neon: { a: '#00e5d4', b: '#ff2e9a', wash: 'rgba(255,46,154,0.16)' },
  golden: { a: '#ffd166', b: '#ff7a1a', wash: 'rgba(255,170,40,0.18)' },
  noir: { a: '#8a8a8a', b: '#111111', wash: 'rgba(0,0,0,0.25)' },
};

/** A new cover: hero layout, Vice Sunset grade, the default caption. */
export function freshState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'NEON VICE',
    subtitle: 'after dark in the city',
    grain: true,
    vignette: true,
    selected: 0,
    showSelection: false,
    panels: [0, 1, 2, 3].map(() => ({ img: null, zoom: 1, ox: 0, oy: 0 })),
    rects: [],
  };
}

/** Where each panel sits for a layout, in canvas pixels. */
export function panelRects(layout, w, h) {
  const g = Math.max(3, Math.round(w * 0.012));

  if (layout === 'grid') {
    const pw = (w - g) / 2;
    const ph = (h - g) / 2;
    return [
      { x: 0, y: 0, w: pw, h: ph, rot: 0 },
      { x: pw + g, y: 0, w: pw, h: ph, rot: 0 },
      { x: 0, y: ph + g, w: pw, h: ph, rot: 0 },
      { x: pw + g, y: ph + g, w: pw, h: ph, rot: 0 },
    ];
  }

  if (layout === 'full') {
    // One photo fills the whole cover; the other panels are empty.
    const empty = { x: 0, y: 0, w: 0, h: 0, rot: 0 };
    return [{ x: 0, y: 0, w, h, rot: 0 }, empty, empty, empty];
  }

  if (layout === 'tilt') {
    // A full-bleed backdrop with three overlapping tilted snapshots.
    const cw = w * 0.44;
    const ch = h * 0.4;
    return [
      { x: 0, y: 0, w, h, rot: 0 },
      { x: w * 0.05, y: h * 0.06, w: cw, h: ch, rot: -0.1 },
      { x: w * 0.51, y: h * 0.16, w: cw, h: ch, rot: 0.08 },
      { x: w * 0.28, y: h * 0.42, w: cw, h: ch, rot: -0.05 },
    ];
  }

  // hero: one tall panel on the left, three stacked on the right.
  const heroW = w * 0.62;
  const sideX = heroW + g;
  const sideW = w - sideX;
  const sh = (h - 2 * g) / 3;
  return [
    { x: 0, y: 0, w: heroW, h, rot: 0 },
    { x: sideX, y: 0, w: sideW, h: sh, rot: 0 },
    { x: sideX, y: sh + g, w: sideW, h: sh, rot: 0 },
    { x: sideX, y: 2 * (sh + g), w: sideW, h: sh, rot: 0 },
  ];
}

/** Cover-fits one photo into a panel rect, applying zoom and pan offsets. */
function paintPhoto(ctx, img, rect, panel, noir) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(w / iw, h / ih) * panel.zoom;
    const pw = iw * scale;
    const ph = ih * scale;
    const dx = x + (w - pw) / 2 + panel.ox * w;
    const dy = y + (h - ph) / 2 + panel.oy * h;
    if (noir) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
    ctx.drawImage(img, dx, dy, pw, ph);
    ctx.filter = 'none';
  } else {
    // Empty panel: a dark violet gradient with faint diagonal stripes.
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#3a1c5c');
    grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    for (let d = -h; d < w; d += 26) {
      ctx.beginPath();
      ctx.moveTo(x + d, y + h);
      ctx.lineTo(x + d + h, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The deterministic noise tile the grain overlay repeats. */
let noiseCanvas = null;
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement('canvas');
  c.width = 140;
  c.height = 140;
  const nctx = c.getContext('2d');
  const data = nctx.createImageData(140, 140);
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 28;
  }
  nctx.putImageData(data, 0, 0);
  noiseCanvas = c;
  return c;
}

/** The largest font size (starting at `start`) that fits `text` in `maxWidth`. */
function fitTextSize(ctx, family, start, text, maxWidth) {
  let size = start;
  ctx.font = `400 ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `400 ${size}px ${family}`;
  }
  return size;
}

/** Paints one panel: white frame or tilted card, plus the empty-panel label. */
function paintPanel(ctx, canvas, state, i, rect, noir) {
  const panel = state.panels[i];
  const w = canvas.width;
  if (rect.rot) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const bw = Math.max(6, w * 0.012);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rect.rot);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.max(12, w * 0.02);
    ctx.shadowOffsetY = Math.max(6, canvas.height * 0.01);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-rect.w / 2 - bw / 2, -rect.h / 2 - bw / 2, rect.w + bw, rect.h + bw);
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rect.rot);
    paintPhoto(ctx, panel.img, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }, panel, noir);
    ctx.restore();
  } else {
    paintPhoto(ctx, panel.img, rect, panel, noir);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  if (!panel.img) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.save();
    if (rect.rot) {
      ctx.translate(cx, cy);
      ctx.rotate(rect.rot);
      ctx.translate(-cx, -cy);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.max(13, Math.round(rect.h * 0.09))}px system-ui, sans-serif`;
    ctx.fillText(`PANEL ${i + 1}`, cx, cy - rect.h * 0.06);
    ctx.font = `${Math.max(11, Math.round(rect.h * 0.05))}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('add a photo', cx, cy + rect.h * 0.06);
    ctx.restore();
  }
}

/** Draws the whole cover onto `canvas` from `state`; stores rects on state. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const noir = state.grade === 'noir';

  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  state.rects = rects;

  // Tilted stack: the backdrop first, then the cards on top of it.
  if (state.layout === 'tilt') {
    paintPhoto(ctx, state.panels[0].img, rects[0], state.panels[0], noir);
  }
  for (let i = 0; i < 4; i++) {
    if (state.layout === 'full' && i > 0) continue;
    if (state.layout === 'tilt' && i === 0) continue;
    const r = rects[i];
    if (!r || r.w <= 0 || r.h <= 0) continue;
    paintPanel(ctx, canvas, state, i, r, noir);
  }

  // Grade: a diagonal gradient wash blended over the photos.
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, grade.a);
  wash.addColorStop(1, grade.b);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = noir ? 0.25 : 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Title band: a dark gradient rising from the foot so the lettering pops.
  const band = ctx.createLinearGradient(0, h * 0.58, 0, h);
  band.addColorStop(0, 'rgba(10,4,20,0)');
  band.addColorStop(0.55, 'rgba(10,4,20,0.55)');
  band.addColorStop(1, 'rgba(10,4,20,0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  // Neon script subtitle above the big Anton title.
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const titleSize = fitTextSize(ctx, 'Anton, "Arial Black", sans-serif', Math.round(h * 0.16), title || 'NEON VICE', w * 0.92);
  const titleY = h - h * 0.055;
  if (subtitle) {
    const subSize = fitTextSize(ctx, 'Pacifico, cursive', Math.round(h * 0.055), subtitle, w * 0.86);
    ctx.save();
    ctx.translate(w / 2, titleY - titleSize * 1.02);
    ctx.rotate(-0.02);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ff6ec7';
    ctx.shadowColor = '#ff2e9a';
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillText(subtitle, 0, 0);
    ctx.restore();
  }
  if (title) {
    ctx.save();
    ctx.font = `${titleSize}px Anton, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0414';
    ctx.lineWidth = Math.max(4, titleSize * 0.1);
    ctx.shadowColor = 'rgba(255,46,154,0.65)';
    ctx.shadowBlur = titleSize * 0.18;
    ctx.shadowOffsetY = titleSize * 0.03;
    ctx.strokeText(title, w / 2, titleY);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = titleSize * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, titleY);
    ctx.restore();
  }

  // Footer disclaimer, always printed on the cover.
  ctx.save();
  ctx.font = `${Math.max(11, Math.round(h * 0.016))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText('Fan-made concept art. Not affiliated with Rockstar Games.', w / 2, h - Math.max(8, h * 0.012));
  ctx.restore();

  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Dashed outline of the selected panel — editor only, never on exports.
  if (state.showSelection && state.rects[state.selected]) {
    const r = state.rects[state.selected];
    ctx.save();
    ctx.strokeStyle = '#ff2e9a';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.setLineDash([Math.max(8, w * 0.014), Math.max(6, w * 0.01)]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
}
