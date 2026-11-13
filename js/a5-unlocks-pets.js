'use strict';
/* ----- cadeados, desbloqueios e animacao ----- */
let ua = null, lkShake = {}, hubToast = { t: 0, s: '', col: '#fff' }, charStrip = null;
const TAB_LV = { raids: 10, ench: 15, anvil: 15, fuse: FUSE_LV, pets: 30 }, LOCK_TABS = Object.keys(TAB_LV);
const tabLv = t => TAB_LV[t] || 0;
const tabOpen = t => !save || save.pl.lv >= tabLv(t);
function lockClick(key) { lkShake[key] = .35; SFX.locked(); }
function lkOff(key) { return lkShake[key] > 0 ? Math.sin(T * 70) * 3 * lkShake[key] / .35 : 0; }
const LOCK_ROWS = [   // o mesmo desenho 16x16 do icone do cadeado (art/icons/lock.png); as 6 primeiras linhas sao a argola, o resto o corpo
  '................', '.....abbbbb.....', '....aaaaaaab....', '....aaa..aab....', '....aa....ab....', '....aa....ab....', '..cccccccccccc..', '..cdddddddddde..', '..cdddddddddde..', '..cdddffffddde..', '..cdddffffddde..', '..cddddffdddde..', '..cddddffdddde..', '..cdddddddddde..', '..cdddddddddde..', '..eeeeeeeeeeee..',
];
const LOCK_PAL = { a: '#9b9999', b: '#626060', c: '#f0c860', d: '#c9962a', e: '#8a6418', f: '#2a1a08' };
let LOCK_SPR = null;
// cadeado em pixel-art (o = 0 fechado ... 1 aberto: a argola sobe e desloca-se)
function drawLockBig(cx, cy, k, o) {
  if (!LOCK_SPR) LOCK_SPR = { sh: makeSprite(LOCK_ROWS.slice(0, 6), LOCK_PAL, 1, false), body: makeSprite(LOCK_ROWS.slice(6), LOCK_PAL, 1, false) };
  const p = Math.max(1, Math.round(k * 1.5)), x0 = Math.round(cx - 8 * p), y0 = Math.round(cy - 8 * p), lift = Math.round(o * 4) * p, dx = Math.round(Math.max(0, o - .5) * 4) * p;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(LOCK_SPR.sh, x0 + dx, y0 - lift, 16 * p, 6 * p); ctx.drawImage(LOCK_SPR.body, x0, y0 + 6 * p, 16 * p, 10 * p);
}
function markUnl(sv) {
  sv.unl = sv.unl || {};
  for (const c in CLASSES) CLASSES[c].weapons.forEach((w, i) => { const r = WEAPON_REQ[i]; if (sv.pl.lv >= r.lv && !(r.raid !== undefined && !((sv.raids[r.raid] || [0])[0] > 0))) sv.unl[w.id] = 1; });
  for (const t of LOCK_TABS) if (sv.pl.lv >= tabLv(t)) sv.unl['t_' + t] = 1;
}
function nerfGear(sv) {
  const f = it => { if (!it || !it.main) return; const sc = o => { if (o && GEAR_F[o.k]) o.v = it.main === o && o.k === 'hp' ? Math.round(o.v * GEAR_F[o.k]) : +(o.v * GEAR_F[o.k]).toFixed(1); }; sc(it.main); (it.aff || []).forEach(sc); sc(it.spec); };
  const g3 = it => { if (!it || !it.main) return; const sc = o => { if (!o) return; const m = (it.r === 4 ? MYTH_F : 1) * (o.k === 'ls' ? GEAR_F.ls : 1); if (m !== 1) o.v = o.k === 'hp' ? Math.round(o.v * m) : +(o.v * m).toFixed(1); }; sc(it.main); (it.aff || []).forEach(sc); sc(it.spec); };
  if ((sv.gv | 0) < 2) { for (const sl of SLOTS) f(sv.gear && sv.gear[sl]); (sv.bag || []).forEach(f); sv.gv = 2; }
  if (sv.gv < 3) { for (const sl of SLOTS) g3(sv.gear && sv.gear[sl]); (sv.bag || []).forEach(g3); sv.gv = 3; }
}
function checkUnlocks() {
  checkAch();
  if (save && (save.gv | 0) < 3) { nerfGear(save); persist(); }
  if (!save || ua) return; if (!save.unl) { markUnl(save); persist(); return; }
  let q = null; CLASSES[save.cls].weapons.forEach((w, i) => { if (!q && weaponReq(i).ok && !save.unl[w.id]) q = { key: w.id, name: w.n, w: w.id }; });
  for (const t of LOCK_TABS) { if (!tabOpen(t) && save.unl['t_' + t]) delete save.unl['t_' + t]; if (!q && tabOpen(t) && !save.unl['t_' + t]) q = { key: 't_' + t, name: TAB_INFO[t][0] }; }
  if (q) { save.unl[q.key] = 1; persist(); ua = Object.assign({ t: 0, sp: [], fx: false }, q); }
}
function updateUnlock(dt) {
  for (const k in lkShake) { lkShake[k] -= dt; if (lkShake[k] <= 0) delete lkShake[k]; } if (hubToast.t > 0) hubToast.t -= dt;
  if (!ua) return; ua.t += dt;
  if (ua.t > .6 && !ua.fx) { ua.fx = true; SFX.unlock(); for (let i = 0; i < 60; i++) { const a = Math.random() * 6.283, v = 80 + Math.random() * 260; ua.sp.push({ x: UW / 2, y: 175, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, l: .9 + Math.random() * .6, c: i % 3 ? '#ffd34a' : '#fff' }); } }
  for (const q of ua.sp) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; q.l -= dt; } ua.sp = ua.sp.filter(q => q.l > 0);
  if (ua.t > 4.2) ua = null;
}
function drawUnlock() {
  if (!ua) return; const o = Math.max(0, Math.min(1, (ua.t - .55) / .35)), shake = ua.t < .6 ? Math.sin(ua.t * 60) * 3 * (ua.t / .6) : 0;
  ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H);
  if (o > 0 && o < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffd34a'; ctx.globalAlpha = (1 - o) * .5; ctx.beginPath(); ctx.arc(UW / 2, 175, 50 + o * 140, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  drawLockBig(UW / 2 + shake, 175, 4.5, o);
  for (const q of ua.sp) { ctx.globalAlpha = Math.max(0, Math.min(1, q.l * 2)); ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 3, 3); } ctx.globalAlpha = 1;
  if (ua.t > .7) { const a = Math.min(1, (ua.t - .7) * 3); ctx.globalAlpha = a; txt('DESBLOQUEADO!', UW / 2, 300, 38, '#ffd34a', 'center', 'bold'); txt(ua.name, UW / 2, 336, 24, '#fff', 'center', 'bold'); if (ua.w) weaponIcon(ua.w, UW / 2, 392, 4); ctx.globalAlpha = 1; }
  ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { if (ua && ua.t > .9) ua = null; } });
}
const TAB_INFO = {
  raids: ['Raids', 'Combates contra bosses muito difíceis, com muito ouro e itens raros garantidos.'],
  anvil: ['Bigorna', 'Melhora as tuas armas até +20, com amuletos de sorte e pergaminhos de proteção.'],
  ench: ['Encantar', 'Refina o equipamento até +10 e sorteia encantamentos especiais.'],
  fuse: ['Fusão', 'Junta 5 armas ou peças iguais para ganhares estrelas, mais poder e habilidades melhoradas.'],
  pets: ['Pets', 'Companheiros que te seguem e te dão bónus enquanto estiverem perto.'],
};
function wrapC(str, cx, y, maxW, lh, size, col) {
  let line = ''; const out = []; str = L(str);
  for (const w of str.split(' ')) { const t = line ? line + ' ' + w : w; if (line && txtW(t, size) > maxW) { out.push(line); line = w; } else line = t; } if (line) out.push(line);
  out.forEach((l, i) => txt(l, cx, y + i * lh, size, col, 'center')); return out.length;
}
function drawTabLock(t) {
  const lv = tabLv(t), [nm, ds] = TAB_INFO[t], cur = save.pl.lv, left = Math.max(0, lv - cur), need = xpNeed(cur), cx = 487;
  drawLockBig(cx + lkOff(t), 178, 3, 0);
  txt(nm, cx, 260, 30, '#fff', 'center', 'bold');
  const n = wrapC(ds, cx, 286, 400, 17, 14, '#b8c4e0'), y0 = 286 + n * 17 + 12;
  txt(`Desbloqueia no Nível ${lv}`, cx, y0 + 12, 22, '#ffd34a', 'center', 'bold');
  bar(cx - 160, y0 + 28, 320, 12, Math.min(1, (cur - 1) / Math.max(1, lv - 1)), '#a8821f'); txt(`Nv ${cur}`, cx - 160, y0 + 56, 12, '#9ab', 'left', 'bold'); txt(`Nv ${lv}`, cx + 160, y0 + 56, 12, '#ffd34a', 'right', 'bold');
  txt(`${left === 1 ? 'Falta' : 'Faltam'} ${left} ${left === 1 ? 'nível' : 'níveis'} para desbloquear`, cx, y0 + 82, 16, '#f88', 'center', 'bold');
  txt(`Próximo nível: ${save.pl.xp}/${need} XP`, cx, y0 + 102, 12, '#9ab', 'center');
  txt('Joga na Campanha para ganhar XP e subir de nível.', cx, y0 + 120, 12, '#778', 'center');
  ui.push({ x: 197, y: 90, w: 585, h: 385, fn: () => lockClick(t) });
}
function drawStars(n, x, cy, k) { for (let i = 0; i < n; i++) drawIcon('star', x + i * 8 * k + 3.5 * k, cy, k); }   // estrelas centradas na linha
function drawGuildProfile() {
  if (state !== 'hub' || (tab !== 'rank' && tab !== 'guild') || !rk.gp) return;
  const P = rk.gp, g = P.d; ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H);
  ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { rk.gp = null; } });
  const x = 170, y = 26, w = 460, h = 448; panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  btn(x + w - 40, y + 10, 28, 26, 'X', () => { rk.gp = null; }, { size: 14, col: '#6a2a2a', hot: '#8a3a3a' });
  if (!g) { txt(P.err ? E2('Guild unavailable', 'Guilda indisponível') : E2('Loading...', 'A carregar...'), x + w / 2, y + 200, 18, P.err ? '#f88' : '#9ab', 'center', 'bold'); return; }
  const gc = gcol(g.color), sec = (t, sx, sy, sw) => { txt(t, sx, sy, 13, '#f0c060', 'left', 'bold'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(sx, sy + 6, sw, 1); };
  drawGEmb(g.emblem, x + 20, y + 16, 5, gc); txt(`[${g.tag}] ${g.name}`, x + 74, y + 44, 22, gc, 'left', 'bold');
  if (g.motto) txt(g.motto, x + 74, y + 64, 12, '#9ab'); else txt(E2('No motto', 'Sem lema'), x + 74, y + 64, 12, '#556');
  ctx.fillStyle = '#3a3a5a'; ctx.fillRect(x + 16, y + 74, w - 32, 1);
  txt(E2(`Level ${g.level} / ${GUILD.maxLv}`, `Nível ${g.level} / ${GUILD.maxLv}`), x + 20, y + 98, 13, '#9cf', 'left', 'bold'); bar(x + 130, y + 90, 150, 9, g.level >= GUILD.maxLv ? 1 : g.xp / g.need, '#a8821f');
  if (g.leader_nick) { const l1 = E2('Leader ', 'Líder '), lw = txtW(g.leader_nick, 13, 'bold'), l1w = txtW(l1, 13), lx = x + w - 20 - lw - l1w; txt(l1, lx, y + 98, 13, '#8a9ab8'); txt(g.leader_nick, lx + l1w, y + 98, 13, '#6cc4ff', 'left', 'bold'); ctx.fillStyle = '#6cc4ff'; ctx.fillRect(lx + l1w, y + 101, lw, 1); ui.push({ x: lx + l1w, y: y + 85, w: lw, h: 18, fn: () => openProfile(g.leader_nick) }); }
  sec(E2('Perks', 'Bónus'), x + 20, y + 128, w - 40);
  GPERK.forEach(([k, nm, per], i) => { const px = x + 20 + (i % 2) * 220, py = y + 152 + Math.floor(i / 2) * 22, lv = (g.perks && g.perks[k]) | 0; txt(E2(nm[0], nm[1]), px, py, 12, '#aab6d0'); txt(`+${gPct(per, lv) || 0}%  (${lv}/10)`, px + 200, py, 12, lv ? '#6f6' : '#667', 'right', 'bold'); });
  sec(E2(`Members ${g.members.length}/${GUILD.max}`, `Membros ${g.members.length}/${GUILD.max}`), x + 20, y + 214, w - 40); txt(E2('Points', 'Pontos'), x + w - 22, y + 214, 11, '#778', 'right');
  g.members.forEach((m, i) => { const ry = y + 238 + i * 20, mx = mouse.x - UIOX; ctx.fillStyle = i % 2 ? '#13132a' : '#18183a'; ctx.fillRect(x + 16, ry - 12, w - 32, 19);
    if (mx >= x + 16 && mx <= x + w - 16 && mouse.y >= ry - 12 && mouse.y <= ry + 7) { ctx.fillStyle = '#ffffff14'; ctx.fillRect(x + 16, ry - 12, w - 32, 19); }
    ui.push({ x: x + 16, y: ry - 12, w: w - 32, h: 19, fn: () => openProfile(m.nick) });
    txt(m.nick, x + 26, ry, 13, m.leader ? '#ffd34a' : '#e8ecff', 'left', 'bold'); txt(`Lv ${m.level | 0}`, x + 300, ry, 11, '#8a9ab8', 'right'); txt(gfmt(m.contrib | 0), x + w - 24, ry, 12, '#fd5', 'right', 'bold'); });
  txt(E2('Click a member to see their profile', 'Clica num membro para ver o perfil'), x + w / 2, y + h - 8, 10, '#667', 'center');
}
function drawProfile() {
  if (state !== 'hub' || (tab !== 'rank' && tab !== 'guild') || !rk.prof) return;
  const P = rk.prof, d = P.d; ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H);
  ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { rk.prof = null; } });
  const x = 150, y = 78, w = 500, h = 404; panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  btn(x + w - 40, y + 10, 28, 26, 'X', () => { rk.prof = null; }, { size: 14, col: '#6a2a2a', hot: '#8a3a3a' });
  if (!d) { txt(P.err ? 'Perfil indisponível' : 'A carregar perfil...', x + w / 2, y + 200, 18, P.err ? '#f88' : '#9ab', 'center', 'bold'); return; }
  const b = d.build, cn = CLASSES[d.cls] ? CLASSES[d.cls].name : d.cls, sec = (t, sx, sy, sw) => { txt(t, sx, sy, 13, '#f0c060', 'left', 'bold'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(sx, sy + 6, sw, 1); };
  txt(d.nick, x + 20, y + 36, 24, '#ffd34a', 'left', 'bold'); if (d.country) drawFlag(d.country, x + 20 + txtW(d.nick, 24, 'bold') + 12, y + 20, 24, 16); if (d.guild) { const gx = x + 20 + txtW(d.nick, 24, 'bold') + (d.country ? 48 : 16), gt = `[${d.guild.tag}] ${d.guild.name}`, gw = txtW(gt, 13), gh = mouse.x - UIOX >= gx && mouse.x - UIOX <= gx + gw && mouse.y >= y + 22 && mouse.y <= y + 38; txt(gt, gx, y + 34, 13, gh ? '#fff' : gcol(d.guild.color)); if (d.guild.id) { ctx.fillStyle = gcol(d.guild.color); ctx.fillRect(gx, y + 37, gw, 1); ui.push({ x: gx, y: y + 22, w: gw, h: 16, fn: () => openGuild(d.guild.id) }); } }
  if (d.account) { const a1 = E2('Account of ', 'Conta de '), aw = txtW(d.account, 13, 'bold'), a1w = txtW(a1, 13), ax = x + w - 20 - aw - a1w; txt(a1, ax, y + 58, 13, '#8a9ab8'); txt(d.account, ax + a1w, y + 58, 13, '#6cc4ff', 'left', 'bold'); ctx.fillStyle = '#6cc4ff'; ctx.fillRect(ax + a1w, y + 61, aw, 1); ui.push({ x: ax + a1w, y: y + 45, w: aw, h: 18, fn: () => openProfile(d.account) }); } txt(`${cn} · Nv ${gfmt(d.level)}`, x + 20, y + 58, 14, '#9cf', 'left', 'bold'); if (d.build && d.build.title && TITLES[d.build.title]) drawTitle('« ' + titleName(d.build.title) + ' »', x + 20 + txtW(`${cn} · Nv ${gfmt(d.level)}`, 14, 'bold') + 14, y + 58, 14, d.build.title);
  ctx.fillStyle = '#3a3a5a'; ctx.fillRect(x + 16, y + 72, w - 32, 1);
  // retrato e arma
  const px = x + 20, py = y + 88; ctx.fillStyle = '#0e0e1a'; ctx.fillRect(px, py, 140, 112);
  const bp = b && b.pet && PETS[b.pet.id] ? b.pet : null;
  drawSprBig(hk(d.cls, b ? b.skin : 0, d.gender), px + (bp ? 46 : 70), py + 52 + Math.sin(T * 2) * 2, 2.8);
  if (bp) { const im = petImg(bp.id, T), k = bp.id === 'dog' ? 3 : bp.id === 'chicken' ? 3.2 : 3.6, pw = im.width * k, ph = im.height * k, pn = bp.name || petSpecies(bp.id);
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(px + 106, py + 76, 14, 4, 0, 0, 7); ctx.fill(); ctx.drawImage(im, Math.round(px + 106 - pw / 2), Math.round(py + 60 - ph / 2 + Math.sin(T * 3) * 2), pw, ph);
    { let fs = 10; while (fs > 7 && txtW(pn, fs, 'bold') > 64) fs--; txt(pn, px + 106, py + 92, fs, '#cfd8f0', 'center', 'bold'); } txt(`Lv ${bp.lv | 0}`, px + 106, py + 105, 9, '#ffd34a', 'center', 'bold'); }
  const wd = b && b.weapon && CLASSES[d.cls] ? CLASSES[d.cls].weapons.find(q => q.id === b.weapon.id) : null, wst = wd ? b.weapon.st | 0 : 0;
  sec(T2('Arma', 'Weapon'), px, py + 134, 140);
  if (wd) { STAR_OV = wst; weaponIcon(wd.id, px + 20, py + 166, 1.5, -.785); STAR_OV = -1; txt(wd.n, px + 44, py + 160, 12, '#fff', 'left', 'bold'); { const wl = '+' + (b.weapon.lv | 0); txt(wl, px + 44, py + 177, 12, '#ffd34a', 'left', 'bold'); drawStars(wst, px + 44 + txtW(wl, 12, 'bold') + 10, py + 173, 1.2); } }
  else txt('—', px, py + 166, 13, '#556');
  // atributos
  const mx = x + 184; sec('Atributos', mx, y + 100, 130);
  if (b && b.attr) ATTRS.forEach((q, i) => { const ry = y + 114 + i * 38, ac = ['#ff6a7a', '#ff9a3a', '#6adfff', '#ffe24a'][i]; ctx.fillStyle = ac; ctx.fillRect(mx, ry + 4, 2, 28); txt(q[1], mx + 12, ry + 24, 13, '#aab6d0'); txt(gfmt(b.attr[q[0]] | 0), mx + 130, ry + 24, 14, ac, 'right', 'bold'); });   // mesmas linhas do equipamento
  else txt('Sem build partilhada', mx, y + 130, 12, '#778');
  // equipamento
  const ex = x + 334; sec('Equipamento', ex, y + 100, 146);
  EQ_SLOTS.forEach((sl, i) => {
    const it = b && b.gear ? b.gear[sl] : null, yy = y + 112 + i * 31;
    if (!it) { ctx.globalAlpha = .3; slotIcon(sl, 0, ex + 14, yy + 14, 1.8); ctx.globalAlpha = 1; txt('—', ex + 36, yy + 19, 12, '#556'); return; }
    const rc = RAR[it.r | 0][1]; ctx.fillStyle = rc; ctx.fillRect(ex, yy + 2, 2, 26);
    if (sl === 'ring') { ringIcon(it.r | 0, it.g | 0, ex + 18, yy + 15, 2); txt(ITEM_NAMES.ring[Math.min(3, it.r | 0)], ex + 38, yy + 12, 11, rc, 'left', 'bold'); txt(T2('Conjunto: ', 'Set: ') + AFF[GEM_STAT[(it.g | 0) % 4]].n, ex + 38, yy + 25, 10, '#9ab'); return; }
    slotIcon(sl, it.r | 0, ex + 18, yy + 15, 1.8);
    txt(ITEM_NAMES[sl][it.r | 0], ex + 38, yy + 12, 11, rc, 'left', 'bold');
    { const t1 = `+${it.e | 0}${it.sp ? ' · ' + it.sp : ''}`; txt(t1, ex + 38, yy + 25, 10, '#9ab'); if (it.st) drawStars(it.st | 0, ex + 38 + txtW(t1, 10) + 9, yy + 21, 1); }
  });
  // totais e recordes, em linhas simples
  const ty = y + 286; ctx.fillStyle = '#3a3a5a'; ctx.fillRect(x + 16, ty - 14, w - 32, 1);
  [['Mobs mortos', gfmt(d.kills | 0)], ['Ouro ganho', gfmt(d.gold | 0)], ['Bosses', gfmt(d.bosses | 0)], ['Raids', gfmt(d.raids | 0)]].forEach(([n, v], i) => { const tx = x + 20 + i * 118; txt(n, tx, ty + 4, 11, '#8a9ab8'); txt(v, tx, ty + 24, 16, i === 1 ? '#fd5' : '#fff', 'left', 'bold'); });
  sec('Recorde de waves', x + 20, ty + 56, w - 40);
  (d.waves || []).forEach((v, i) => { const wx = x + 20 + (i % 3) * 158, wy = ty + 82 + Math.floor(i / 3) * 24; txt(MISSIONS[i] ? MISSIONS[i].name : 'Mapa ' + (i + 1), wx, wy, 11, '#8a9ab8'); txt(String(v | 0), wx + 146, wy, 13, v ? ((v | 0) >= FARM_UNLOCK[i] ? '#ffd34a' : '#fff') : '#556', 'right', 'bold'); });
}

/* ----- Pets ----- */
const DOG_PAL = { b: '#c98a4a', d: '#8a5a2a', w: '#f4ead0', k: '#1a1208', n: '#2a1a10' };
const DOG_ROWS = [
  ['...........dd.', '..b......bbbbd', '.bb.....bbbkbb', '..bbbbbbbbbbbn', '...bbbbbbbbwww', '...bbbbbbbbb..', '...bbbbbbbbb..', '...bb.bb.bb.b.', '...bb.bb.bb.b.', '...dd.dd.dd.d.'],
  ['...........dd.', '.b.......bbbbd', '.bb.....bbbkbb', '..bbbbbbbbbbbn', '...bbbbbbbbwww', '...bbbbbbbbb..', '...bbbbbbbbb..', '....bb.bb.bb.b', '....bb.bb.bb.b', '....dd.dd.dd.d']];
const PET_DOG = DOG_ROWS.map(r => makeSprite(padRows(r), DOG_PAL, 1, false));
const PET_EGG = makeSprite(['..eeee..', '.eeeeee.', 'eewweeee', 'eewweeee', 'eeeeeeee', 'eeeeeeee', '.eeeeee.', '..eeee..'], { e: '#2f2f4a', w: '#4f4f72' }, 1, false);
const DOG_BUFF = { spd: .12, atk: .10, near: 90 };   // o cao nao da dano: so ajuda quando esta perto de ti (os valores sobem com o nivel do pet)
const CHICKEN_PAL = { w: '#f8f4ea', W: '#d8d0c0', r: '#d83030', y: '#f0b030', k: '#1a1208' };
const CHICKEN_ROWS = [
  ['.......rr...', '......rrr...', '.....wwwww..', '.....wkwwyy.', '.....wwwwyy.', '..ww.wwwwr..', '.wwwwwwwww..', 'wWwwwwwwww..', 'wWWwwwwww...', '.wwwwwww....', '..y..y......'],
  ['.......rr...', '......rrr...', '.....wwwww..', '.....wkwwyy.', '.....wwwwyy.', '..ww.wwwwr..', '.wwwwwwwww..', 'wWwwwwwwww..', 'wWWwwwwww...', '.wwwwwww....', '...y..y.....']];
const PET_CHICKEN = CHICKEN_ROWS.map(r => makeSprite(r, CHICKEN_PAL, 1, false));
const BIRD_PAL = { b: '#4a9ae8', B: '#2a5aa8', l: '#bfe4ff', y: '#f0b030', k: '#10203a' };
const BIRD_ROWS = [
  ['..B.......', '.BB..bbb..', 'BBB.bbbbb.', '.BBbkbbbyy', '..bbbbbby.', '..bbbllb..', '...bbbb...', '...y.y....'],
  ['..........', '...bbbb...', '..bbbbbbb.', '.BBbkbbbyy', 'BBBbbbbby.', '.BBbbllb..', '..BBbbb...', '...y.y....']];
const PET_BIRD = BIRD_ROWS.map(r => makeSprite(r, BIRD_PAL, 1, false));
const EGG_SPR = makeSprite(['..ww..', '.wwww.', 'wwwwww', 'wwWwww', 'wwwwww', '.wwww.', '..ww..'], { w: '#fff8e0', W: '#e8d8b0' }, 1, false);
const PETS = { dog: { n: ['Dog', 'Cão'], price: 0 }, chicken: { n: ['Chicken Bomber', 'Galinha Bombista'], price: 50000 }, bird: { n: ['Bird', 'Pássaro'], price: 65000 } };
const ensurePets = () => { const P = save.pets = save.pets || { own: {}, eq: '' }; P.own = P.own || {}; for (const k of ['lv', 'xp', 'names']) P[k] = P[k] && typeof P[k] === 'object' ? P[k] : {}; return P; };
const PET_MAX = 30, PET_RENAME = 50;   // nivel maximo e custo (diamantes) de cada mudanca de nome
const petSpecies = id => lang === 'en' ? PETS[id].n[0] : PETS[id].n[1];
const petDisplayName = id => (save.pets.names && save.pets.names[id]) || petSpecies(id);
const petLv = id => Math.max(1, Math.min(PET_MAX, ((save.pets.lv && save.pets.lv[id]) | 0) || 1));
const petXpNeed = l => Math.round(100 + 60 * (l - 1) + 2 * (l - 1) * (l - 1));   // do nivel 1 ao 30 sao cerca de 43 000 de XP: demora
function addPetXp(id, n) {   // devolve quantos niveis subiu
  const P = ensurePets(); if (!id || !P.own[id] || n <= 0) return 0; let l = petLv(id), x = (P.xp[id] | 0) + n, up = 0;
  while (l < PET_MAX && x >= petXpNeed(l)) { x -= petXpNeed(l); l++; up++; }
  if (l >= PET_MAX) x = 0; P.lv[id] = l; P.xp[id] = x; return up;
}
const petStats = (id, L) => ({
  dog: { spd: .06 + .001 * (L - 1), atk: .05 + .00085 * (L - 1) },
  chicken: { egg: Math.max(1.1, 2 - .03 * (L - 1)), r: 34 + .8 * (L - 1), dmg: .6 + .03 * (L - 1), spd: 130 + 2 * (L - 1) },
  bird: { regen: .004 + .00025 * (L - 1) },
})[id];
const petImg = (id, t) => id === 'dog' ? PET_DOG[Math.floor(t * 4) % 2] : id === 'chicken' ? PET_CHICKEN[Math.floor(t * 4) % 2] : PET_BIRD[Math.floor(t * 5) % 2];
function updatePet(dt) {
  ensurePets(); const p = R.p, id = save.pets.eq; R.petBuff = 0;
  if (R.eggs && R.eggs.length) {   // os ovos da galinha explodem passado um bocadinho
    for (const e of R.eggs) { e.t += dt; if (e.t >= e.max && !e.done) { e.done = true; areaDmg(e.x, e.y, e.r, e.d * DM(), { kb: 90 }); R.fx.push({ k: 'ring', x: e.x, y: e.y, r: e.r, t: .25, max: .25, col: '#ffe9a0' }); burst(e.x, e.y, '#fff3b0', 9); SFX.hit(); } }
    R.eggs = R.eggs.filter(e => !e.done);
  }
  if (!id || !save.pets.own[id]) { R.pet = null; return; }
  if (!R.pet || R.pet.id !== id) R.pet = { id, x: p.x - 30, y: p.y + 12, flip: false, t: 0, egg: 1, ang: Math.random() * 6, wx: p.x, wy: p.y };
  const q = R.pet, L = petLv(id), S = petStats(id, L);
  if (id === 'dog') {
    DOG_BUFF.spd = S.spd; DOG_BUFF.atk = S.atk;
    const tx = p.x + (p.flip ? 34 : -34), ty = p.y + 12, d = Math.hypot(tx - q.x, ty - q.y), sp = stats().spd * 1.15 + 40;
    if (d > 4) { const st = Math.min(d, sp * dt); q.x += (tx - q.x) / d * st; q.y += (ty - q.y) / d * st; q.t += dt; if (Math.abs(tx - q.x) > 3) q.flip = tx < q.x; }
    R.petBuff = Math.hypot(p.x - q.x, p.y - q.y) < DOG_BUFF.near ? 1 : 0;
  } else if (id === 'chicken') {
    let tg = null, bd = 1e9, kind = '';
    for (const c of R.coins) { if (c.got) continue; const d = Math.hypot(c.x - q.x, c.y - q.y); if (d < bd) { bd = d; tg = c; kind = 'c'; } }
    if (p.hp < p.max) for (const h of R.hearts) { if (h.got) continue; const d = Math.hypot(h.x - q.x, h.y - q.y); if (d < bd) { bd = d; tg = h; kind = 'h'; } }
    let tx, ty, sp = S.spd * .55;
    if (tg) { tx = tg.x; ty = tg.y; sp = S.spd * 1.3; }
    else { if (Math.hypot(q.wx - q.x, q.wy - q.y) < 10 || (q.wt = (q.wt || 0) - dt) <= 0) { q.wx = 50 + Math.random() * (W - 100); q.wy = 60 + Math.random() * (H - 120); q.wt = 4; } tx = q.wx; ty = q.wy; }
    const d = Math.hypot(tx - q.x, ty - q.y) || 1;
    if (tg && d < 14) {
      tg.got = true;
      if (kind === 'c') { R.gold += tg.v; SFX.coin(); R.texts.push({ x: tg.x, y: tg.y - 8, s: '+' + tg.v, t: .6, col: '#fd5' }); }
      else { const n = heartHeal(); heal(n); SFX.heal(); R.texts.push({ x: p.x, y: p.y - 24, s: '+' + n, t: .8, col: '#6f6' }); }
    } else if (d > 3) { const st = Math.min(d, sp * dt); q.x += (tx - q.x) / d * st; q.y += (ty - q.y) / d * st; q.t += dt; if (Math.abs(tx - q.x) > 2) q.flip = tx < q.x; q.egg -= dt;
      if (q.egg <= 0) { q.egg = S.egg; R.eggs = R.eggs || []; R.eggs.push({ x: q.x, y: q.y + 8, t: 0, max: .7, r: S.r, d: S.dmg }); }   // so poe ovos quando anda
    }
  } else if (id === 'bird') {
    q.ang += dt * (1.8 + .02 * L); q.t += dt; const px = p.x + Math.cos(q.ang) * 52, py = p.y - 20 + Math.sin(q.ang) * 20; q.flip = Math.cos(q.ang + 1.57) < 0; q.x = px; q.y = py;
    if (p.hp > 0 && p.hp < p.max * .5 && R.endT === undefined) { heal(p.max * S.regen * dt); q.hs = (q.hs || 0) - dt; if (q.hs <= 0) { q.hs = .9; spark(p.x, p.y - 10, '#6f6', 3, 40, .6, 3, -30); } }
  }
}
function drawPet(q) {
  const im = petImg(q.id, q.t), k = q.id === 'dog' ? 2.6 : q.id === 'chicken' ? 2.4 : 2.6, w = im.width * k, h = im.height * k, fl = q.id === 'bird' ? Math.sin(q.t * 6) * 2 : 0;
  ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(q.x, q.y + (q.id === 'bird' ? 30 : h / 2 - 2), q.id === 'bird' ? 8 : 14, 4, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y + fl)); if (q.flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
  if (save.pets.names && save.pets.names[q.id]) { ctx.globalAlpha = .75; txt(save.pets.names[q.id], q.x, q.y - h / 2 - 4 + fl, 9, '#fff', 'center'); ctx.globalAlpha = 1; }
}
function drawEggs() {
  for (const e of R.eggs || []) {
    const k = e.t / e.max, s = 2 + (k > .6 ? Math.sin(R.time * 40) * .4 : 0), w = EGG_SPR.width * s, h = EGG_SPR.height * s;
    ctx.globalAlpha = .12 + .25 * k; ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * k, 0, 7); ctx.fill(); ctx.globalAlpha = .5; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.drawImage(EGG_SPR, Math.round(e.x - w / 2), Math.round(e.y - h / 2), w, h);
  }
}
const petLines = (id, L) => {   // o que o pet faz a este nivel (ingles primeiro)
  const S = petStats(id, L), f1 = v => (v * 100).toFixed(1).replace(/\.0$/, '');
  if (id === 'dog') return [T2('Deals no damage; helps while close to you', 'Deals no damage; helps while close to you'), `+${f1(S.spd)}% ${T2('move speed', 'move speed')} · +${f1(S.atk)}% ${T2('attack speed', 'attack speed')}`];
  if (id === 'chicken') return [T2('Collects coins and hearts for you', 'Collects coins and hearts for you'), T2(`Lays an egg every ${S.egg.toFixed(1)}s while walking · blast ${Math.round(S.r)} · ${Math.round(S.dmg * 100)}% damage`, `Lays an egg every ${S.egg.toFixed(1)}s while walking · blast ${Math.round(S.r)} · ${Math.round(S.dmg * 100)}% damage`)];
  return [T2('Circles you and heals you below 50% health', 'Circles you and heals you below 50% health'), `${T2('Regen', 'Regen')} ${(S.regen * 100).toFixed(2)}% ${T2('max health per second', 'max health per second')}`];
};
let petRename = '', petMsg = '';
function confirmPetRename() {
  ensurePets(); const id = petRename; if (!id) return; const name = (rk.pname || '').trim();
  if (!/^[A-Za-z0-9 _-]{1,12}$/.test(name)) { petMsg = T2('Use 1 to 12 letters, numbers, spaces, _ or -', 'Use 1 to 12 letters, numbers, spaces, _ or -'); SFX.error(); return; }
  if (name === ((save.pets.names && save.pets.names[id]) || '')) { petRename = ''; rk.focus = ''; return; }
  if (save.gems < PET_RENAME) { petMsg = T2('Not enough diamonds', 'Not enough diamonds'); SFX.error(); return; }
  save.gems -= PET_RENAME; save.pets.names[id] = name; petRename = ''; rk.focus = ''; hubToast = { t: 2.4, s: `${petSpecies(id)} → ${name}`, col: '#ffd34a' }; SFX.buy(); persist(); if (on.token) { rk.at = {}; onlineSubmit(); }
}
function drawPetRename() {
  if (state !== 'hub' || tab !== 'pets' || !petRename) return;
  const id = petRename, x = 230, y = 140, w = 340, h = 210;
  ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { petRename = ''; rk.focus = ''; } });
  panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  txt(T2('Rename pet', 'Rename pet'), x + w / 2, y + 32, 18, '#ffd34a', 'center', 'bold');
  txt(`${petSpecies(id)} · ${T2('each change costs', 'each change costs')} ◆${PET_RENAME}`, x + w / 2, y + 54, 12, '#7fe8ff', 'center');
  rkField(x + 20, y + 84, w - 40, T2('Name (1-12 characters)', 'Name (1-12 characters)'), 'pname', false);
  if (petMsg) txt(petMsg, x + w / 2, y + 134, 11, '#f88', 'center');
  btn(x + 20, y + 152, 140, 38, T2('Confirm', 'Confirm'), confirmPetRename, { size: 14, col: '#2f7a4a', hot: '#3fa061', off: save.gems < PET_RENAME });
  btn(x + w - 160, y + 152, 140, 38, T2('Cancel', 'Cancel'), () => { petRename = ''; rk.focus = ''; }, { size: 14, col: '#2a2a48' });
}
function hubPets() {
  ensurePets(); const ids = ['dog', 'chicken', 'bird'];
  ids.forEach((id, i) => {
    const x = 197, y = 94 + i * 128, w = 585, h = 120, own = !!save.pets.own[id], eq = save.pets.eq === id, L = own ? petLv(id) : 1, price = PETS[id].price, can = save.gold >= price;
    panel(x, y, w, h, '#16162a', eq ? '#a8821f' : '#3a3a5a');
    ctx.fillStyle = '#0e0e1a'; ctx.fillRect(x + 10, y + 10, 100, 100);
    { const im = petImg(id, T), k = id === 'dog' ? 5.5 : id === 'chicken' ? 6 : 7; if (!own) ctx.globalAlpha = .55; ctx.drawImage(im, Math.round(x + 60 - im.width * k / 2), Math.round(y + 60 - im.height * k / 2 + Math.sin(T * 3 + i) * 2), im.width * k, im.height * k); ctx.globalAlpha = 1; }
    const nm = own ? petDisplayName(id) : petSpecies(id); txt(nm, x + 126, y + 30, 20, '#fff', 'left', 'bold');
    if (own && save.pets.names[id]) txt(petSpecies(id), x + 126 + txtW(nm, 20, 'bold') + 10, y + 30, 11, '#8a9ab8');
    if (!own) { const bw = txtW(price ? '¢' + gfmt(price) : T2('FREE', 'FREE'), 14, 'bold') + 16; bevel(x + 126 + txtW(nm, 20, 'bold') + 12, y + 14, bw, 22, '#2c2410', '#a8821f', '#4a3a10'); txt(price ? '¢' + gfmt(price) : T2('FREE', 'FREE'), x + 126 + txtW(nm, 20, 'bold') + 12 + bw / 2, y + 30, 14, can || !price ? '#ffe9a0' : '#f88', 'center', 'bold'); }
    if (own) { const xp = save.pets.xp[id] | 0, need = petXpNeed(L); txt(`Lv ${L}${L >= PET_MAX ? ' (MAX)' : ''}`, x + 126, y + 54, 13, '#ffd34a', 'left', 'bold'); bar(x + 196, y + 45, 130, 9, L >= PET_MAX ? 1 : xp / need, '#a8821f'); txt(L >= PET_MAX ? 'MAX' : `${gfmt(xp)} / ${gfmt(need)} XP`, x + 334, y + 54, 11, '#9ab'); }
    else txt(T2('Levels up to 30 while equipped', 'Levels up to 30 while equipped'), x + 126, y + 54, 12, '#778');
    petLines(id, L).forEach((ln, k) => txt(ln, x + 126, y + 78 + k * 18, 12, k ? '#6f6' : '#aab6d0', 'left', k ? 'bold' : 'normal'));
    const bx = x + w - 172;
    if (!own) btn(bx, y + 14, 158, 36, price ? T2('Buy', 'Buy') : T2('Get (free)', 'Get (free)'), () => { if (price && !can) { SFX.error(); hubToast = { t: 2.4, s: T2('Not enough gold', 'Not enough gold'), col: '#f88' }; return; } if (price) spendG(price); save.pets.own[id] = 1; save.pets.lv[id] = 1; save.pets.xp[id] = 0; if (!save.pets.eq) save.pets.eq = id; persist(); SFX.buy(); }, { size: 15, col: !price || can ? '#2f7a4a' : '#4a3a3a', hot: '#3fa061' });
    else { btn(bx, y + 14, 158, 36, eq ? T2('Equipped ✓', 'Equipped ✓') : T2('Equip', 'Equip'), () => { save.pets.eq = eq ? '' : id; persist(); SFX.click(); if (on.token) { rk.at = {}; } }, { size: 15, col: eq ? '#a06a20' : '#2f7a4a', hot: eq ? '#c98a30' : '#3fa061' });
      btn(bx, y + 58, 158, 28, `${T2('Rename', 'Rename')} · ◆${PET_RENAME}`, () => { petRename = id; petMsg = ''; rk.pname = (save.pets.names && save.pets.names[id]) || ''; rk.focus = 'pname'; }, { size: 12, col: '#3a5a7a', hot: '#4a7aa0' }); }
  });
}

