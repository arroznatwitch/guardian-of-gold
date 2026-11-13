'use strict';
/* =====================================================================
   INPUT / ESTADO
   ===================================================================== */
const keys = {}; let mouse = { x: W / 2, y: H / 2 }, mdown = false;
let state = 'menu', tab = 'farm', ui = [], R = null, T = 0, capture = null, keysBack = 'menu', optBack = 'menu', menuConfirm = false, anvSel = 0;
const DASH_CD = 6;   // espera da esquiva (Shift), em segundos
const BASE_SPD = 1.12;   // o jogo normal corre um pouco mais depressa
let gameSpeed = 1; try { gameSpeed = localStorage.getItem('bladehunter_speed') === '2' ? 2 : 1; } catch (e) {}
function toggleSpeed() { gameSpeed = gameSpeed === 1 ? 2 : 1; try { localStorage.setItem('bladehunter_speed', String(gameSpeed)); } catch (e) {} SFX.click(); }
let autoAtk = false; try { autoAtk = localStorage.getItem('bladehunter_auto') === '1'; } catch (e) {}
let anv = { t: 0, res: null, msg: '', msgT: 0, sparks: [] }, anvHist = [], anvLucky = false, anvProt = false;
const K = a => !!keys[binds[a]];

addEventListener('keydown', e => {
  initAudio();
  if (state === 'hub' && (tab === 'rank' || tab === 'guild') && (rk.prof || rk.gp) && e.code === 'Escape') { if (rk.prof) rk.prof = null; else rk.gp = null; return; }
  if (state === 'hub' && e.code === 'Escape' && (farmInfo >= 0 || presAsk >= 0 || petRename)) { farmInfo = -1; presAsk = -1; petRename = ''; rk.focus = ''; return; }
  if ((state === 'login' || (state === 'hub' && (tab === 'rank' || tab === 'profile' || tab === 'ach' || tab === 'pets' || tab === 'guild'))) && rk.focus && !capture && rankKey(e)) return;
  if (capture) { e.preventDefault(); if (e.code !== 'Escape') setBind(capture, e.code); capture = null; return; }
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') muted = !muted;
  if (e.code === 'KeyF') toggleFS();
  if (state === 'play') {
    if (e.code === binds.special) special(); else if (e.code === binds.skill) skill(); else if (e.code === binds.dash) dash();
    else if (e.code === binds.auto) { autoAtk = !autoAtk; try { localStorage.setItem('bladehunter_auto', autoAtk ? '1' : '0'); } catch (er) {} SFX.click(); }
    else if (e.code === binds.speed) toggleSpeed();
    else if (e.code === binds.pause || e.code === 'KeyP') state = 'pause';
  } else if (state === 'pause') { if (e.code === binds.pause || e.code === 'KeyP') state = 'play'; }
  else if (state === 'keys') { if (e.code === 'Escape') state = keysBack; }
  else if (state === 'options') { if (e.code === 'Escape') state = optBack; }
  else if (state === 'menu' && ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) { const n = menuItems.length || 1; menuSel = (menuSel + (e.code === 'ArrowUp' || e.code === 'KeyW' ? n - 1 : 1)) % n; menuConfirm = false; SFX.click(); }
  else if (e.code === 'Enter') {
    if (state === 'win' || state === 'lose') goHub(); else if (state === 'menu') menuActivate();
  }
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mdown = false; stopHold(); if (state === 'play') state = 'pause'; });
function setBind(a, code) {
  for (const o in binds) if (o !== a && binds[o] === code) binds[o] = binds[a];
  binds[a] = code; saveBinds();
}
function toLocal(e) { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; }
let activeDrag = null, holdBtn = null, holdTimer = null;
function stopHold() { if (holdTimer) { clearTimeout(holdTimer); clearInterval(holdTimer); holdTimer = null; } holdBtn = null; }
function startHold(b) {
  stopHold(); holdBtn = b;
  holdTimer = setTimeout(() => { holdTimer = setInterval(() => { const q = holdBtn; if (!q || state !== 'hub' || mouse.x - UIOX < q.x || mouse.x - UIOX > q.x + q.w || mouse.y < q.y || mouse.y > q.y + q.h) { stopHold(); return; } q.fn(); }, 45); }, 380);
}
cv.addEventListener('mousemove', e => { toLocal(e); if (activeDrag) activeDrag.fn(); });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  initAudio(); toLocal(e);
  if (state === 'play') { if (e.button === 2) special(); else mdown = true; return; }
  if (capture) { capture = null; return; }
  for (let i = ui.length - 1; i >= 0; i--) {
    const b = ui[i];
    if (mouse.x - UIOX >= b.x && mouse.x - UIOX <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h) { if (b.drag) activeDrag = b; else SFX.click(); b.fn(); if (b.rep) startHold(b); return; }
  }
});
addEventListener('mouseup', () => { mdown = false; stopHold(); if (activeDrag) { if (activeDrag.rel) activeDrag.rel(); activeDrag = null; } });
function goHub() { state = 'hub'; tab = 'farm'; setMusic('calm'); }

