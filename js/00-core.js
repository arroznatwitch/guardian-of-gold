'use strict';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const H = 500, UW = 800; let W = 800, UIOX = 0, vign = null;

/* ---------- ecrã adaptável (ocupa a janela toda, mantém proporção) ---------- */
function makeVign() {
  vign = document.createElement('canvas'); vign.width = W; vign.height = H; const x = vign.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, Math.max(W, H) * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
}
function resize() {
  const dpr = window.devicePixelRatio || 1, iw = innerWidth > 50 ? innerWidth : 800, ih = innerHeight > 50 ? innerHeight : 500, asp = iw / ih;
  W = Math.round(Math.max(UW, Math.min(1400, H * asp))); UIOX = (W - UW) / 2;   // o mundo estica para preencher o ecra
  const sc = Math.min(iw / W, ih / H), cw = Math.max(1, Math.floor(W * sc)), ch = Math.max(1, Math.floor(H * sc));
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.width = Math.floor(cw * dpr); cv.height = Math.floor(ch * dpr); makeVign();
}
addEventListener('resize', resize); resize();
function toggleFS() {
  try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) {}
}

