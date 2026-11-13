'use strict';
/* =====================================================================
   DESENHO — JOGO
   ===================================================================== */
function makeBG(theme) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), th = THEMES[theme], gold = '#d4a030';
  let sd = theme * 977 + 13; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  const TS = 40;
  for (let y = 0; y < H; y += TS) for (let x = 0; x < W; x += TS) {
    g.fillStyle = shade(th.bg, (r() - .5) * .12); g.fillRect(x, y, TS, TS);
    g.fillStyle = shade(th.bg, -.35); g.fillRect(x, y, TS, 1); g.fillRect(x, y, 1, TS);
    g.fillStyle = shade(th.bg, .12); g.fillRect(x + 1, y + 1, TS - 2, 1);
  }
  if (theme === 0) {
    for (let i = 0; i < W * H / 500; i++) { g.fillStyle = r() < .5 ? '#3f5a22' : '#4f6a2a'; g.fillRect(r() * W, r() * H, 1, 3 + r() * 3); }
    for (let i = 0; i < W * H / 1800; i++) { g.globalAlpha = .5 + r() * .4; g.fillStyle = r() < .5 ? '#e0b040' : '#c48a22'; g.fillRect(r() * W, r() * H, 3, 2); } g.globalAlpha = 1;
  } else if (theme === 1) {
    for (let i = 0; i < W * H / 2500; i++) { const x = r() * W, y = r() * H; g.strokeStyle = shade(th.bg, -.4); g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 40, y + (r() - .5) * 40); g.stroke(); }
    for (let i = 0; i < W * H / 3000; i++) { g.fillStyle = r() < .5 ? '#f0c040' : '#a8801e'; g.globalAlpha = .8; g.fillRect(r() * W, r() * H, 2, 2); } g.globalAlpha = 1;
  } else if (theme === 2) {
    const cy = H / 2 - 36; g.fillStyle = '#4a1418'; g.fillRect(0, cy, W, 72); g.fillStyle = gold; g.fillRect(0, cy, W, 3); g.fillRect(0, cy + 69, W, 3);
    g.fillStyle = '#8a1e26'; for (let x = 8; x < W; x += 32) { g.beginPath(); g.moveTo(x, cy + 36); g.lineTo(x + 8, cy + 28); g.lineTo(x + 16, cy + 36); g.lineTo(x + 8, cy + 44); g.fill(); }
    g.fillStyle = gold; for (let x = 8; x < W; x += 32) g.fillRect(x + 6, cy + 34, 4, 4);
  } else if (theme === 3) {
    for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, rx = 20 + r() * 40; g.fillStyle = '#141a0a'; g.globalAlpha = .75; g.beginPath(); g.ellipse(x, y, rx, rx * .45, 0, 0, 7); g.fill(); g.globalAlpha = .5; g.strokeStyle = '#8a8a2a'; g.lineWidth = 1.5; g.stroke(); } g.globalAlpha = 1;
  } else if (theme === 4) {
    g.strokeStyle = '#7a6230'; g.globalAlpha = .45; g.lineWidth = 2;
    for (let k = 0; k < 9; k++) { g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = k * (H / 8) + Math.sin(x * .02 + k) * 10; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } g.globalAlpha = 1;
    for (let i = 0; i < 160; i++) { g.fillStyle = '#d8b050'; g.globalAlpha = .4; g.fillRect(r() * W, r() * H, 2, 1); } g.globalAlpha = 1;
  } else {
    g.strokeStyle = gold; g.globalAlpha = .28; g.lineWidth = 2; const cx = W / 2, cy2 = H / 2; g.beginPath(); g.arc(cx, cy2, 140, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy2, 100, 0, 7); g.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.fillStyle = gold; g.fillRect(cx + Math.cos(a) * 120 - 2, cy2 + Math.sin(a) * 120 - 2, 4, 4); } g.globalAlpha = 1;
    for (let i = 0; i < 40; i++) { g.fillStyle = gold; g.globalAlpha = .25; g.fillRect(r() * W, r() * H, 3, 5); } g.globalAlpha = 1;
  }
  // detalhes novos de cada mapa (so no chao; o resto e ambiente animado)
  if (theme === 0) {            // trilho de terra, flores e pedras com musgo
    g.strokeStyle = '#4a3a22'; g.globalAlpha = .4; g.lineWidth = 26; g.beginPath(); for (let x = 0; x <= W; x += 10) { const y = H * .62 + Math.sin(x * .012) * 34; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.globalAlpha = 1;
    for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H; g.fillStyle = ['#e8e0a0', '#e07090', '#a0c0ff'][i % 3]; g.fillRect(x, y, 2, 2); g.fillRect(x - 2, y + 2, 2, 2); g.fillRect(x + 2, y + 2, 2, 2); g.fillStyle = '#1f3a14'; g.fillRect(x, y + 4, 1, 4); }
    for (let i = 0; i < 8; i++) { const x = r() * W, y = r() * H; g.fillStyle = '#5a5a52'; g.fillRect(x, y, 16, 9); g.fillStyle = '#3f6a2a'; g.fillRect(x, y, 16, 3); g.fillStyle = '#74746a'; g.fillRect(x + 2, y + 3, 5, 2); }
  } else if (theme === 1) {     // cristais azuis nas paredes e veios de ouro
    for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, c = i % 2 ? '#5ab4ea' : '#8ad0ff'; g.fillStyle = '#10243a'; g.fillRect(x - 6, y + 10, 18, 3); g.fillStyle = c; g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + 3, y - 4); g.lineTo(x + 6, y + 10); g.fill(); g.beginPath(); g.moveTo(x + 6, y + 10); g.lineTo(x + 10, y); g.lineTo(x + 13, y + 10); g.fill(); g.fillStyle = '#e8f8ff'; g.fillRect(x + 3, y, 1, 6); }
    g.strokeStyle = '#d4a030'; g.globalAlpha = .5; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y + 8); g.lineTo(x + 34, y - 4); g.stroke(); } g.globalAlpha = 1;
  } else if (theme === 2) {     // lajes rachadas, sangue seco e correntes
    g.strokeStyle = '#150c0c'; g.lineWidth = 1.5; for (let i = 0; i < 10; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y + 8); g.lineTo(x + 6, y + 18); g.lineTo(x + 18, y + 26); g.stroke(); }
    g.fillStyle = '#5a0e12'; g.globalAlpha = .55; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * W, r() * H, 6 + r() * 10, 3 + r() * 5, r() * 3, 0, 7); g.fill(); } g.globalAlpha = 1;
    g.fillStyle = '#3a3040'; for (let i = 0; i < 6; i++) { const x = 20 + r() * (W - 40); for (let k = 0; k < 6; k++) g.fillRect(x + (k % 2) * 3, 4 + k * 6, 3, 5); }
  } else if (theme === 3) {     // nenufares, juncos e poças verdes
    for (let i = 0; i < 16; i++) { const x = r() * W, y = r() * H; g.fillStyle = '#2f6a2a'; g.beginPath(); g.ellipse(x, y, 9, 5, 0, 0, 7); g.fill(); g.fillStyle = '#141a0a'; g.fillRect(x, y - 1, 9, 2); if (i % 4 === 0) { g.fillStyle = '#e07aa0'; g.fillRect(x - 2, y - 3, 4, 3); } }
    g.strokeStyle = '#6a7a2a'; g.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + (r() - .5) * 4, y); g.stroke(); g.fillStyle = '#5a3a20'; g.fillRect(x - 1, y - 3, 3, 4); }
  } else if (theme === 4) {     // ossos, ruinas de pedra e cavidades de areia
    for (let i = 0; i < 9; i++) { const x = r() * W, y = r() * H; g.strokeStyle = '#e8dcb8'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 12, .3, 2.6); g.stroke(); g.beginPath(); g.arc(x + 8, y + 2, 12, .3, 2.6); g.stroke(); }
    for (let i = 0; i < 6; i++) { const x = r() * W, y = r() * H; g.fillStyle = '#8a7a58'; g.fillRect(x, y, 14, 12); g.fillStyle = '#a89870'; g.fillRect(x, y, 14, 3); g.fillStyle = '#5a4a30'; g.fillRect(x + 4, y + 5, 3, 7); }
    g.fillStyle = '#c89a40'; g.globalAlpha = .25; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(r() * W, r() * H, 26 + r() * 20, 9, 0, 0, 7); g.fill(); } g.globalAlpha = 1;
  } else {                      // runas violetas e fendas de energia
    g.strokeStyle = '#a050ff'; g.globalAlpha = .35; g.lineWidth = 2; for (let i = 0; i < 6; i++) { let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - .5) * 46; y += (r() - .5) * 46; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = 1;
    for (let i = 0; i < 12; i++) { const x = r() * W, y = r() * H; g.fillStyle = '#7a3ad0'; g.globalAlpha = .5; g.fillRect(x, y, 2, 8); g.fillRect(x - 3, y + 3, 8, 2); g.globalAlpha = 1; }
  }
  g.strokeStyle = gold; g.globalAlpha = .14; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H / 2, 70, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(W / 2 - 90, H / 2); g.lineTo(W / 2 + 90, H / 2); g.moveTo(W / 2, H / 2 - 90); g.lineTo(W / 2, H / 2 + 90); g.stroke(); g.globalAlpha = 1;
  return c;
}
function drawDeco(theme, t) {
  for (const d of R.deco) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.scale(d.s, d.s);
    if (theme === 0) { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-4, 0, 8, 22); ctx.fillStyle = '#2e4a1c'; ctx.beginPath(); ctx.arc(0, -4, 22, 0, 7); ctx.fill(); ctx.fillStyle = '#c9952a'; ctx.beginPath(); ctx.arc(-6, -10, 12, 0, 7); ctx.fill(); }
    else if (theme === 1) { ctx.fillStyle = '#f0b840'; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(-10, 14); ctx.lineTo(-4, -16); ctx.lineTo(2, 14); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(8, -8); ctx.lineTo(14, 14); ctx.fill(); ctx.globalAlpha = 1; }
    else if (theme === 2) { ctx.fillStyle = '#3c3444'; ctx.fillRect(-10, -14, 20, 34); ctx.fillStyle = '#8a6a24'; ctx.fillRect(-12, -18, 24, 6); const f = 6 + Math.sin(t * 9 + d.ph) * 2; ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(0, -26, f, 0, 7); ctx.fill(); ctx.globalAlpha = .12; ctx.beginPath(); ctx.arc(0, -26, 30, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    else if (theme === 3) { ctx.fillStyle = '#d8d8b0'; ctx.fillRect(-3, 0, 6, 14); ctx.fillStyle = '#e8c840'; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#2a5a1a'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, 7); ctx.arc(5, -3, 2, 0, 7); ctx.fill(); }
    else if (theme === 4) { ctx.fillStyle = '#2f6a35'; ctx.fillRect(-5, -20, 10, 38); ctx.fillRect(-16, -8, 6, 14); ctx.fillRect(-16, -8, 11, 5); ctx.fillRect(10, -14, 6, 14); ctx.fillRect(5, -14, 11, 5); }
    else { ctx.fillStyle = '#c9952a'; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(-8, 16); ctx.lineTo(0, -24 + Math.sin(t * 2 + d.ph) * 3); ctx.lineTo(8, 16); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}
const hsh = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
function drawAmbient(theme, t) {   // particulas de ambiente de cada mapa (so desenho, sem efeito no jogo)
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const a = hsh(i, 1), b = hsh(i, 2), c = hsh(i, 3);
    if (theme === 0) { const x = (a * W + Math.sin(t * .5 + i) * 30 + W) % W, y = (b * H + Math.cos(t * .4 + i * 2) * 24 + H) % H, k = .5 + .5 * Math.sin(t * 2 + i * 3); ctx.globalAlpha = .15 + .6 * k; ctx.fillStyle = '#e6ff7a'; ctx.fillRect(x, y, 3, 3); ctx.globalAlpha = .08 * k; ctx.fillRect(x - 3, y - 3, 9, 9); }
    else if (theme === 1) { const x = a * W, y = (b * H + t * (8 + c * 10)) % H; ctx.globalAlpha = .25 + .35 * c; ctx.fillStyle = c > .5 ? '#ffe08a' : '#bfe8ff'; ctx.fillRect(x, y, 2, 2); }
    else if (theme === 2) { const x = (a * W + Math.sin(t + i) * 12 + W) % W, y = H - ((b * H + t * (16 + c * 26)) % H); ctx.globalAlpha = .75 * (y / H); ctx.fillStyle = c > .5 ? '#ff9a2a' : '#ffd05a'; ctx.fillRect(x, y, 2, 2); }
    else if (theme === 3) { if (i < 8) { const x = (a * W + t * (6 + c * 6)) % (W + 160) - 80, y = b * H; ctx.globalAlpha = .08; ctx.fillStyle = '#c8d890'; ctx.beginPath(); ctx.ellipse(x, y, 80 + c * 40, 14 + c * 10, 0, 0, 7); ctx.fill(); } const x = a * W, y = (b * H - t * (6 + c * 8) + H * 2) % H; ctx.globalAlpha = .35; ctx.fillStyle = '#b8e04a'; ctx.fillRect(x + Math.sin(t + i) * 6, y, 2, 2); }
    else if (theme === 4) { const x = (a * W + t * (60 + c * 80)) % (W + 40) - 20, y = b * H + Math.sin(t * 2 + i) * 4; ctx.globalAlpha = .22 + .2 * c; ctx.fillStyle = '#f0d890'; ctx.fillRect(x, y, 10 + c * 14, 1); }
    else { const x = a * W + Math.sin(t * .8 + i) * 10, y = H - ((b * H + t * (10 + c * 18)) % H); ctx.globalAlpha = .6 * Math.min(1, y / 80); ctx.fillStyle = c > .5 ? '#c070ff' : '#7a3ad0'; ctx.fillRect(x, y, 2, 3); }
  }
  ctx.restore();
}
function drawTels() {
  for (const t of R.tels) {
    const k = 1 - t.t / t.max; ctx.fillStyle = t.col; ctx.globalAlpha = .12 + .2 * k; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill();
    ctx.globalAlpha = .7; ctx.strokeStyle = t.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.stroke();
    ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * k, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  for (const z of R.zones) { const a = Math.min(1, z.t) * (.2 + .08 * Math.sin(R.time * 12 + z.x)); ctx.fillStyle = '#ff7a1a'; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); ctx.globalAlpha = Math.min(1, a * 2); ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; }
  for (const t of R.tels) if (t.from === 'p' && t.burn) {
    const f = t.t / t.max, mx = t.x - 80 * f, my = t.y - 420 * f;
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ff8a2a'; ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(mx, my, 24, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffd05a'; ctx.beginPath(); ctx.arc(mx, my, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(mx, my, 6, 0, 7); ctx.fill();
  }
  for (const tr of R.traps) { ctx.strokeStyle = '#c8f'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); drawIcon('skull', tr.x, tr.y, 2); }
}
function psnDrop(x, y) { ctx.fillStyle = '#3f8a14'; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 2, 6, 6); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 5, 2, 3); ctx.fillStyle = '#9be32f'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 2, 2); }   // gota verde: o inimigo esta envenenado
function drawWorld() {
  const th = THEMES[MISSIONS[R.m].theme], p = R.p;
  ctx.save(); if (R.shake > .5) ctx.translate((Math.random() - .5) * R.shake, (Math.random() - .5) * R.shake);
  ctx.fillStyle = th.bg; ctx.fillRect(-20, -20, W + 40, H + 40); if (R.bg) ctx.drawImage(R.bg, 0, 0, W, H);
  drawDeco(MISSIONS[R.m].theme, R.time); drawAmbient(MISSIONS[R.m].theme, R.time); drawTels(); drawEggs();
  const fading = o => o.life !== undefined && o.life - (o.t || 0) < 8 && Math.floor(R.time * 8) % 2;   // nos ultimos 8 s pisca
  for (const c of R.coins) { if (fading(c)) continue; drawIcon('coin', c.x, c.y + Math.sin(R.time * 6 + c.x) * 2, 1.5); }
  for (const h of R.hearts) { if (fading(h)) continue; drawIcon('heart', h.x, h.y + Math.sin(R.time * 5) * 2, 2); }

  const list = [];
  list.push({ y: p.y, f: () => {
    if (R.endT !== undefined && !R.endWin) ctx.globalAlpha = .5;
    if (p.inv > 0 && p.shield <= 0 && Math.floor(p.inv * 20) % 2 && R.endT === undefined) return;
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 17, 13, 5, 0, 0, 7); ctx.fill();
    if (p.rage > 0) { ctx.fillStyle = '#f334'; ctx.beginPath(); ctx.arc(p.x, p.y, 22 + Math.sin(R.time * 12) * 2, 0, 7); ctx.fill(); }
    if (R.pet && R.pet.y < p.y) drawPet(R.pet);
    const bobY = p.mv ? Math.sin(R.time * 14) * 2 : 0, behind = Math.sin(p.face) < -.35;
    if (behind) heldWeapon(p, bobY);
    drawSpr(heroSpr(), p.x, p.y, p.flip, p.dashT > 0, bobY);
    if (!behind) heldWeapon(p, bobY);
    if (R.pet && R.pet.y >= p.y) drawPet(R.pet);
    if (p.kshield > 0) { const bl = p.kshield < 2 && Math.floor(R.time * 8) % 2; if (!bl) { ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = .22; ctx.fillStyle = '#6ab8ff'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + R.time * .8; ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = .85; ctx.strokeStyle = '#bfe4ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } }
    if (p.shield > 0) { ctx.strokeStyle = '#c8f'; ctx.lineWidth = 3; ctx.globalAlpha = .5 + Math.sin(R.time * 10) * .2; ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; for (let i = 0; i < 6; i++) { const a = R.time * 3 + i * 1.047; ctx.fillStyle = i % 2 ? '#ffffff' : '#d9a6ff'; ctx.fillRect(Math.round(p.x + Math.cos(a) * 26) - 2, Math.round(p.y + Math.sin(a) * 26) - 2, 4, 4); } }
    ctx.globalAlpha = 1;
    // badges de "pronto"
    if (R.endT === undefined) { const bl = Math.floor(R.time * 4) % 2; let bx = p.x - (p.spR && p.skR ? 16 : 0);
      for (const [rdy, k] of [[p.spR, 'special'], [p.skR, 'skill']]) if (rdy) { ctx.fillStyle = bl ? '#fc6' : '#a80'; rr(bx - 11, p.y - 44, 22, 16, 4); ctx.fill(); txt(keyName(binds[k]).slice(0, 3), bx, p.y - 32, 11, '#000', 'center', 'bold'); bx += 32; } }
  } });
  for (const e of R.enemies) list.push({ y: e.y, f: () => {
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r, e.r, e.r * .4, 0, 0, 7); ctx.fill();
    drawSpr(EN[e.type].spr, e.x, e.y, p.x < e.x, e.hit > 0, Math.sin(R.time * 8 + e.ph) * 1.5);
    if (e.slow > 0) { ctx.fillStyle = '#8cf6'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, 7); ctx.fill(); }
    if (e.wind > 0) txt('!', e.x, e.y - e.r - 14, 18, '#f44', 'center', 'bold'); if (e.stun > 0) drawIcon('stun', e.x, e.y - e.r - 21, 1.5); if (e.burn > 0) drawIcon('flame', e.x + e.r, e.y - e.r, 1.5); if (e.psn > 0) psnDrop(e.x - e.r, e.y - e.r);
    if (e.hp < e.max) bar(e.x - 14, e.y - e.r - 12, 28, 4, e.hp / e.max, '#e44');
  } });
  if (R.boss) { const b = R.boss; list.push({ y: b.y, f: () => {
    const oy = b.y; if (R.cine) { const c = R.cine; if (c.t < 1.2) return; if (c.t < 2) { const k = (c.t - 1.2) / .8; b.y = oy - (1 - k * k) * 440; } } if (b.z) b.y -= b.z;
    if (b.guardian) { const sy = oy, a0 = R.time * 14; if (b.st === 'spin') { if (b.mt < .5) { ctx.strokeStyle = '#ffd34a88'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(b.x, sy, b.r + 112, 0, 7); ctx.stroke(); ctx.setLineDash([]); } else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 8; ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(b.x, sy, b.r + 100, a0 - 2.2, a0); ctx.stroke(); ctx.globalAlpha = .25; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(b.x, sy, b.r + 100, a0 - 3.6, a0 - 1); ctx.stroke(); ctx.restore(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a0) * 20, sy + Math.sin(a0) * 20); ctx.lineTo(b.x + Math.cos(a0) * (b.r + 112), sy + Math.sin(a0) * (b.r + 112)); ctx.stroke(); } } ctx.fillStyle = '#ffd34a22'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 14 + Math.sin(R.time * 4) * 3, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r, b.r * 1.1, b.r * .35, 0, 0, 7); ctx.fill();
    if (!R.cine) bar(b.x - b.r, b.y - b.r - 14, b.r * 2, 6, Math.max(0, b.hp / b.max), '#e44');   // barra de vida por cima do boss
    if (b.st === 'charge' && b.mt < .7) { ctx.strokeStyle = '#f44a'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.dx * 500, b.y + b.dy * 500); ctx.stroke(); ctx.setLineDash([]); }
    if (b.st === 'spread' && b.f < 3) { ctx.strokeStyle = b.col + '88'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); }
    if (b.st === 'blink' && b.f === 0) { ctx.globalAlpha = .4 + Math.sin(R.time * 30) * .3; }
    if (b.hp < b.max * .5) { ctx.fillStyle = '#f333'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 8 + Math.sin(R.time * 10) * 3, 0, 7); ctx.fill(); }
    drawSpr(b.pal, b.x, b.y, p.x < b.x, b.hit > 0, Math.sin(R.time * 5) * 3); ctx.globalAlpha = 1; b.y = oy;
    if (b.slow > 0) { ctx.fillStyle = '#8cf5'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, 0, 7); ctx.fill(); }
    if (b.burn > 0) drawIcon('flame', b.x + b.r, b.y - b.r, 2); if (b.psn > 0) psnDrop(b.x - b.r, b.y - b.r);
  } }); }
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  if (p.aura) {   // desenho do circulo toxico / dreno de vida
    const A = p.aura, tt = R.time, tox = A.k === 'tox', fade = Math.min(1, A.t * 2);
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.globalAlpha = .16 * fade; ctx.fillStyle = tox ? '#7acb1f' : '#d0204a'; ctx.beginPath(); ctx.arc(0, 0, A.r, 0, 7); ctx.fill();
    ctx.globalAlpha = .75 * fade; ctx.strokeStyle = tox ? '#b6f23a' : '#ff6a82'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -tt * 26; ctx.beginPath(); ctx.arc(0, 0, A.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 16; i++) { const ph = (tt * .45 + i / 16) % 1, a = i * 2.39, rr = A.r * (.2 + .75 * ((i * 7) % 10) / 10); ctx.globalAlpha = (1 - ph) * .9 * fade; ctx.fillStyle = tox ? (i % 2 ? '#e8ffb0' : '#9be32f') : (i % 2 ? '#ff9aa8' : '#ff4a6a'); const bx = tox ? Math.cos(a) * rr : Math.cos(a) * rr * (1 - ph), by = tox ? Math.sin(a) * rr * .9 - ph * 18 : Math.sin(a) * rr * (1 - ph) * .9; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4); }
    ctx.restore();
    if (!tox) for (const e of targets()) if (Math.hypot(e.x - p.x, e.y - p.y) < A.r + e.r) { ctx.globalAlpha = .55 * fade; ctx.strokeStyle = '#ff4a6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; }
  }

  for (const q of R.projs) {
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a);
    if (q.from === 'p' && GLOW[q.kind]) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45; ctx.fillStyle = GLOW[q.kind]; ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(R.time * 20) * 2, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    if (q.kind === 'arrow') { ctx.strokeStyle = q.burn ? '#fa5' : '#e8d9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill(); }
    else if (q.kind === 'bigbolt') { ctx.strokeStyle = '#9cf'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(14, 0); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(12, -8); ctx.lineTo(12, 8); ctx.fill(); }
    else if (q.kind === 'boom') { ctx.strokeStyle = '#f93'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke(); ctx.fillStyle = '#f50'; ctx.beginPath(); ctx.arc(14, 0, 8, 0, 7); ctx.fill(); }
    else if (q.kind === 'spear') { ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(20, 0); ctx.stroke(); ctx.fillStyle = '#dde'; ctx.beginPath(); ctx.moveTo(36, 0); ctx.lineTo(18, -7); ctx.lineTo(18, 7); ctx.fill(); }
    else if (q.kind === 'earrow') { ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#f66'; ctx.fillRect(6, -2, 4, 4); }
    else if (q.kind === 'fire') { ctx.fillStyle = '#f80'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#ff6'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); }
    else if (q.kind === 'ice') { ctx.fillStyle = '#9ef'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -6); ctx.lineTo(-8, 0); ctx.lineTo(0, 6); ctx.fill(); }
    else if (q.kind === 'poison') { ctx.fillStyle = '#5aa820'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#e8ffb0'; ctx.beginPath(); ctx.arc(-1, -1, 3, 0, 7); ctx.fill(); }
    else if (q.kind === 'blood') { ctx.fillStyle = '#8a0f2a'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.strokeStyle = '#ff4a6a'; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = q.col; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  for (const f of R.fx) {
    const k = f.t / f.max;
    if (f.k === 'arc') { ctx.strokeStyle = `rgba(${f.col},${k})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(f.x, f.y, f.range * .88, f.a - f.arc * Math.PI, f.a + f.arc * Math.PI); ctx.stroke(); }
    else if (f.k === 'ring') { ctx.strokeStyle = f.col; ctx.globalAlpha = k; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.1 - k * .5), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.k === 'zap') {
      const pts = [];
      for (let i = 1; i < f.pts.length; i++) {
        const a = f.pts[i - 1], b = f.pts[i], n = 6, dx = b.x - a.x, dy = b.y - a.y, d2 = Math.hypot(dx, dy) || 1, nx = -dy / d2, ny = dx / d2; if (i === 1) pts.push(a);
        for (let j = 1; j <= n; j++) { const t2 = j / n, off = j === n ? 0 : (Math.random() - .5) * 16; pts.push({ x: a.x + dx * t2 + nx * off, y: a.y + dy * t2 + ny * off }); }
      }
      const path = () => { ctx.beginPath(); pts.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)); ctx.stroke(); };
      ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 14; ctx.strokeStyle = `rgba(255,200,40,${k * .22})`; path(); ctx.lineWidth = 7; ctx.strokeStyle = `rgba(255,235,110,${k * .55})`; path();
      ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,255,255,${k})`; path();
      ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,240,140,${k})`;
      for (let i = 2; i < pts.length - 1; i += 3) { const pt = pts[i], a2 = Math.random() * 6.283; ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x + Math.cos(a2) * 16, pt.y + Math.sin(a2) * 16); ctx.stroke(); }
    }
    else if (f.k === 'crystals') {
      const grow = Math.min(1, (f.max - f.t) / .2), fade = Math.min(1, f.t / .4); ctx.globalAlpha = fade * .85;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * 6.283, cx = f.x + Math.cos(a) * f.r * .85, cy = f.y + Math.sin(a) * f.r * .6, h = (30 + (i % 3) * 12) * grow;
        ctx.fillStyle = i % 2 ? '#bff' : '#6ad0ff'; ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx, cy - h); ctx.lineTo(cx + 7, cy); ctx.fill();
        ctx.fillStyle = '#ffffff99'; ctx.beginPath(); ctx.moveTo(cx - 2, cy); ctx.lineTo(cx, cy - h); ctx.lineTo(cx + 2, cy); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    else if (f.k === 'bolt') { ctx.strokeStyle = `rgba(255,255,160,${k})`; ctx.lineWidth = 5; ctx.beginPath(); let yy = 0; ctx.moveTo(f.x, 0); while (yy < f.y) { yy += 25; ctx.lineTo(f.x + (Math.random() - .5) * 22, Math.min(yy, f.y)); } ctx.stroke(); ctx.fillStyle = `rgba(255,255,200,${k * .5})`; ctx.beginPath(); ctx.arc(f.x, f.y, 30 * (1.2 - k), 0, 7); ctx.fill(); }
  }
  for (const q of R.parts) { const sz = q.s || 4; ctx.globalAlpha = Math.min(1, Math.max(0, q.life * 2.5)); ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x - sz / 2), Math.round(q.y - sz / 2), sz, sz); } ctx.globalAlpha = 1;
  for (const q of R.texts) { ctx.globalAlpha = Math.min(1, q.t * 2); txt(q.s, q.x, q.y, q.sz || 15, q.col, 'center', 'bold'); } ctx.globalAlpha = 1;
  ctx.restore();
  // luz dourada, po a flutuar e moldura
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 190); lg.addColorStop(0, 'rgba(255,200,90,.13)'); lg.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = lg; ctx.fillRect(p.x - 190, p.y - 190, 380, 380);
  for (let i = 0; i < 26; i++) { const x = (rn(i) * W + R.time * (5 + rn(i + 5) * 9)) % W, y = (rn(i + 40) * H + Math.sin(R.time * .6 + i) * 14 + H) % H; ctx.globalAlpha = .18 + .22 * Math.abs(Math.sin(R.time + i)); ctx.fillStyle = '#ffd27a'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true; ctx.drawImage(vign, 0, 0, W, H); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4); ctx.fillRect(0, 0, 4, H); ctx.fillRect(W - 4, 0, 4, H);
  ctx.strokeStyle = '#c9952a'; ctx.lineWidth = 1; ctx.strokeRect(4.5, 4.5, W - 9, H - 9);
  ctx.fillStyle = '#e6b53a'; for (const [cx, cy] of [[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]]) { ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 6, cy); ctx.fill(); }
}
function abilBox(x, y, key, name, cd, max, ready, col) {
  const w = 130, h = 36, bl = ready && Math.floor(T * 4) % 2;
  rr(x, y, w, h, 6); ctx.fillStyle = '#0007'; ctx.fill(); ctx.strokeStyle = ready ? (bl ? '#ffe9a0' : col) : '#ffffff40'; ctx.lineWidth = 2; ctx.stroke();
  if (!ready) { ctx.save(); rr(x, y, w, h, 6); ctx.clip(); ctx.fillStyle = '#000b'; ctx.fillRect(x, y, w, h * Math.max(0, Math.min(1, cd / max))); ctx.restore(); }
  rr(x + 6, y + 6, 24, 24, 5); ctx.fillStyle = ready ? '#a80' : '#333'; ctx.fill(); txt(keyName(key).slice(0, 3), x + 18, y + 24, 15, ready ? '#000' : '#999', 'center', 'bold');
  txt(name, x + 36, y + 16, 11, ready ? '#fff' : '#aab', 'left', 'bold'); txt(ready ? 'PRONTO' : Math.ceil(cd) + 's', x + 36, y + 30, 11, ready ? col : '#fff', 'left', 'bold');
}
function drawHUD() {
  const p = R.p, M = MISSIONS[R.m], w = curW();
  ctx.globalAlpha = .85;
  drawIcon('heart', 20, 21, 2); bar(36, 12, 190, 16, p.hp / p.max, '#d33', '#0006'); txt(`${Math.ceil(p.hp)}/${p.max}`, 131, 25, 12, '#fff', 'center', 'bold');
  // bloco unico da arma (canto inferior direito): arma, dash e nivel/XP
  const bx = W - 212, bt = H - 68; rr(bx - 8, bt - 8, 212, 64, 8); ctx.fillStyle = '#0005'; ctx.fill();
  weaponIcon(w.id, bx + 8, bt + 7, 1.1); txt(`${w.n}${wlvl() ? ' +' + wlvl() : ''}`, bx + 26, bt + 11, 12, '#fff', 'left', 'bold');
  txt(keyName(binds.dash).slice(0, 5), bx, bt + 31, 10, '#6cf', 'left', 'bold'); bar(bx + 36, bt + 24, 160, 7, 1 - Math.max(0, p.dashCd) / DASH_CD, '#4cf', '#0006');
  txt(`Nv ${save.pl.lv}`, bx, bt + 48, 10, '#6cf', 'left', 'bold'); bar(bx + 36, bt + 42, 160, 7, save.pl.lv >= MAXLV ? 1 : save.pl.xp / xpNeed(save.pl.lv), '#6cf', '#0006');
  ctx.globalAlpha = 1;
  const by = R.boss ? H - 90 : H - 52; abilBox(W / 2 - 136, by, binds.special, CLASSES[save.cls].sp, p.sp, 8, p.spR, '#fc6'); abilBox(W / 2 + 6, by, binds.skill, w.sk.n, p.sk, w.sk.cd, p.skR, '#7cf');
  txt(autoAtk ? `AUTO-ATAQUE (${keyName(binds.auto)})` : '', W - 12, 70, 12, '#7f7', 'right', 'bold');
  txt(R.phase === 'hunt' ? (R.farm ? `Onda ${R.wave} · ${R.waveKills}/${R.need}` : `Monstros ${R.kills}/${R.need}`) : 'Derrota o Boss!', W - 12, 26, 16, R.farm && R.hordeB && R.phase === 'hunt' ? (Math.floor(T * 3) % 2 ? '#ff6a6a' : '#fff') : '#fff', 'right', 'bold');
  if (R.farm && R.hordeB && R.phase === 'hunt') txt('HORDA!', W - 12, 134, 14, '#ff6a6a', 'right', 'bold'); txt('¢' + R.gold + ' · Itens ' + R.loot.length, W - 12, 48, 16, '#fd5', 'right', 'bold');
  if (R.raid) txt(`Raid ${RAID_D[R.raid.d].n} · Onda ${R.wave}/4`, W - 12, 92, 13, RAID_D[R.raid.d].col, 'right', 'bold');
  if (gameSpeed === 2) txt('VELOCIDADE x2', W - 12, 112, 13, '#ffd34a', 'right', 'bold');
  if (R.boss && !R.cine) { const b = R.boss, bw = 380, bx = W / 2 - bw / 2; txt(b.mini ? 'Semi-boss · ' + b.name : b.name, W / 2, 20, 15, '#fff', 'center', 'bold'); bar(bx, 26, bw, 14, Math.max(0, b.hp / b.max), b.col || '#e44'); txt(`${gfmt(Math.max(0, Math.ceil(b.hp * 10)))} / ${gfmt(Math.round(b.max * 10))}`, W / 2, 37, 11, '#fff', 'center', 'bold'); }
  if (R.toastT > 0) { ctx.globalAlpha = Math.min(1, R.toastT); txt(R.toast, W / 2, 80, 24, '#ffd66b', 'center', 'bold'); ctx.globalAlpha = 1; }
}
function overlay(title, col, lines) {
  ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H); txt(title, UW / 2, 190, 54, col, 'center', 'bold');
  lines.forEach((l, i) => txt(l, UW / 2, 240 + i * 28, 20, '#fff', 'center'));
}
function drawPlayScreens() {
  drawWorld(); drawHUD(); ctx.save(); ctx.translate(UIOX, 0); playOverlay(); ctx.restore(); drawCine();
}
function drawCheckpoint() {
  const gt = R.gold + R.coins.reduce((a, c) => a + c.v, 0), xp = Math.round(R.xp * (1 + (R.G ? R.G.xpb : 0) / 100));
  ctx.fillStyle = '#000b'; ctx.fillRect(-UIOX, 0, W, H);
  const x = 170, y = 96, w = 460, h = 290; panel(x, y, w, h, '#16162a', '#a8821f');
  txt(lang === 'en' ? `WAVE ${R.cpWave} COMPLETE!` : `ONDA ${R.cpWave} CONCLUÍDA!`, x + w / 2, y + 40, 26, '#ffd34a', 'center', 'bold');
  txt('Queres sair agora e guardar tudo o que ganhaste?', x + w / 2, y + 72, 14, '#cdd6f0', 'center');
  bevel(x + 30, y + 90, w - 60, 78, '#10101c', '#33334a', '#05050a');
  txt('¢' + gfmt(gt), x + 60, y + 124, 22, '#fd5', 'left', 'bold'); txt(`+${gfmt(xp)} XP`, x + w / 2 + 10, y + 124, 18, '#9cf', 'left', 'bold'); txt(`Itens: ${R.loot.length}` + (R.wloot.length ? ` · Cópias: ${R.wloot.length}` : ''), x + 60, y + 152, 13, '#cdd6f0');
  wrap('Se continuares e morreres, ficas só com 40% do XP e 10% do ouro (os itens perdem-se). Sair com Esc a meio deixa 30%.', x + 30, y + 196, w - 60, 15, 12, '#f99');
  btn(x + 30, y + 226, 190, 44, 'Sair e guardar tudo', () => { endMission(true, 'cash'); }, { size: lang === 'en' ? 14 : 16, col: '#2f7a4a', hot: '#3fa061' });
  btn(x + 240, y + 226, 190, 44, 'Continuar', () => { R.phase = 'hunt'; state = 'play'; nextWave(); }, { size: 16, col: '#a06a20', hot: '#c98a30' });
}
function playOverlay() {
  if (state === 'cp') { drawCheckpoint(); return; }
  if (state === 'pause') {
    overlay('PAUSA', '#fff', []);
    btn(300, 215, 200, 44, 'Continuar', () => state = 'play', { size: 18, col: '#2f7a4a' });
    btn(300, 269, 200, 44, 'Opções', () => { optBack = 'pause'; state = 'options'; }, { size: 17 });
    if (R.farm) { btn(300, 323, 200, 44, 'Sair da campanha (só 30%)', () => { R.retire = true; endMission(true, 'quit'); }, { size: 15, col: '#8a3a2a', hot: '#b04a3a' }); txt('Sair a meio guarda só 30% do que ganhaste.', 400, 428, 11, '#f99', 'center'); }
    else btn(300, 323, 200, 44, 'Abandonar missão', () => goHub(), { size: 16, col: '#6a2a2a' });
    btn(300, 377, 200, 40, `Velocidade: x${gameSpeed}`, toggleSpeed, { size: 15, col: gameSpeed === 2 ? '#a06a20' : '#2a2a48' });
  } else if (state === 'win') {
    overlay(endTitle(true), '#f0c060', endLines(true));
    btn(300, 366, 200, 46, 'Acampamento', goHub, { size: 18, col: '#2f7a4a' });
  } else if (state === 'lose') {
    overlay(endTitle(false), '#e55', endLines(false));
    btn(300, 366, 200, 46, 'Acampamento', goHub, { size: 18, col: '#2f7a4a' });
  }
}

