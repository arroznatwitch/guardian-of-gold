'use strict';
/* =====================================================================
   ECRÃS
   ===================================================================== */
function openKeys(back) { keysBack = back; state = 'keys'; capture = null; }
const HAND = { knight: [7 / 3, 7 / 3], archer: [7 / 3, 5 / 3], mage: [7 / 3, 5 / 3] };   // mao direita (pixel bege): knight (11,11), archer e mage (11,10) na grelha 16x16; em unidades de 3px a partir do centro do sprite (cada pixel do sprite vale 2px)
let menuSel = 0, menuItems = [], menuMouse = { x: mouse.x, y: mouse.y };
function menuActivate() { const it = menuItems[menuSel]; if (it) { SFX.click(); it.fn(); } }
function chevron(x, y, dir) { ctx.fillStyle = '#f0c060'; for (let i = 0; i < 4; i++) ctx.fillRect(x + dir * i * 3, y - (4 - i) * 2, 3, (4 - i) * 4); }
function ridge(base, amp, spd, col, off) {
  ctx.fillStyle = col;
  for (let x = -UIOX; x < W - UIOX; x += 6) { const xx = x + T * spd, y = base - amp * (.5 + .5 * Math.sin(xx * .012 + off)) - amp * .5 * Math.sin(xx * .031 + off * 2); ctx.fillRect(x, Math.round(y / 3) * 3, 6, H); }
}
function drawCastle(cx, by, day) {
  const stone = day ? '#c9b78f' : '#130b26', dark = day ? '#a8956c' : '#0b0618', roof = day ? '#d9a830' : '#1f1236', rim = day ? '#efe2bc' : '#33224f', hill = day ? '#7da24a' : '#1c1032';
  const merl = (x, y, n, step, w) => { for (let i = 0; i < n; i++) ctx.fillRect(x + i * step, y, w, 6); };
  ctx.fillStyle = stone; ctx.fillRect(cx - 66, by - 36, 132, 36); merl(cx - 66, by - 42, 9, 15, 9); ctx.fillStyle = dark; ctx.fillRect(cx - 66, by - 36, 132, 4);
  for (const sx of [-1, 1]) {
    const tx = cx + sx * 58;
    ctx.fillStyle = stone; ctx.fillRect(tx - 15, by - 84, 30, 84); merl(tx - 15, by - 90, 4, 9, 6);
    ctx.fillStyle = dark; ctx.fillRect(tx - 15, by - 84, 5, 84); ctx.fillStyle = rim; ctx.fillRect(tx + 13, by - 84, 2, 84);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(tx - 20, by - 90); ctx.lineTo(tx, by - 120); ctx.lineTo(tx + 20, by - 90); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(tx - 1, by - 134, 2, 16);
    const w = Math.sin(T * 4 + sx) * 2; ctx.fillStyle = day ? '#d04030' : '#6a2030'; ctx.beginPath(); ctx.moveTo(tx + 1, by - 134); ctx.lineTo(tx + 12 + w, by - 130); ctx.lineTo(tx + 1, by - 126); ctx.fill();
  }
  ctx.fillStyle = stone; ctx.fillRect(cx - 22, by - 100, 44, 100); merl(cx - 22, by - 106, 5, 10, 7);
  ctx.fillStyle = dark; ctx.fillRect(cx - 22, by - 100, 6, 100); ctx.fillStyle = rim; ctx.fillRect(cx + 20, by - 100, 2, 100);
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(cx - 28, by - 106); ctx.lineTo(cx, by - 148); ctx.lineTo(cx + 28, by - 106); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(cx - 1, by - 164, 2, 18);
  const w2 = Math.sin(T * 3.2) * 2; ctx.fillStyle = '#e6b53a'; ctx.beginPath(); ctx.moveTo(cx + 1, by - 164); ctx.lineTo(cx + 14 + w2, by - 159); ctx.lineTo(cx + 1, by - 154); ctx.fill();
  ctx.fillStyle = day ? '#5a4020' : '#05030c'; ctx.fillRect(cx - 9, by - 22, 18, 22); ctx.beginPath(); ctx.arc(cx, by - 22, 9, Math.PI, 0); ctx.fill();
  if (!day) { ctx.fillStyle = '#ffcf60'; ctx.globalAlpha = .55 + .15 * Math.sin(T * 5); ctx.fillRect(cx - 5, by - 18, 10, 18); ctx.globalAlpha = 1; }
  for (const [wx, wy] of [[cx - 4, by - 70], [cx - 4, by - 88], [cx - 62, by - 62], [cx + 56, by - 62], [cx - 34, by - 22], [cx + 28, by - 22]]) {
    ctx.fillStyle = day ? '#4a3a28' : (Math.sin(T * 2 + wx) > -.6 ? '#ffd060' : '#7a5a20'); ctx.fillRect(wx, wy, 6, 10); ctx.fillRect(wx + 1, wy - 2, 4, 2);
  }
  // colina por cima da base: o castelo assenta nela
  ctx.fillStyle = hill; ctx.beginPath(); ctx.moveTo(cx - 190, by + 54); ctx.quadraticCurveTo(cx - 100, by - 2, cx, by - 2); ctx.quadraticCurveTo(cx + 100, by - 2, cx + 190, by + 54); ctx.fill();
  for (const [tx, ty, s2] of [[cx - 118, by + 20, 1], [cx - 96, by + 10, 1.2], [cx + 104, by + 12, 1.2], [cx + 128, by + 24, 1]]) { ctx.fillStyle = day ? '#3f6a28' : '#10081e'; ctx.beginPath(); ctx.moveTo(tx - 7 * s2, ty + 12 * s2); ctx.lineTo(tx, ty - 10 * s2); ctx.lineTo(tx + 7 * s2, ty + 12 * s2); ctx.fill(); }
  ctx.fillStyle = day ? '#e3c26a' : '#3a2a18'; for (let i = 0; i < 6; i++) ctx.fillRect(cx - 7 - i * 1.5 + Math.sin(i * 1.1) * 6, by + 2 + i * 8, 14 + i * 3, 4);
}
function menuNight() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0810'); g.addColorStop(.55, '#1e1424'); g.addColorStop(1, '#4a2a14'); ctx.fillStyle = g; ctx.fillRect(-UIOX, 0, W, H);
  for (let i = 0; i < 80; i++) { const sx = -UIOX + rn(i) * W, sy = rn(i + 99) * H * .6, tw = .35 + .65 * Math.abs(Math.sin(T * 1.4 + i)); ctx.globalAlpha = tw; ctx.fillStyle = i % 5 ? '#fff' : '#ffd9a0'; ctx.fillRect(Math.round(sx), Math.round(sy), i % 7 ? 1 : 2, i % 7 ? 1 : 2); } ctx.globalAlpha = 1;
  const mx = UW * .9, my = 62, hov = (mouse.x - UIOX - mx) ** 2 + (mouse.y - my) ** 2 < 1600;
  ctx.globalCompositeOperation = 'lighter'; const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 90); mg.addColorStop(0, `rgba(255,240,200,${hov ? .6 : .35})`); mg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 90, my - 90, 180, 180); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#f4ead0'; ctx.beginPath(); ctx.arc(mx, my, 30, 0, 7); ctx.fill(); ctx.fillStyle = '#d8ccb0'; ctx.fillRect(mx - 12, my - 10, 8, 6); ctx.fillRect(mx + 6, my + 4, 10, 7); ctx.fillRect(mx - 6, my + 12, 6, 4);
  ridge(338, 34, 2.5, '#1d1236', 1.3); drawCastle(176, 326, false); ridge(372, 26, 6, '#120a24', 3.1);
  const gy = H - 48; ctx.fillStyle = '#0a0612'; ctx.fillRect(-UIOX, gy, W, 48); ctx.fillStyle = '#2a1a40'; ctx.fillRect(-UIOX, gy, W, 2);
  ctx.fillStyle = '#1a1030'; for (let x = -UIOX; x < W - UIOX; x += 18) ctx.fillRect(x + (x * 7 % 5), gy - 3, 3, 3);
  for (const tx of [64, UW - 64]) {
    ctx.fillStyle = '#4a3020'; ctx.fillRect(tx - 3, gy - 56, 6, 56); ctx.fillStyle = '#6a4a30'; ctx.fillRect(tx - 7, gy - 60, 14, 6);
    ctx.globalCompositeOperation = 'lighter'; const fg = ctx.createRadialGradient(tx, gy - 72, 2, tx, gy - 72, 60); fg.addColorStop(0, `rgba(255,150,40,${.3 + .08 * Math.sin(T * 9 + tx)})`); fg.addColorStop(1, 'rgba(255,120,20,0)'); ctx.fillStyle = fg; ctx.fillRect(tx - 60, gy - 132, 120, 120); ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 6; i++) { const p = (T * 1.4 + i / 6 + tx) % 1; pxl(tx + Math.sin(T * 5 + i * 2) * 3 * (1 - p), gy - 64 - p * 18, 6 * (1 - p) + 2, p < .5 ? '#ffd34a' : '#ff6a1a', 1 - p * .5); }
  }
  ctx.globalAlpha = .08; ctx.fillStyle = '#c8b8ff'; for (let i = 0; i < 3; i++) { const fx = ((T * (8 + i * 4) + i * 300) % (W + 400)) - 200 - UIOX; ctx.fillRect(fx, H - 120 - i * 26, 300, 14); } ctx.globalAlpha = 1;
  for (const e of embers) { e.y -= e.v / 60; e.x += Math.sin(T + e.y * .02) * .3; if (e.y < -5) { e.y = H + 5; e.x = Math.random() * W; } ctx.globalAlpha = .55; ctx.fillStyle = '#ff9a3c'; ctx.fillRect(e.x - UIOX, e.y, e.s, e.s); } ctx.globalAlpha = 1;
}
function cloudPix(x, y, k) {
  ctx.fillStyle = '#ffffff'; for (const [a, b, w, h] of [[0, 8, 44, 12], [8, 2, 26, 12], [24, 5, 24, 11], [34, 8, 22, 8]]) ctx.fillRect(Math.round(x + a * k), Math.round(y + b * k), Math.round(w * k), Math.round(h * k));
  ctx.fillStyle = '#dfe9ee'; ctx.fillRect(Math.round(x), Math.round(y + 17 * k), Math.round(56 * k), Math.round(3 * k));
}
function menuDay() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#86c4ee'); g.addColorStop(.5, '#cfe6f0'); g.addColorStop(.8, '#fff0c4'); g.addColorStop(1, '#ffe39a'); ctx.fillStyle = g; ctx.fillRect(-UIOX, 0, W, H);
  const mx = UW * .9, my = 62; ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createRadialGradient(mx, my, 10, mx, my, 120); sg.addColorStop(0, 'rgba(255,230,140,.55)'); sg.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = sg; ctx.fillRect(mx - 120, my - 120, 240, 240); ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + T * .25; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * 38, my + Math.sin(a) * 38); ctx.lineTo(mx + Math.cos(a) * 52, my + Math.sin(a) * 52); ctx.stroke(); }
  ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(mx, my, 31, 0, 7); ctx.fill(); ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(mx - 4, my - 4, 22, 0, 7); ctx.fill();
  for (let i = 0; i < 5; i++) { const c0 = ((T * (6 + i * 2.5) + i * 190) % (W + 160)) - 120 - UIOX; cloudPix(c0, 40 + (i * 53) % 130, .9 + (i % 3) * .25); }
  ridge(338, 34, 2.5, '#8fb35a', 1.3); drawCastle(176, 326, true);
  const wx = 640, wy = 318;   // moinho (a base fica escondida pela colina da frente)
  ctx.fillStyle = '#d9c9a0'; ctx.beginPath(); ctx.moveTo(wx - 18, wy + 74); ctx.lineTo(wx - 10, wy); ctx.lineTo(wx + 10, wy); ctx.lineTo(wx + 18, wy + 74); ctx.fill();
  ctx.fillStyle = '#c0432a'; ctx.beginPath(); ctx.moveTo(wx - 13, wy); ctx.lineTo(wx, wy - 16); ctx.lineTo(wx + 13, wy); ctx.fill();
  ctx.save(); ctx.translate(wx, wy - 2); ctx.rotate(T * .8); for (let i = 0; i < 4; i++) { ctx.rotate(1.5708); ctx.fillStyle = '#f1e6c8'; ctx.fillRect(-2, 0, 4, 38); ctx.fillStyle = '#fffaf0'; ctx.fillRect(2, 6, 12, 26); } ctx.restore();
  ridge(372, 26, 6, '#c8ac48', 3.1);
  for (let x = -UIOX; x < W - UIOX; x += 9) { const sw = Math.sin(T * 2 + x * .1) * 2, o = (x * 13 % 12 + 12) % 12; ctx.fillStyle = '#d9b03c'; ctx.fillRect(x + sw, H - 90 + o, 2, 10); ctx.fillStyle = '#f0cd5a'; ctx.fillRect(x + sw - 1, H - 92 + o, 4, 3); }
  const gy = H - 48; ctx.fillStyle = '#4f8a2e'; ctx.fillRect(-UIOX, gy, W, 48); ctx.fillStyle = '#6aaa3a'; ctx.fillRect(-UIOX, gy, W, 3);
  for (let x = -UIOX; x < W - UIOX; x += 14) {
    ctx.fillStyle = '#3d7424'; ctx.fillRect(x + (x * 7 % 5), gy + 8 + (x * 3 % 20), 3, 2);
    const f = ((x * 5) % 4 + 4) % 4; if (f === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, gy - 2, 3, 3); } else if (f === 1) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(x + 6, gy - 3, 3, 3); } else if (f === 2) { ctx.fillStyle = '#e8503a'; ctx.fillRect(x + 2, gy - 2, 3, 3); }
  }
  for (const tx of [64, UW - 64]) { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(tx - 3, gy - 58, 6, 58); const wv = Math.sin(T * 3 + tx) * 3; ctx.fillStyle = '#e6b53a'; ctx.beginPath(); ctx.moveTo(tx + 3, gy - 58); ctx.lineTo(tx + 30 + wv, gy - 52); ctx.lineTo(tx + 3, gy - 38); ctx.fill(); ctx.fillStyle = '#b8892a'; ctx.fillRect(tx + 3, gy - 58, 26 + wv, 2); }
  for (let i = 0; i < 4; i++) { const bx = ((T * (30 + i * 8) + i * 220) % (W + 200)) - 100 - UIOX, by2 = 110 + i * 26 + Math.sin(T * 2 + i) * 6, fl = Math.sin(T * 10 + i * 2) * 4; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 7, by2 - fl); ctx.lineTo(bx, by2); ctx.lineTo(bx + 7, by2 - fl); ctx.stroke(); }
  for (let i = 0; i < 24; i++) { const px = (rn(i + 3) * W + T * 12) % W - UIOX, py = (rn(i + 60) * H - T * 14 + H * 3) % H; ctx.globalAlpha = .5 + .3 * Math.sin(T * 2 + i); ctx.fillStyle = '#fff3b0'; ctx.fillRect(Math.round(px), Math.round(py), 2, 2); } ctx.globalAlpha = 1;
}
// easter egg: clicar na lua (ou no sol) alterna entre noite e dia
let dayT = 0, dayGoal = 0;
function toggleDay() { dayGoal = dayGoal ? 0 : 1; SFX.ready(); }
function menuScene() {
  dayT += Math.sign(dayGoal - dayT) * Math.min(Math.abs(dayGoal - dayT), .025);
  if (dayT > .5) menuDay(); else menuNight();
  if (dayT > 0 && dayT < 1) { ctx.globalAlpha = Math.sin(dayT * Math.PI) * .55; ctx.fillStyle = '#fff1b0'; ctx.fillRect(-UIOX, 0, W, H); ctx.globalAlpha = 1; }
}
function heroMenu(name, x, y, k, flip) { const img = SPR[name].n; ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1); ctx.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k); ctx.restore(); }
function drawMenu() {
  menuScene();
  { const mx0 = UW * .9, my0 = 62; ui.push({ x: mx0 - 40, y: my0 - 40, w: 80, h: 80, fn: toggleDay }); if ((mouse.x - UIOX - mx0) ** 2 + (mouse.y - my0) ** 2 < 1600) cv.style.cursor = CUR.hand; }
  // titulo com brilho a passar
  const gx = UW / 2, bob = Math.sin(T * 1.5) * 3, pos = (T * .3) % 1.5 - .25, st = v => Math.max(0, Math.min(1, v));
  ctx.globalCompositeOperation = 'lighter'; const tg = ctx.createRadialGradient(gx, 100 + bob, 10, gx, 100 + bob, 230); tg.addColorStop(0, 'rgba(255,190,80,.16)'); tg.addColorStop(1, 'rgba(255,190,80,0)'); ctx.fillStyle = tg; ctx.fillRect(gx - 240, 0, 480, 220); ctx.globalCompositeOperation = 'source-over';
  const gr = ctx.createLinearGradient(gx - 250, 0, gx + 250, 0); gr.addColorStop(0, '#e8b050'); gr.addColorStop(st(pos - .1), '#e8b050'); gr.addColorStop(st(pos), '#fff6c8'); gr.addColorStop(st(pos + .1), '#e8b050'); gr.addColorStop(1, '#e8b050');
  for (let i = 5; i >= 1; i--) txt('GUARDIANS OF GOLD', gx + i, 104 + bob + i, 50, '#3a1a00', 'center', 'bold');
  txt('GUARDIANS OF GOLD', gx, 104 + bob, 50, gr, 'center', 'bold');
  weaponIcon('k_sword', gx - 276, 88 + bob, 4, -.785 + Math.sin(T * 1.5) * .06); weaponIcon('k_sword', gx + 276, 88 + bob, 4, -2.356 - Math.sin(T * 1.5) * .06);
  txt('Caça monstros. Forja armas. Derrota os bosses.', gx, 140, 17, dayT > .5 ? '#5a4528' : '#c9c2d8', 'center');
  // botoes com selecao por teclado
  const bx = 290, bw = 220;
  menuItems = []; if (save) menuItems.push({ h: 46, fn: goHub });
  const noNew = !!(ONLINE_URL && on.token && save);   // com sessao iniciada nao ha "Novo Jogo": os personagens criam-se no Perfil
  if (!noNew) menuItems.push({ h: 40, fn: () => { if (save && !menuConfirm) menuConfirm = true; else { menuConfirm = false; state = 'class'; } } });
  menuItems.push({ h: 40, fn: () => { optBack = 'menu'; state = 'options'; } });
  if (menuSel >= menuItems.length) menuSel = 0;
  let y = 172; const moved = mouse.x !== menuMouse.x || mouse.y !== menuMouse.y; menuMouse = { x: mouse.x, y: mouse.y };
  menuItems.forEach((it, i) => { it.y = y; y += it.h + 12; if (moved && mouse.x - UIOX >= bx && mouse.x - UIOX <= bx + bw && mouse.y >= it.y && mouse.y <= it.y + it.h) menuSel = i; });
  let idx = 0;
  if (save) {
    const it = menuItems[idx], sel = menuSel === idx++;
    btn(bx, it.y, bw, it.h, '', it.fn, { sel, col: '#2f7a4a', hot: '#3fa061' });
    txt('Continuar', bx + bw / 2, it.y + 21, 19, '#fff', 'center', 'bold'); txt(`${CLASSES[save.cls].name} · Nv ${save.pl.lv} · ¢${gfmt(save.gold)}`, bx + bw / 2, it.y + 38, 11, '#c8ffd8', 'center');
  }
  if (!noNew) { const it = menuItems[idx], sel = menuSel === idx++; btn(bx, it.y, bw, it.h, menuConfirm ? 'Apagar tudo e começar?' : 'Novo Jogo', it.fn, { sel, size: menuConfirm ? 15 : 19, col: menuConfirm ? '#8a3a2a' : '#5c4a20' }); }
  { const it = menuItems[idx], sel = menuSel === idx++; btn(bx, it.y, bw, it.h, 'Opções', it.fn, { sel, size: 18, col: '#4a3a7a' }); }
  const cur = menuItems[menuSel]; if (cur) { const cy = cur.y + cur.h / 2, dx = Math.round(Math.sin(T * 6) * 2); chevron(bx - 22 + dx, cy, 1); chevron(bx + bw + 22 - dx, cy, -1); }
  // herois com as armas na mao
  ['knight', 'archer', 'mage'].forEach((c, i) => {
    const x = [150, 400, 650][i], flip = i === 2, d = flip ? -1 : 1, yy = 410 + Math.sin(T * 3 + i) * 1.5, w = CLASSES[c].weapons[save ? save.eq[c] : 0];
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(x, H - 50, 30, 7, 0, 0, 7); ctx.fill();
    heroMenu(c + '0', x, yy, 2.4, flip);
    const base = w.t === 'melee' ? -.9 : w.t === 'arrow' ? -.12 : -1.3, ang = (d > 0 ? base : Math.PI - base) + Math.sin(T * 2 + i) * .07;
    const hh = HAND[c], hx = x + d * hh[0] * 3 * 2.4, hy = yy + hh[1] * 3 * 2.4; drawWeapon(w.id, hx, hy, ang, 2.4, 2.4);
    if (GLOWW[w.id]) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = GLOWW[w.id]; ctx.globalAlpha = .45 + .15 * Math.sin(T * 8); ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * wGlowD(w.id, 2.4, 22), hy + Math.sin(ang) * wGlowD(w.id, 2.4, 22), wGlowR(w.id, 2.4, 11), 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  });
  txt('Usa W/S ou ↑↓ e Enter · F ecrã inteiro · M som', gx, H - 14, 12, dayT > .5 ? '#fff6d0' : '#9a8fb8', 'center');
  txt('v1.3-BETA', UW - 10, H - 10, 11, '#8a7a50', 'right');
}
function drawClass() {
  menuBg(); txt('Escolhe a tua classe', UW / 2, 52, 34, '#f0c060', 'center', 'bold');
  txt(cloud.cls || cloud.taken.length ? 'Cada personagem tem uma classe fixa e a conta só pode ter uma de cada.' : 'A escolha é permanente para este personagem. Mais tarde podes criar outros, um por classe.', UW / 2, 76, 13, '#e8a0a0', 'center');
  Object.keys(CLASSES).forEach((k, i) => {
    const c = CLASSES[k], x = 40 + i * 245, y = 92, w = 230, h = 384;
    panel(x, y, w, h);
    drawSprBig(k + '0', x + w / 2, y + 58 + Math.sin(T * 3 + i) * 3, 2.9);
    txt(c.name, x + w / 2, y + 134, 24, '#fff', 'center', 'bold');
    txt('Vida', x + 18, y + 160, 13, '#bbb'); bar(x + 70, y + 149, 140, 12, c.hp / 150, '#d44');
    txt('Veloc.', x + 18, y + 182, 13, '#bbb'); bar(x + 70, y + 171, 140, 12, c.spd / 200, '#4c9');
    txt('Especial:', x + 18, y + 208, 13, '#f0c060', 'left', 'bold'); txt(c.sp, x + 18, y + 226, 15, '#fff', 'left', 'bold');
    wrap(c.spDesc, x + 18, y + 245, w - 36, 17, 13, '#bbb');
    wrap(c.desc, x + 18, y + 293, w - 36, 17, 13, '#9ab');
    const lockedOut = cloud.cls ? k !== cloud.cls : cloud.taken.includes(k);
    if (lockedOut) { ctx.fillStyle = '#000a'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); wrap(cloud.cls ? 'Este personagem é de outra classe.' : 'Já tens um personagem com esta classe.', x + 18, y + h - 90, w - 36, 16, 13, '#f99'); }
    btn(x + 20, y + h - 46, w - 40, 36, lockedOut ? 'Indisponível' : 'Escolher', () => cloudNewGame(k), { col: '#2f7a4a', hot: '#3fa061', off: lockedOut });
  });
  btn(20, 14, 90, 32, '< Voltar', () => state = 'menu', { size: 14 });
}
function slider(label, y, v, set, rel) {
  const tx = 305, tw = 230; txt(label, 215, y + 13, 15, '#fff', 'left', 'bold'); txt(Math.round(v * 100) + '%', 585, y + 13, 14, '#f0c060', 'right', 'bold');
  bevel(tx, y + 3, tw, 10, '#0c0c16', '#05050a', '#3a3a5a'); ctx.fillStyle = '#f0c060'; ctx.fillRect(tx + 1, y + 4, Math.max(0, (tw - 2) * v), 8);
  const kx = Math.round(tx + tw * v); ctx.fillStyle = '#fff'; ctx.fillRect(kx - 3, y - 1, 6, 18); ctx.fillStyle = '#05050a'; ctx.fillRect(kx - 4, y - 2, 1, 20); ctx.fillRect(kx + 3, y - 2, 1, 20);
  ui.push({ x: tx - 8, y: y - 5, w: tw + 16, h: 28, drag: true, rel, fn: () => set(Math.max(0, Math.min(1, (mouse.x - UIOX - tx) / tw))) });
}
function drawOptions() {
  menuBg(); txt('OPÇÕES', UW / 2, 42, 32, '#f0c060', 'center', 'bold');
  panel(190, 54, 420, 384);
  txt('Idioma', UW / 2, 82, 17, '#fff', 'center', 'bold');
  btn(215, 90, 175, 30, 'Português (Portugal)', () => setLang('pt'), { size: 14, col: lang === 'pt' ? '#2f7a4a' : '#5c4a20' });
  btn(410, 90, 175, 30, 'English (UK)', () => setLang('en'), { size: 14, col: lang === 'en' ? '#2f7a4a' : '#5c4a20' });
  slider('Efeitos', 128, volSfx, v => { volSfx = v; applyVol(); }, () => SFX.hit());
  slider('Interface', 154, volUi, v => { volUi = v; applyVol(); }, () => SFX.coin());
  slider('Música', 180, volMus, v => { volMus = v; applyVol(); });
  btn(215, 200, 370, 28, muted ? 'Som: DESLIGADO' : 'Som: LIGADO', () => muted = !muted, { size: 15, col: '#4a3a6a' });
  btn(215, 230, 370, 28, autoAtk ? 'Auto-ataque: LIGADO' : 'Auto-ataque: DESLIGADO', () => { autoAtk = !autoAtk; try { localStorage.setItem('bladehunter_auto', autoAtk ? '1' : '0'); } catch (e) {} }, { size: 15 });
  btn(215, 264, 370, 28, `Velocidade do jogo: x${gameSpeed}`, toggleSpeed, { size: 15, col: gameSpeed === 2 ? '#a06a20' : '#5c4a20' });
  btn(215, 298, 370, 28, 'Ecrã inteiro (F)', toggleFS, { size: 15 });
  btn(215, 332, 370, 28, 'Teclas', () => openKeys('options'), { size: 15 });
  btn(300, 448, 200, 34, '< Voltar', () => { state = optBack; }, { size: 15 });
}
function drawKeys() {
  menuBg(); txt('TECLAS', UW / 2, 48, 34, '#f0c060', 'center', 'bold');
  txt('Clica numa tecla e prime a nova. (Esc cancela)', UW / 2, 70, 14, '#aab', 'center');
  panel(120, 80, 560, 348);
  BIND_LABELS.forEach(([a, label], i) => {
    const y = 88 + i * 30; txt(label, 140, y + 19, 16, '#fff');
    const cap = capture === a;
    btn(520, y + 1, 140, 25, cap ? 'Prime uma tecla…' : keyName(binds[a]), () => { capture = a; }, { size: 14, col: cap ? '#a06a20' : '#5c4a20' });
  });
  txt('Fixas: ↑↓←→ também movem · Rato esq. ataca, dir. usa o especial · P pausa · M som · F ecrã inteiro', UW / 2, 448, 12, '#9a93b0', 'center');
  btn(120, 458, 180, 34, 'Repor predefinições', () => { binds = Object.assign({}, DEF_BINDS); saveBinds(); }, { size: 14, col: '#6a2a2a' });
  btn(580, 458, 100, 34, '< Voltar', () => { state = keysBack; capture = null; }, { size: 14 });
}
