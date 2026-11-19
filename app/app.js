// Vice Cover Lab — a multi-panel, GTA-poster-style cover art maker.
// Everything runs locally: photos are read from the visitor's own machine,
// drawn onto a canvas with a Vice City colour grade, captioned, and exported
// as a PNG. No network requests, no uploads, no third-party code.

const POST_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

// Panel layouts as polygons in normalised [0,1] canvas coordinates.
// Shared slanted edges give the diagonal, comic-cover composition.
const LAYOUTS = {
  triptych: [
    [[0, 0], [0.62, 0], [0.54, 1], [0, 1]],
    [[0.62, 0], [1, 0], [1, 0.54], [0.577, 0.54]],
    [[0.577, 0.54], [1, 0.54], [1, 1], [0.54, 1]],
  ],
  quad: [
    [[0, 0], [0.52, 0], [0.48, 0.52], [0, 0.55]],
    [[0.52, 0], [1, 0], [1, 0.48], [0.48, 0.52]],
    [[0, 0.55], [0.48, 0.52], [0.44, 1], [0, 1]],
    [[0.48, 0.52], [1, 0.48], [1, 1], [0.44, 1]],
  ],
  collage: [
    [[0, 0], [1, 0], [1, 0.46], [0, 0.52]],
    [[0, 0.52], [0.5, 0.49], [0.47, 0.78], [0, 0.8]],
    [[0.5, 0.49], [1, 0.46], [1, 0.78], [0.47, 0.78]],
    [[0, 0.8], [0.47, 0.78], [0.45, 1], [0, 1]],
    [[0.47, 0.78], [1, 0.78], [1, 1], [0.45, 1]],
  ],
};

const GRADES = {
  sunset: {
    filter: 'saturate(1.45) contrast(1.1) brightness(1.03)',
    wash: ['rgba(255,94,98,0.20)', 'rgba(255,154,0,0.10)', 'rgba(70,0,130,0.26)'],
  },
  neon: {
    filter: 'saturate(1.6) contrast(1.16) hue-rotate(-8deg)',
    wash: ['rgba(57,213,232,0.16)', 'rgba(255,0,128,0.10)', 'rgba(20,0,60,0.30)'],
  },
  clean: {
    filter: 'saturate(1.12) contrast(1.05)',
    wash: ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.0)', 'rgba(0,0,0,0.14)'],
  },
};

const TITLE_FONT = '"Arial Narrow", "Liberation Sans Narrow", Impact, "Helvetica Neue", sans-serif';

const state = {
  size: 'portrait',
  layout: 'triptych',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'One last score in the city of neon',
  photos: [], // { img, name }
  pickedPhoto: 0,
  selectedPanel: 0,
  panels: [], // { photo, zoom, ox, oy } per panel of the current layout
};

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');

function freshPanel(photoIndex, span = false) {
  return { photo: photoIndex, zoom: 1, ox: 0, oy: 0, span };
}

function resetPanels(fillPhoto) {
  const count = LAYOUTS[state.layout].length;
  state.panels = [];
  for (let i = 0; i < count; i++) {
    if (fillPhoto !== undefined) {
      // One photo spanning the whole cover: drawn once across the canvas and
      // clipped by each panel, so the picture stays continuous across panels.
      state.panels.push(freshPanel(fillPhoto, true));
    } else {
      const idx = state.photos.length ? i % state.photos.length : 0;
      state.panels.push(freshPanel(idx));
    }
  }
  state.selectedPanel = 0;
}

function panelPath(poly, w, h) {
  const path = new Path2D();
  poly.forEach(([x, y], i) => {
    if (i === 0) path.moveTo(x * w, y * h);
    else path.lineTo(x * w, y * h);
  });
  path.closePath();
  return path;
}

function shrinkPoly(poly, amount) {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map(([x, y]) => [cx + (x - cx) * (1 - amount), cy + (y - cy) * (1 - amount)]);
}

function drawPanelPhoto(target, poly, panel) {
  const w = target.canvas.width;
  const h = target.canvas.height;
  const photo = state.photos[panel.photo];
  const path = panelPath(poly, w, h);
  target.save();
  target.clip(path);
  // Backdrop inside the panel while a photo loads / when none is chosen.
  const bg = target.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#3b2a63');
  bg.addColorStop(1, '#17102a');
  target.fillStyle = bg;
  target.fillRect(0, 0, w, h);
  if (photo && photo.img.complete && photo.img.naturalWidth > 0) {
    let bx = 0, by = 0, bw = w, bh = h;
    if (!panel.span) {
      const xs = poly.map(p => p[0]);
      const ys = poly.map(p => p[1]);
      bx = Math.min(...xs) * w;
      by = Math.min(...ys) * h;
      bw = (Math.max(...xs) - Math.min(...xs)) * w;
      bh = (Math.max(...ys) - Math.min(...ys)) * h;
    }
    const iw = photo.img.naturalWidth;
    const ih = photo.img.naturalHeight;
    const scale = Math.max(bw / iw, bh / ih) * panel.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = bx + (bw - dw) / 2 + panel.ox * bw;
    const dy = by + (bh - dh) / 2 + panel.oy * bh;
    try { target.filter = GRADES[state.grade].filter; } catch (e) { /* older engines */ }
    target.drawImage(photo.img, dx, dy, dw, dh);
    try { target.filter = 'none'; } catch (e) { /* ignore */ }
  }
  target.restore();
  // Panel separator: heavy dark edge with a light inner line, poster style.
  target.save();
  target.lineJoin = 'round';
  target.strokeStyle = 'rgba(10,6,20,0.92)';
  target.lineWidth = Math.max(6, w * 0.007);
  target.stroke(path);
  target.strokeStyle = 'rgba(255,255,255,0.20)';
  target.lineWidth = Math.max(1.5, w * 0.0016);
  target.stroke(path);
  target.restore();
}

function applyGradeWash(target) {
  const w = target.canvas.width;
  const h = target.canvas.height;
  const [top, mid, bottom] = GRADES[state.grade].wash;
  const grad = target.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top);
  grad.addColorStop(0.5, mid);
  grad.addColorStop(1, bottom);
  target.save();
  target.globalCompositeOperation = 'overlay';
  target.fillStyle = grad;
  target.fillRect(0, 0, w, h);
  target.globalCompositeOperation = 'source-over';
  // Gentle vignette to seat the caption.
  const vg = target.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,4,18,0.34)');
  target.fillStyle = vg;
  target.fillRect(0, 0, w, h);
  target.restore();
}

function fitFontSize(target, text, maxWidth, startSize, weight) {
  let size = startSize;
  while (size > 18) {
    target.font = `${weight} ${size}px ${TITLE_FONT}`;
    if (target.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function drawCaption(target) {
  const w = target.canvas.width;
  const h = target.canvas.height;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  target.save();
  target.textAlign = 'center';
  target.textBaseline = 'alphabetic';
  // Lay the caption out from the bottom edge up, so nothing can clip.
  const subSize = subtitle ? fitFontSize(target, subtitle.toUpperCase(), w * 0.86, Math.round(w * 0.032), 700) : 0;
  const subY = h * 0.962;
  const baseY = subtitle ? subY - subSize * 2.1 : h * 0.93;
  if (title) {
    const size = fitFontSize(target, title, w * 0.92, Math.round(w * 0.115), 900);
    target.font = `900 ${size}px ${TITLE_FONT}`;
    try { target.letterSpacing = `${Math.round(size * 0.02)}px`; } catch (e) { /* ignore */ }
    // Soft dark plate behind the lettering so it reads over any photo.
    const tw = target.measureText(title).width;
    target.fillStyle = 'rgba(10,5,22,0.42)';
    const plateH = size * 1.34;
    target.fillRect((w - tw) / 2 - size * 0.35, baseY - size * 1.08, tw + size * 0.7, plateH);
    const grad = target.createLinearGradient(0, baseY - size, 0, baseY);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffd76e');
    grad.addColorStop(1, '#ff5e8a');
    target.shadowColor = 'rgba(0,0,0,0.65)';
    target.shadowBlur = Math.round(size * 0.12);
    target.shadowOffsetY = Math.round(size * 0.05);
    target.lineWidth = Math.max(2, size * 0.055);
    target.strokeStyle = 'rgba(16,6,26,0.9)';
    target.strokeText(title, w / 2, baseY);
    target.fillStyle = grad;
    target.fillText(title, w / 2, baseY);
    target.shadowColor = 'transparent';
    target.shadowBlur = 0;
    target.shadowOffsetY = 0;
  }
  if (subtitle) {
    const size = subSize;
    target.font = `700 ${size}px ${TITLE_FONT}`;
    try { target.letterSpacing = `${Math.round(size * 0.22)}px`; } catch (e) { /* ignore */ }
    target.fillStyle = 'rgba(255,255,255,0.94)';
    target.shadowColor = 'rgba(0,0,0,0.7)';
    target.shadowBlur = Math.round(size * 0.3);
    target.fillText(subtitle.toUpperCase(), w / 2, subY);
    target.shadowColor = 'transparent';
    target.shadowBlur = 0;
  }
  target.restore();
}

function renderCover(target) {
  const w = target.canvas.width;
  const h = target.canvas.height;
  target.save();
  target.fillStyle = '#0d0918';
  target.fillRect(0, 0, w, h);
  const polys = LAYOUTS[state.layout];
  polys.forEach((poly, i) => {
    const panel = state.panels[i] || freshPanel(0);
    drawPanelPhoto(target, shrinkPoly(poly, 0.012), panel);
  });
  applyGradeWash(target);
  // Outer frame line.
  target.strokeStyle = 'rgba(255,255,255,0.85)';
  target.lineWidth = Math.max(3, w * 0.004);
  target.strokeRect(target.lineWidth / 2, target.lineWidth / 2, w - target.lineWidth, h - target.lineWidth);
  target.restore();
  drawCaption(target);
}

function render() {
  const { w, h } = POST_SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx);
  drawSelectionHint();
}

function drawSelectionHint() {
  const poly = LAYOUTS[state.layout][state.selectedPanel];
  if (!poly) return;
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = 'rgba(57,213,232,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke(panelPath(poly, canvas.width, canvas.height));
  ctx.restore();
}

// The exported PNG is rendered without the editor's selection dashes.
function exportCanvas() {
  const { w, h } = POST_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off.getContext('2d'));
  return off;
}

function exportPNG() {
  exportCanvas().toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vice-cover.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}

// ---- photos ---------------------------------------------------------------

function addPhoto(img, name) {
  state.photos.push({ img, name });
  const idx = state.photos.length - 1;
  if (state.photos.length === 1) {
    state.pickedPhoto = 0;
    resetPanels(0);
  }
  buildPhotoStrip();
  render();
  return idx;
}

function loadPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => addPhoto(img, file.name);
  img.src = url;
}

function loadSample(name, src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(addPhoto(img, name));
    img.onerror = () => resolve(-1);
    img.src = src;
  });
}

function buildPhotoStrip() {
  const strip = document.getElementById('photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = photo.name;
    if (i === state.pickedPhoto) btn.className = 'is-picked';
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    btn.appendChild(thumb);
    btn.addEventListener('click', () => {
      state.pickedPhoto = i;
      buildPhotoStrip();
    });
    strip.appendChild(btn);
  });
}

// ---- panel interaction ----------------------------------------------------

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) / rect.width,
    y: (evt.clientY - rect.top) / rect.height,
  };
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function panelAt(x, y) {
  const polys = LAYOUTS[state.layout];
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPoly(x, y, polys[i])) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', evt => {
  const p = canvasPoint(evt);
  const idx = panelAt(p.x, p.y);
  if (idx < 0) return;
  if (idx !== state.selectedPanel) {
    state.selectedPanel = idx;
    syncPanelControls();
  } else if (state.photos.length > 0) {
    // Clicking the selected panel again paints the picked photo into it.
    state.panels[idx].photo = state.pickedPhoto;
    state.panels[idx].span = false;
  }
  drag = { panel: idx, x: evt.clientX, y: evt.clientY };
  canvas.setPointerCapture(evt.pointerId);
  render();
});

canvas.addEventListener('pointermove', evt => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[drag.panel];
  panel.ox += (evt.clientX - drag.x) / rect.width;
  panel.oy += (evt.clientY - drag.y) / rect.height;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
  drag.x = evt.clientX;
  drag.y = evt.clientY;
  syncPanelControls();
  render();
});

canvas.addEventListener('pointerup', () => { drag = null; });

// Double-click a panel to reset its crop.
canvas.addEventListener('dblclick', evt => {
  const p = canvasPoint(evt);
  const idx = panelAt(p.x, p.y);
  if (idx < 0) return;
  const panel = state.panels[idx];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  state.selectedPanel = idx;
  syncPanelControls();
  render();
});

canvas.addEventListener('wheel', evt => {
  evt.preventDefault();
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (evt.deltaY < 0 ? 1.06 : 0.94)));
  syncPanelControls();
  render();
}, { passive: false });

// ---- controls ---------------------------------------------------------------

function syncPanelControls() {
  const panel = state.panels[state.selectedPanel] || freshPanel(0);
  document.getElementById('zoomRange').value = Math.round(panel.zoom * 100);
  document.getElementById('oxRange').value = Math.round(panel.ox * 100);
  document.getElementById('oyRange').value = Math.round(panel.oy * 100);
  document.getElementById('panelReadout').textContent =
    `Panel ${state.selectedPanel + 1} of ${state.panels.length} selected. Drag on the cover to reposition its photo; scroll to zoom. Click a panel once to select it, again to paint the picked photo in.`;
}

function wireChips(rowId, attr, apply) {
  const row = document.getElementById(rowId);
  row.addEventListener('click', evt => {
    const btn = evt.target.closest(`[data-${attr}]`);
    if (!btn) return;
    row.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-on', c === btn));
    apply(btn.dataset[attr]);
    render();
  });
}

function initControls() {
  wireChips('layoutRow', 'layout', value => {
    state.layout = value;
    resetPanels();
    syncPanelControls();
  });
  wireChips('sizeRow', 'size', value => { state.size = value; });
  wireChips('gradeRow', 'grade', value => { state.grade = value; });

  document.getElementById('titleInput').addEventListener('input', evt => {
    state.title = evt.target.value;
    render();
  });
  document.getElementById('subtitleInput').addEventListener('input', evt => {
    state.subtitle = evt.target.value;
    render();
  });
  document.getElementById('exportBtn').addEventListener('click', exportPNG);
  document.getElementById('fillAllBtn').addEventListener('click', () => {
    state.panels.forEach(p => { p.photo = state.pickedPhoto; p.span = true; });
    render();
  });
  document.getElementById('resetPanelBtn').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    if (panel) { panel.zoom = 1; panel.ox = 0; panel.oy = 0; }
    syncPanelControls();
    render();
  });
  const bindRange = (id, key, scale) => {
    document.getElementById(id).addEventListener('input', evt => {
      const panel = state.panels[state.selectedPanel];
      if (!panel) return;
      panel[key] = Number(evt.target.value) * scale;
      render();
    });
  };
  bindRange('zoomRange', 'zoom', 0.01);
  bindRange('oxRange', 'ox', 0.01);
  bindRange('oyRange', 'oy', 0.01);

  // Arrow keys nudge the selected panel's photo; +/- zoom it.
  window.addEventListener('keydown', evt => {
    if (evt.target.matches('input, textarea')) return;
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    const step = evt.shiftKey ? 0.05 : 0.015;
    if (evt.key === 'ArrowLeft') panel.ox -= step;
    else if (evt.key === 'ArrowRight') panel.ox += step;
    else if (evt.key === 'ArrowUp') panel.oy -= step;
    else if (evt.key === 'ArrowDown') panel.oy += step;
    else if (evt.key === '+' || evt.key === '=') panel.zoom = Math.min(3, panel.zoom * 1.05);
    else if (evt.key === '-') panel.zoom = Math.max(1, panel.zoom * 0.95);
    else return;
    evt.preventDefault();
    syncPanelControls();
    render();
  });

  const input = document.getElementById('fileInput');
  input.addEventListener('change', () => {
    [...input.files].forEach(loadPhotoFile);
    input.value = '';
  });
  const drop = document.getElementById('dropZone');
  ['dragover', 'dragenter'].forEach(name => drop.addEventListener(name, evt => {
    evt.preventDefault();
    drop.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach(name => drop.addEventListener(name, evt => {
    evt.preventDefault();
    drop.classList.remove('is-over');
  }));
  drop.addEventListener('drop', evt => {
    [...evt.dataTransfer.files].filter(f => f.type.startsWith('image/')).forEach(loadPhotoFile);
  });
}

// ---- shot / deep-link setup -------------------------------------------------
// ?photo=boulevard|pier ?layout=triptych|quad|collage ?size=square|portrait|wide
// ?title=... ?subtitle=... ?mode=span (one photo fills every panel)

async function init() {
  initControls();
  const q = new URLSearchParams(location.search);
  await loadSample('boulevard.jpg', 'samples/boulevard.jpg');
  await loadSample('pier.jpg', 'samples/pier.jpg');

  const first = q.get('photo') === 'pier' ? 1 : 0;
  state.pickedPhoto = first;
  buildPhotoStrip();

  if (q.get('layout') && LAYOUTS[q.get('layout')]) {
    state.layout = q.get('layout');
    document.querySelectorAll('#layoutRow .chip').forEach(c =>
      c.classList.toggle('is-on', c.dataset.layout === state.layout));
  }
  if (q.get('size') && POST_SIZES[q.get('size')]) {
    state.size = q.get('size');
    document.querySelectorAll('#sizeRow .chip').forEach(c =>
      c.classList.toggle('is-on', c.dataset.size === state.size));
  }
  if (q.get('grade') && GRADES[q.get('grade')]) {
    state.grade = q.get('grade');
    document.querySelectorAll('#gradeRow .chip').forEach(c =>
      c.classList.toggle('is-on', c.dataset.grade === state.grade));
  }
  if (q.get('title') !== null) {
    state.title = q.get('title');
    document.getElementById('titleInput').value = state.title;
  }
  if (q.get('subtitle') !== null) {
    state.subtitle = q.get('subtitle');
    document.getElementById('subtitleInput').value = state.subtitle;
  }

  if (q.get('mode') === 'span') {
    resetPanels(first);
  } else {
    resetPanels();
    // Default look: alternate the loaded photos across the panels, starting
    // with the requested lead photo.
    state.panels.forEach((p, i) => {
      p.photo = state.photos.length ? (first + i) % state.photos.length : 0;
    });
  }
  syncPanelControls();
  render();
  document.body.dataset.ready = '1';
}

// Hooks the screenshot harness (and curious users) can call: the very same
// render the Export button uses, returned as a PNG data URL.
window.viceCoverLab = {
  exportDataURL: () => exportCanvas().toDataURL('image/png'),
  setSize: value => { state.size = value; render(); },
  state,
};

init();
