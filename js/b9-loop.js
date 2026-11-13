'use strict';
/* =====================================================================
   LOOP
   ===================================================================== */
/* cursores em pixel art: seta dourada nos menus, mira durante o jogo */
const CUR = (() => {
  const mk = (w, h, draw, hx, hy) => { try { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return `url(${c.toDataURL()}) ${hx} ${hy}, auto`; } catch (e) { return ''; } };
  const ARROW = ['X...........', 'XX..........', 'XwX.........', 'XwwX........', 'XwwwX.......', 'XwwwwX......', 'XwwwwwX.....', 'XwwwwwwX....', 'XwwwwwwwX...', 'XwwwwwXXXX..', 'XwwXwwX.....', 'XwX.XwwX....', 'XX..XwwX....', 'X....XwwX...', '.....XwwX...', '......XX....'];
  const arrow = (fill, line) => ctx2 => { ARROW.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; ctx2.fillStyle = ch === 'X' ? line : fill; ctx2.fillRect(x * 2, y * 2, 2, 2); })); };
  const aim = ctx2 => {
    ctx2.fillStyle = '#1a1208'; ctx2.fillRect(14, 1, 5, 11); ctx2.fillRect(14, 21, 5, 11); ctx2.fillRect(1, 14, 11, 5); ctx2.fillRect(21, 14, 11, 5); ctx2.fillRect(13, 13, 7, 7);
    ctx2.fillStyle = '#fff'; ctx2.fillRect(15, 2, 3, 9); ctx2.fillRect(15, 22, 3, 9); ctx2.fillRect(2, 15, 9, 3); ctx2.fillRect(22, 15, 9, 3);
    ctx2.fillStyle = '#ffd34a'; ctx2.fillRect(15, 15, 3, 3);
  };
  return { arrow: mk(26, 34, arrow('#fff4c8', '#3a2a10'), 0, 0), hand: mk(26, 34, arrow('#ffd34a', '#3a2a10'), 0, 0), aim: mk(33, 33, aim, 16, 16) };
})();
let last = performance.now();
let frameErr = 0;
function frame(now) {
  requestAnimationFrame(frame);   // o proximo fotograma e pedido logo: uma falha pontual nunca para o jogo
  try {
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  const k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.imageSmoothingEnabled = false;
  ui = []; confirmTick(dt); cv.style.cursor = state === 'play' ? CUR.aim : CUR.arrow; updateAnvil(dt); updateEnchant(dt); updateFuse(dt); updateUnlock(dt); if (state === 'hub') checkUnlocks(); if (state === 'hub' && window.__skRef) { const r = window.__skRef; window.__skRef = null; hubToast = { t: 7, s: T2('Skins reembolsadas: ', 'Skins refunded: ') + (r[0] ? '¢' + gfmt(r[0]) + ' ' : '') + (r[1] ? '◆' + r[1] : ''), col: '#ffd34a' }; } if (chestAnim > 0) chestAnim -= dt; if (save && save.gold > GOLD_MAX) save.gold = GOLD_MAX;
  if (state === 'play') for (let i = 0; i < gameSpeed && state === 'play'; i++) { sfxQuiet = i > 0; update(dt * BASE_SPD); } sfxQuiet = false;
  if (ONLINE_URL && !on.token && ['menu', 'class', 'keys', 'hub', 'options', 'sync', 'syncerr', 'conflict'].includes(state)) state = 'login';
  if (['menu', 'class', 'keys', 'hub', 'options', 'login', 'sync', 'syncerr', 'conflict'].includes(state)) { ctx.save(); ctx.translate(UIOX, 0); ({ menu: () => { drawMenu(); menuAccount(); }, class: drawClass, keys: drawKeys, hub: () => { drawHub(); drawGuildProfile(); drawProfile(); drawFarmInfo(); drawPresAsk(); drawPetRename(); drawSellAsk(); drawBagBuy(); drawCharCreate(); drawUnlock(); }, options: drawOptions, login: drawLogin, sync: drawSync, syncerr: drawSync, conflict: drawConflict })[state](); drawCountryPicker(); ctx.restore(); }
  else drawPlayScreens();
  if (muted) txt('MUDO (M)', W - 10, H - 8, 12, '#888', 'right');
    frameErr = 0;
  } catch (e) {
    frameErr++; sfxQuiet = false; mdown = false; try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } catch (e2) {}
    if (frameErr === 1) { try { console.error(e); } catch (e3) {} window.__lastErr = String(e && e.message || e); }
    if (frameErr >= 30) {   // continua a falhar: volta a um sitio seguro em vez de ficar preso
      frameErr = 0; farmInfo = -1; presAsk = -1; bagBuy = 0; cpick = null; chNew = null; try { rk.prof = null; } catch (e4) {}
      if (state === 'play' || state === 'cp' || state === 'win' || state === 'lose') state = save ? 'hub' : 'menu'; else if (state === 'hub') tab = 'farm';
      hubToast = { t: 4, s: 'Erro recuperado: ' + (window.__lastErr || ''), col: '#f88' };
    }
  }
}
if (ONLINE_URL && on.token) { cloudStart(); rpc('gog_profile', { p_nick: on.nick }).then(r => { if (r && r.ok) { on.gender = r.gender === 'f' ? 'f' : 'm'; on.country = r.country || null; onSave(); } }); }   // atualiza sexo e pais (podem ter mudado noutro dispositivo)
requestAnimationFrame(frame);

