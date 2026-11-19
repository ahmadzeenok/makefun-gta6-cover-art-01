// Neon Vice Cover Studio — wires the page together.
//
// Four photo panels (upload your own photo, pick a bundled sample, zoom with
// the slider, drag the photo inside the canvas to position it), four layouts,
// four grades, an editable Anton title with a Pacifico neon subtitle, film
// grain and vignette toggles, and one-click PNG export in 1080x1080,
// 1080x1350 and 1920x1080. A `?shot=` query sets up a fixed scene for a
// screenshot (see ./shots.js).

import { drawCover, freshState, GRADES, LAYOUTS } from './cover.js';
import { shotConfig, markShotReady, SIZES } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = freshState();
state.showSelection = true;
let exportSize = SIZES.square;

const SAMPLES = ['boulevard', 'pier', 'friends-neon', 'man-rooftop'];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

/** Resizes the canvas backing store for an export size and redraws. */
function setCanvasSize(w, h) {
  canvas.width = w;
  canvas.height = h;
  redraw();
}

function redraw() {
  drawCover(canvas, state);
  syncPanelCards();
}

/** Keeps each panel card's selected highlight and zoom slider in sync. */
function syncPanelCards() {
  document.querySelectorAll('.panel-card').forEach((card) => {
    const i = Number(card.dataset.panel);
    card.classList.toggle('selected', i === state.selected);
    const zoom = card.querySelector('.zoom');
    if (zoom && document.activeElement !== zoom) zoom.value = state.panels[i].zoom;
  });
}

/** Drops an image into one panel — or into every panel — and redraws. */
function placePhoto(img, index, all) {
  const targets = all ? [0, 1, 2, 3] : [index];
  for (const i of targets) {
    state.panels[i].img = img;
    state.panels[i].zoom = 1;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
  }
  redraw();
}

/** Loads a bundled sample photo by name. */
async function loadSample(name) {
  return loadImage(`samples/${name}.jpg`);
}

// ---- panel cards: upload, sample picks, zoom, "use in all panels" ----
document.querySelectorAll('.panel-card').forEach((card) => {
  const i = Number(card.dataset.panel);
  card.addEventListener('click', (e) => {
    if (e.target.closest('input,button,select')) return;
    state.selected = i;
    redraw();
  });
  card.querySelector('.upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      placePhoto(img, i, false);
      statusEl.textContent = `Panel ${i + 1}: photo loaded from your machine.`;
    } catch {
      statusEl.textContent = 'That file could not be read as a photo.';
    }
  });
  card.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        placePhoto(await loadSample(btn.dataset.sample), i, false);
        statusEl.textContent = `Panel ${i + 1}: sample “${btn.dataset.sample}” loaded.`;
      } catch {
        statusEl.textContent = 'Sample photo failed to load.';
      }
    });
  });
  card.querySelector('.zoom').addEventListener('input', (e) => {
    state.panels[i].zoom = Number(e.target.value);
    redraw();
  });
  card.querySelector('.fill-all').addEventListener('click', () => {
    const img = state.panels[i].img;
    if (!img) {
      statusEl.textContent = 'Load a photo into this panel first.';
      return;
    }
    placePhoto(img, i, true);
    statusEl.textContent = 'One photo now fills all four panels.';
  });
});

// ---- layout and grade pickers ----
function wireChoice(attr, apply) {
  document.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      apply(btn.dataset[attr]);
      document.querySelectorAll(`[data-${attr}]`).forEach((b) => b.classList.toggle('active', b === btn));
      redraw();
    });
  });
}
wireChoice('layout', (v) => { state.layout = v; });
wireChoice('grade', (v) => { state.grade = v; });

// ---- caption, effects, export size ----
document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('grain').addEventListener('change', (e) => {
  state.grain = e.target.checked;
  redraw();
});
document.getElementById('vignette').addEventListener('change', (e) => {
  state.vignette = e.target.checked;
  redraw();
});
document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    exportSize = SIZES[btn.dataset.size];
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    setCanvasSize(exportSize[0], exportSize[1]);
  });
});

/** Renders the cover at an exact export size and downloads it as a PNG. */
function exportCover(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const snap = { ...state, showSelection: false };
  drawCover(off, snap);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved neon-vice-cover-${w}x${h}.png`;
  }, 'image/png');
}
document.getElementById('export').addEventListener('click', () => {
  exportCover(exportSize[0], exportSize[1]);
});
document.getElementById('export-all').addEventListener('click', () => {
  for (const [w, h] of Object.values(SIZES)) exportCover(w, h);
  statusEl.textContent = 'Exporting all three sizes…';
});

// ---- drag-to-pan on the canvas: click selects a panel, drag moves its photo ----
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
function panelAt(p) {
  for (let i = state.rects.length - 1; i >= 0; i--) {
    const r = state.rects[i];
    if (r && r.w > 0 && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(p);
  if (hit < 0) return;
  state.selected = hit;
  drag = { start: p, ox: state.panels[hit].ox, oy: state.panels[hit].oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const r = state.rects[state.selected];
  if (!r || r.w <= 0) return;
  const dx = (p.x - drag.start.x) / r.w;
  const dy = (p.y - drag.start.y) / r.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  state.panels[state.selected].ox = Math.max(-1, Math.min(1, drag.ox + dx));
  state.panels[state.selected].oy = Math.max(-1, Math.min(1, drag.oy + dy));
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});

// ---- shot mode: a fixed, reproducible scene for screenshots ----
async function runShotMode() {
  const cfg = shotConfig(new URLSearchParams(location.search));
  state.layout = LAYOUTS.includes(cfg.layout) ? cfg.layout : 'hero';
  state.grade = cfg.grade in GRADES ? cfg.grade : 'sunset';
  state.title = cfg.title;
  state.subtitle = cfg.subtitle;
  state.showSelection = false;
  document.getElementById('title').value = cfg.title;
  document.getElementById('subtitle').value = cfg.subtitle;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  setCanvasSize(cfg.size[0], cfg.size[1]);
  if (cfg.cover) document.body.classList.add('shot-cover');
  const names = cfg.photos.length ? cfg.photos : ['pier'];
  for (let i = 0; i < 4; i++) {
    const name = names[Math.min(i, names.length - 1)];
    try {
      state.panels[i].img = await loadSample(SAMPLES.includes(name) ? name : 'pier');
    } catch {
      state.panels[i].img = null;
    }
  }
  redraw();
  await document.fonts.ready;
  markShotReady();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShotMode().catch(() => markShotReady());
} else {
  setCanvasSize(exportSize[0], exportSize[1]);
  // Preload the bundled samples so the first click is instant, and open with
  // a ready-made cover: hero photo left, friends right, boulevard, pier.
  loadSample('man-rooftop').then((img) => { state.panels[0].img = img; redraw(); }).catch(() => {});
  loadSample('friends-neon').then((img) => { state.panels[1].img = img; redraw(); }).catch(() => {});
  loadSample('boulevard').then((img) => { state.panels[2].img = img; redraw(); }).catch(() => {});
  loadSample('pier').then((img) => { state.panels[3].img = img; redraw(); }).catch(() => {});
  document.fonts.ready.then(() => redraw());
}
