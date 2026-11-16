'use strict';
/* =====================================================================
   TOQUE (telemovel / tablet): joystick, botoes de habilidade e teclado
   - Fora do combate o toque faz o mesmo que o rato (reaproveita os mesmos eventos).
   - Em combate: joystick a esquerda (andar), botoes a direita (esquiva, habilidade, especial, pausa).
     O ataque e automatico e a mira vai para o inimigo mais proximo.
   - Campos de texto (login, nomes): abre-se o teclado do sistema atraves de um <input> escondido.
   ===================================================================== */
let touchMode = false;
try { touchMode = matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (e) {}
let touchAutoSet = false;
const tc = { stick: null, ui: null, btn: {} };
const STICK_R = 56;

function touchEnable() {
  if (touchMode && touchAutoSet) return; touchMode = true;
  if (!touchAutoSet) { touchAutoSet = true; autoAtk = true; }   // ataque automatico (sem guardar na definicao: so enquanto se joga com toque)
}
if (touchMode) touchEnable();

const tpt = t => { const r = cv.getBoundingClientRect(); return { x: (t.clientX - r.left) * W / r.width, y: (t.clientY - r.top) * H / r.height }; };
function fwd(type, t) { cv.dispatchEvent(new MouseEvent(type, { clientX: t.clientX, clientY: t.clientY, button: 0, bubbles: true, cancelable: true, view: window })); }

function touchButtons() {
  const p = R && R.p, w = (typeof curW === 'function' && save) ? curW() : null;
  return [
    { id: 'dash', x: W - 62, y: H - 130, r: 34, fn: () => dash(), label: E2('Dash', 'Esquiva'), cd: p ? p.dashCd : 0, max: DASH_CD, col: '#4a9ad0' },
    { id: 'skill', x: W - 148, y: H - 112, r: 30, fn: () => skill(), label: E2('Skill', 'Hab.'), cd: p ? p.sk : 0, max: w ? w.sk.cd : 6, col: '#7cf' },
    { id: 'spec', x: W - 62, y: H - 214, r: 30, fn: () => special(), label: E2('Special', 'Esp.'), cd: p ? p.sp : 0, max: 8, col: '#fc6' },
    { id: 'pause', x: W - 34, y: 106, r: 20, fn: () => { state = 'pause'; }, label: 'II', cd: 0, max: 1, col: '#aab' },
  ];
}
const tcClear = () => { tc.stick = null; keys.ArrowLeft = keys.ArrowRight = keys.ArrowUp = keys.ArrowDown = false; };

cv.addEventListener('touchstart', e => {
  touchEnable(); initAudio(); e.preventDefault();
  for (const t of e.changedTouches) {
    const q = tpt(t);
    if (state === 'play' && R && R.p) {
      const b = touchButtons().find(b => Math.hypot(q.x - b.x, q.y - b.y) <= b.r + 10);
      if (b) { b.fn(); tc.btn[t.identifier] = b.id; continue; }
      if (q.x < W * .55 && !tc.stick) tc.stick = { id: t.identifier, x: q.x, y: q.y, dx: 0, dy: 0 };
    } else if (tc.ui === null) { tc.ui = t.identifier; fwd('mousemove', t); fwd('mousedown', t); }
  }
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (tc.stick && t.identifier === tc.stick.id) {
      const q = tpt(t); let dx = q.x - tc.stick.x, dy = q.y - tc.stick.y; const d = Math.hypot(dx, dy);
      if (d > STICK_R) { tc.stick.x += dx / d * (d - STICK_R); tc.stick.y += dy / d * (d - STICK_R); dx = dx / d * STICK_R; dy = dy / d * STICK_R; }   // a base segue o dedo
      tc.stick.dx = dx; tc.stick.dy = dy; const dz = STICK_R * .3;
      keys.ArrowLeft = dx < -dz; keys.ArrowRight = dx > dz; keys.ArrowUp = dy < -dz; keys.ArrowDown = dy > dz;
    } else if (t.identifier === tc.ui) fwd('mousemove', t);
  }
}, { passive: false });
const tEnd = e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (tc.stick && t.identifier === tc.stick.id) tcClear();
    else if (t.identifier === tc.ui) { fwd('mouseup', t); tc.ui = null; kbSync(); }
    delete tc.btn[t.identifier];
  }
};
cv.addEventListener('touchend', tEnd, { passive: false }); cv.addEventListener('touchcancel', tEnd, { passive: false });

/* mira: o inimigo mais proximo (para o especial e a habilidade) e botoes/joystick no ecra */
function drawTouch() {
  if (!touchMode || state !== 'play' || !R || !R.p) { if (tc.stick) tcClear(); return; }
  const p = R.p; let best = null, bd = 1e9;
  for (const en of targets()) { const d = Math.hypot(en.x - p.x, en.y - p.y); if (d < bd) { bd = d; best = en; } }
  if (best) { mouse.x = best.x; mouse.y = best.y; } else { mouse.x = p.x + (p.flip ? -120 : 120); mouse.y = p.y; }
  ctx.save();
  const s = tc.stick, bx = s ? s.x : 104, by = s ? s.y : H - 104;
  ctx.globalAlpha = s ? .5 : .22; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(bx, by, STICK_R, 0, 7); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = s ? .8 : .3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + (s ? s.dx : 0), by + (s ? s.dy : 0), 22, 0, 7); ctx.fill();
  for (const b of touchButtons()) {
    const on = Object.values(tc.btn).includes(b.id), rdy = !(b.cd > 0);
    ctx.globalAlpha = on ? .85 : .5; ctx.fillStyle = rdy ? '#101020' : '#050508'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = rdy ? b.col : '#555'; ctx.stroke();
    if (!rdy && b.max > 0) { ctx.globalAlpha = .8; ctx.strokeStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, 1 - b.cd / b.max)); ctx.stroke(); }
    ctx.globalAlpha = .95; txt(b.label, b.x, b.y + 5, b.r > 25 ? 13 : 14, rdy ? '#fff' : '#889', 'center', 'bold');
  }
  ctx.restore();
}

/* teclado do sistema para os campos de texto do jogo (rk.focus) */
const kb = document.createElement('input');
kb.id = 'kb'; kb.type = 'text'; kb.autocomplete = 'off'; kb.autocapitalize = 'off'; kb.spellcheck = false; kb.setAttribute('aria-label', 'texto');
kb.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;pointer-events:none';
document.body.appendChild(kb);
const KB_MARK = '​', fakeKey = (code, key) => ({ code, key, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} });
const kbReset = () => { kb.value = KB_MARK; };
kb.addEventListener('keydown', e => {
  e.stopPropagation();   // o jogo nao deve ver o que se escreve aqui
  if (!rk.focus) return;
  if (['Enter', 'Backspace', 'Tab', 'Escape'].includes(e.key)) { e.preventDefault(); rankKey(fakeKey(e.key, e.key)); if (e.key === 'Escape' || !rk.focus) kb.blur(); }
});
kb.addEventListener('input', () => {
  const v = kb.value; kbReset();
  if (!rk.focus) return;
  if (v.length === 0) { rankKey(fakeKey('Backspace', 'Backspace')); return; }   // apagou a marca = Backspace
  for (const ch of v.replace(/​/g, '')) if (ch.length === 1) rankKey(fakeKey('Key' + ch, ch));
});
function kbSync() { try { if (rk.focus) { if (document.activeElement !== kb) { kbReset(); kb.focus(); } } else if (document.activeElement === kb) kb.blur(); } catch (e) {} }
setInterval(() => { if (touchMode) kbSync(); }, 400);
