'use strict';
/* =====================================================================
   MISSÃO
   ===================================================================== */
function mkDeco() {
  const d = []; for (let i = 0; i < 16; i++) d.push({ x: 30 + Math.random() * (W - 60), y: 50 + Math.random() * (H - 90), s: .7 + Math.random() * .6, ph: Math.random() * 6 });
  return d;
}
function startMission(i, rd, farm) {
  const M = MISSIONS[i], s = stats();
  R = { m: i, p: { x: W / 2, y: H / 2 + 90, hp: s.hp, max: s.hp, face: 0, cd: 0, sp: 0, sk: 0, spR: true, skR: true, dashT: 0, dashCd: 0, inv: 0, vx: 0, vy: 0, mv: 0, flip: false, rage: 0, shield: 0, lunge: null, aura: null, sw: 0, swd: 1 },
    enemies: [], boss: null, projs: [], coins: [], hearts: [], parts: [], texts: [], fx: [], tels: [], traps: [], zones: [], sched: [],
    kills: 0, spawnT: 1, gold: 0, phase: 'hunt', shake: 0, toast: `${M.name}: elimina ${M.kills} monstros!`, toastT: 3.5, time: 0, deco: mkDeco(), endT: undefined, endWin: false };
  R.need = M.kills; R.xp = 0; R.capB = 0; R.raid = null;
  if (rd !== undefined) {
    const D = RAID_D[rd]; R.raid = { d: rd }; R.hpM = raidHP(i, rd) * RAID_MINI.hp; R.bossM = raidHP(i, rd) * .8; R.dmgM = raidDM(i, rd) * RAID_MINI.dmg; R.goldM = D.gold;
    { const ov = Math.min(RAID_OVER.cap, Math.max(0, (save.pl.lv || 1) - raidRec(i, rd))); R.hpM *= 1 + RAID_OVER.hp * ov; R.bossM *= 1 + RAID_OVER.hp * ov; R.dmgM *= 1 + RAID_OVER.dmg * ov; }   // quem vai muito acima do nivel recomendado encontra monstros mais fortes R.spdM = D.spd; R.bossDM = 1 + .07 * (raidRec(i, rd) - 8);
    R.need = Math.round(M.kills * 1.2) + 2 * rd; R.capB = RAID_MINI.cap + RAID_MINI.capD * rd; R.wave = 1; R.toast = `Raid ${D.n}: ${M.name}`; R.toastT = 3.5;
  }
  R.bg = makeBG(M.theme); R.G = gearStats(); R.loot = []; R.wloot = []; R.farm = !!farm; R.rec = farm ? farmRec(i) : 0; R.waveKills = 0; R.retire = false; R.lootN = 0;
  if (farm) { R.wave = 1; applyWave(); R.toast = `Campanha: ${M.name}`; R.toastT = 3; }
  state = 'play'; setMusic(R.raid ? 'raid' : 'm' + R.m); mdown = false;
}
function endMission(win, mode) {
  R.exitMode = mode || '';
  const M = MISSIONS[R.m]; let g = R.gold + R.coins.reduce((a, c) => a + c.v, 0), xp = R.xp * (R.raid ? 1 + .5 * R.raid.d : 1) * (1 + (R.G ? R.G.xpb : 0) / 100) * (1 + gb().xp);
  g = Math.round(g * (1 + gb().gold));   // bonus de ouro da guilda
  if (R.farm) {
    if (R.wave > (save.farmBest[R.m] || 0)) save.farmBest[R.m] = R.wave;
    save.presW = save.presW || [0, 0, 0, 0, 0, 0]; if (R.wave > (save.presW[R.m] | 0)) save.presW[R.m] = R.wave;   // melhor onda neste prestigio
    if (R.wave >= 10) { save.farmN = save.farmN || [0, 0, 0, 0, 0, 0]; save.farmN[R.m] = (save.farmN[R.m] | 0) + 1; }   // Farm concluida (chegou a onda 10)
    if (!win) { g = Math.floor(g * .1); xp = Math.floor(xp * .4); R.loot = []; R.wloot = []; }           // morrer no Farm: ficas com 10% do ouro e 40% do XP (os itens perdem-se)
    else if (mode === 'quit') { g = Math.floor(g * .3); xp = Math.floor(xp * .3); R.loot = R.loot.filter(() => Math.random() < .3); R.wloot = R.wloot.filter(() => Math.random() < .3); }   // sair a meio (Esc): so 30%
  }
  else if (win) { g += Math.round(M.reward * R.goldM * 1.5); const a = save.raids[R.m] = save.raids[R.m] || [0, 0, 0, 0, 0]; a[R.raid.d]++; xp += 60 + 30 * R.m + 25 * R.raid.d; }
  else { g = Math.floor(g / 2); xp = Math.floor(xp / 2); }
  R.petGain = 0; R.petUp = 0; if (R.petXp && save.pets && save.pets.eq && save.pets.own[save.pets.eq]) { R.petGain = R.petXp; R.petUp = addPetXp(save.pets.eq, R.petXp); }
  R.xpGain = Math.round(xp); const lv0 = save.pl.lv, pts0 = save.pts, gem0 = save.gems; addXP(R.xpGain); R.lvUp = save.pl.lv > lv0 ? save.pl.lv : 0; R.ptsGain = save.pts - pts0; R.gemGain = save.gems - gem0;
  for (const it of R.loot) if (!addBag(it)) g += sellValue(it);
  for (const id of R.wloot) { save.wst[id][0]++; const ci = CLASSES[save.cls].weapons.findIndex(w => w.id === id); if (ci >= 0) save.own[save.cls][ci] = 1; } R.wlootN = R.wloot.length;
  if (R.raid && win) { R.stoneGain = [0, 0, 0, 0, 0]; const n = 2 + Math.floor(R.m / 2); for (let i = 0; i < n; i++) { const r = Math.min(4, R.raid.d + (Math.random() < .45 ? 1 : 0)); save.stones[r]++; R.stoneGain[r]++; } }   // pedras de evolucao: a raridade segue a dificuldade
  R.lootN = R.loot.length; save.gold += g; R.earned = g; statsAdd(g); persist(); cloudFlush(); state = win ? 'win' : 'lose'; setMusic('calm'); win ? SFX.win() : SFX.lose();
}
const GLOW = { fire: '#ff7a1a', ice: '#6ad0ff', arcane: '#b06aff', dark: '#c030ff', bigbolt: '#9cf', boom: '#ff7a1a' };
const GLOWW = { m_fire: '#ff7a1a', m_ice: '#6ad0ff', m_bolt: '#ffe14a', m_arcane: '#9be32f', m_dark: '#ff4a6a' };
function spark(x, y, color, n = 1, sp = 60, life = .4, size = 3, g = 0) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * (.35 + Math.random() * .65); R.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (.6 + Math.random() * .6), color, s: size, g }); }
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 50 + Math.random() * 170; R.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .4 + Math.random() * .4, color }); }
}
const targets = () => R.boss ? R.enemies.concat([R.boss]) : R.enemies;
function stunE(e, t) { if (e.boss) e.slow = Math.max(e.slow, t * .6); else e.stun = Math.max(e.stun || 0, t); }
function heal(n) { const p = R.p; p.hp = Math.min(p.max, p.hp + n); }
function dmgE(e, d, ang, kb, quiet) {
  if (e.air) return;   // o Guardiao esta no ar durante o salto
  let crit = false; const g = R.G;
  if (g && !quiet) {
    if (Math.random() * 100 < Math.min(75, g.crit)) { d *= 1.75; crit = true; }
    if (g.ls) heal(Math.min(R.p.max * .008, d * 10 * g.ls / 100 * .4));   // 40% do valor, no maximo 0,8% da vida por golpe
    if (g.burn && Math.random() * 100 < g.burn) e.burn = Math.max(e.burn, 2);
    if (g.slow && Math.random() * 100 < g.slow) e.slow = Math.max(e.slow, 1.5);
  }
  e.hp -= d; e.hit = .1;
  if (kb) { const k = e.boss ? kb * .12 : kb; e.kx = Math.cos(ang) * k; e.ky = Math.sin(ang) * k; }
  R.texts.push({ x: e.x + (Math.random() - .5) * 14, y: e.y - e.r, s: String(Math.max(1, Math.round(d * 10))), t: .6, col: quiet ? '#fa6' : crit ? '#ffd34a' : '#fff', sz: crit ? 20 : 15 });
  burst(e.x, e.y, e.boss ? '#d9a' : '#8f8', quiet ? 1 : 4); if (!quiet) SFX.hit();
}
function hurt(n) {
  const p = R.p;
  if (p.inv > 0 || R.endT !== undefined) return;
  n = Math.max(1, Math.round(n * (R.dmgM || 1) * TUNE.eDmg * lvDM() * (1 + Math.max(0, p.max - 500) / 700) * (1 - Math.min(60, (R.G ? R.G.dr : 0) + TUNE.dr[save.cls]) / 100)));
  if (p.kshield > 0) n = Math.max(1, Math.round(n * .4));   // escudo do Cavaleiro: 60% menos dano
  p.hp -= n; p.inv = .7; R.shake = 9; SFX.hurt(); burst(p.x, p.y, p.kshield > 0 ? '#9cf' : '#f55', 10);
  R.texts.push({ x: p.x, y: p.y - 24, s: '-' + n, t: .8, col: '#f66' });
  if (p.hp <= 0) { p.hp = 0; R.endT = .9; R.endWin = false; }
}

/* ---- ataque básico ---- */
function melee(range, arc, dmg, kb, leech) {
  const p = R.p;
  for (const e of targets()) {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
    if (d > range + e.r) continue;
    let da = Math.atan2(dy, dx) - p.face; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > arc * Math.PI + e.r / Math.max(d, 1)) continue;
    dmgE(e, dmg, Math.atan2(dy, dx), kb); if (leech) heal(leech);
  }
}
function pProj(o) { R.projs.push(Object.assign({ r: 5, from: 'p', pierce: 0, hit: new Set(), life: 1.2 }, o)); }
function arrow(a, dmg, w, extra) { pProj(Object.assign({ x: R.p.x, y: R.p.y, vx: Math.cos(a) * (w ? w.spd : 600), vy: Math.sin(a) * (w ? w.spd : 600), a, dmg, kind: 'arrow', pierce: w ? w.pierce || 0 : 0, burn: w && w.burn }, extra)); }
function attack() {
  const p = R.p, w = curW(), s = stats();
  if (p.cd > 0 || R.endT !== undefined) return;
  p.cd = w.cd * s.cdm * (R.petBuff ? 1 - DOG_BUFF.atk : 1) * (p.rage > 0 ? .6 : 1) * (1 - .03 * wStar(w.id)); const dmg = w.dmg * DM(); p.swd = p.sw = w.t === 'melee' ? Math.min(.24, w.cd * .75) : .12;
  if (w.t === 'melee') {
    melee(w.range, w.arc, dmg, w.kb, (w.leech || 0) + (p.rage > 0 ? 1.2 : 0));
    R.fx.push({ k: 'arc', x: p.x, y: p.y, a: p.face, range: w.range, arc: w.arc, t: .15, max: .15, col: p.rage > 0 ? '255,80,80' : '255,255,255' }); SFX.slash();
  } else if (w.t === 'arrow') {
    const n = w.count || 1;
    for (let i = 0; i < n; i++) arrow(p.face + (n > 1 ? (i - (n - 1) / 2) * w.spread : 0), dmg, w);
    SFX.arrow();
  } else if (w.t === 'bolt') {
    pProj({ x: p.x, y: p.y, vx: Math.cos(p.face) * w.spd, vy: Math.sin(p.face) * w.spd, a: p.face, r: 7, dmg, kind: w.kind, pierce: w.pierce || 0, life: 1.4, aoe: w.aoe, slow: w.slow, leech: w.leech });
    SFX[w.kind]();
  } else if (w.t === 'zap') { zap(w, dmg); SFX.zap(); }
  if (GLOWW[w.id]) spark(p.x + Math.cos(p.face) * 34, p.y + 4 + Math.sin(p.face) * 24, GLOWW[w.id], 8, 130, .25, 3, 0);
}
function zap(w, dmg) {
  const p = R.p, pts = [{ x: p.x, y: p.y }];
  const ax = p.x + Math.cos(p.face) * 100, ay = p.y + Math.sin(p.face) * 100;
  const cands = targets().filter(e => Math.hypot(e.x - p.x, e.y - p.y) < w.range).sort((a, b) => Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - ax, b.y - ay));
  let cur = cands[0];
  if (!cur) { pts.push({ x: p.x + Math.cos(p.face) * 120, y: p.y + Math.sin(p.face) * 120 }); R.fx.push({ k: 'zap', pts, t: .15, max: .15 }); return; }
  const hit = new Set();
  for (let i = 0; i <= w.chain && cur; i++) {
    hit.add(cur); dmgE(cur, dmg, Math.atan2(cur.y - p.y, cur.x - p.x), 80); pts.push({ x: cur.x, y: cur.y }); spark(cur.x, cur.y, '#ffffff', 6, 180, .3, 3, 0); spark(cur.x, cur.y, '#ffe14a', 8, 140, .4, 3, 0); R.shake = Math.max(R.shake, 2);
    const c = cur; cur = null; let bd = 140;
    for (const e of targets()) { if (hit.has(e)) continue; const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < bd) { bd = d; cur = e; } }
  }
  R.fx.push({ k: 'zap', pts, t: .2, max: .2 });
}
function areaDmg(x, y, r, dmg, o = {}) {
  for (const e of targets()) {
    const d = Math.hypot(e.x - x, e.y - y); if (d > r + e.r) continue;
    dmgE(e, dmg, Math.atan2(e.y - y, e.x - x), o.kb || 0);
    if (o.stun) stunE(e, o.stun); if (o.slow) e.slow = Math.max(e.slow, o.slow); if (o.burn) e.burn = 3;
  }
}

/* ---- Q: especial da classe ---- */
function special() {
  const p = R.p, dm = DM();
  if (p.sp > 0 || R.endT !== undefined) return;
  p.sp = save.cls === 'mage' ? 12 : save.cls === 'knight' ? 22 : 8;
  if (save.cls === 'mage') {   // o Mago nao ataca com a habilidade: recupera 10% da vida
    const h = Math.round(Math.min(p.max - p.hp, p.max * .10)); heal(p.max * .10); SFX.heal(); R.fx.push({ k: 'ring', x: p.x, y: p.y, r: 60, t: .5, max: .5, col: '#6f6' }); spark(p.x, p.y, '#8f8', 16, 90, .8, 3, -60); R.texts.push({ x: p.x, y: p.y - 30, s: '+' + h, t: 1, col: '#6f6' }); return;
  }
  SFX.special(); R.shake = 7;
  if (save.cls === 'knight') { p.kshield = 10; areaDmg(p.x, p.y, 90, 1.2 * dm, { kb: 300 }); R.fx.push({ k: 'ring', x: p.x, y: p.y, r: 90, t: .35, max: .35, col: '#9cf' }); burst(p.x, p.y, '#9cf', 16); }   // escudo: 10 s com 60% menos dano (e um pequeno empurrao ao erguer)
  else if (save.cls === 'archer') { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; arrow(a, 1.5 * dm, null, { pierce: 1, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480 }); } }
}

/* ---- E: habilidade da arma ---- */
function aimPoint(maxD) { const p = R.p; let dx = mouse.x - p.x, dy = mouse.y - p.y; const d = Math.hypot(dx, dy); if (d > maxD) { dx *= maxD / d; dy *= maxD / d; } return { x: p.x + dx, y: p.y + dy }; }
const sched = (t, fn) => R.sched.push({ t, fn });
const SS = () => wStar(curW().id);
const STAR_FX = {"k_sword": ["2 investidas", "3 investidas", "4 investidas"], "k_axe": ["2 ondas de choque", "3 ondas de choque", "4 ondas de choque"], "k_spear": ["3 lanças em leque", "5 lanças em leque", "7 lanças em leque"], "k_hammer": ["6 raios", "8 raios", "12 raios"], "k_blade": ["8s de duração", "10s de duração", "12s de duração"], "a_bow": ["10 flechas", "14 flechas", "20 flechas"], "a_triple": ["15 flechas no leque", "19 flechas no leque", "23 flechas no leque"], "a_cross": ["2 virotes", "3 virotes", "5 virotes"], "a_fire": ["explosão maior", "2 flechas de fogo", "3 flechas, explosão enorme"], "a_dark": ["2 armadilhas", "3 armadilhas", "5 armadilhas"], "m_fire": ["2 meteoros", "3 meteoros", "CHUVA DE METEOROS"], "m_ice": ["área maior", "área e gelo maiores", "nova gigante (5s de gelo)"], "m_bolt": ["10 raios", "14 raios", "20 raios"], "m_arcane": ["círculo de 7s", "círculo de 8s", "círculo enorme de 10s"], "m_dark": ["dreno de 6s", "dreno de 7s", "dreno de 8s e maior"]};
const SK = {
  k_sword() {
    const n = 1 + SS(), lunge = () => { const p = R.p; p.lunge = { t: .22, hit: new Set(), dm: DM() * (n > 1 ? .8 : 1) }; p.dashT = .22; p.vx = Math.cos(p.face) * 760; p.vy = Math.sin(p.face) * 760; p.inv = Math.max(p.inv, .35); };
    lunge(); for (let i = 1; i < n; i++) sched(i * .32, lunge);
  },
  k_axe() {
    const n = 1 + SS();
    for (let i = 0; i < n; i++) { const f = () => { const p = R.p, r = 125 + i * 50; areaDmg(p.x, p.y, r, 3 * DM() * (n > 1 ? .8 : 1), { kb: 300, stun: 1.3 }); R.fx.push({ k: 'ring', x: p.x, y: p.y, r, t: .4, max: .4, col: '#c93' }); burst(p.x, p.y, '#a86', 25); R.shake = 14; SFX.boom(); }; if (i) sched(i * .32, f); else f(); }
  },
  k_spear() { const p = R.p, n = [1, 3, 5, 7][SS()]; for (let i = 0; i < n; i++) { const a = p.face + (i - (n - 1) / 2) * .14; pProj({ x: p.x, y: p.y, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, a, r: 9, dmg: 5 * DM() * (n > 1 ? .7 : 1), kind: 'spear', pierce: 99, life: 1.1 }); } SFX.slash(); },
  k_hammer() {
    const p = R.p, st = SS(), t = targets().filter(e => Math.hypot(e.x - p.x, e.y - p.y) < 400).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, [4, 6, 8, 12][st]);
    if (!t.length) R.fx.push({ k: 'bolt', x: mouse.x, y: mouse.y, t: .3, max: .3 });
    for (const e of t) { dmgE(e, 4 * DM() * (st ? .85 : 1), 0, 0); stunE(e, .9); R.fx.push({ k: 'bolt', x: e.x, y: e.y, t: .3, max: .3 }); burst(e.x, e.y, '#ff6', 8); }
    R.shake = 10; SFX.thunder();
  },
  k_blade() { R.p.rage = 6 + 2 * SS(); R.texts.push({ x: R.p.x, y: R.p.y - 34, s: 'SEDE DE SANGUE!', t: 1.2, col: '#f55' }); },
  a_bow() { const st = SS(), n = [7, 10, 14, 20][st]; for (let i = 0; i < n; i++) sched(i * (n > 14 ? .05 : .07), () => { arrow(R.p.face, 1.1 * DM() * (st ? .85 : 1), { spd: 700, pierce: 0 }); SFX.arrow(); }); },
  a_triple() { const p = R.p, st = SS(), n = 11 + 4 * st; for (let i = 0; i < n; i++) arrow(p.face + (i - (n - 1) / 2) * .15, .9 * DM() * (st ? .85 : 1), { spd: 600, pierce: 0 }); SFX.arrow(); },
  a_cross() { const p = R.p, n = [1, 2, 3, 5][SS()]; for (let i = 0; i < n; i++) { const a = p.face + (i - (n - 1) / 2) * .1; pProj({ x: p.x, y: p.y, vx: Math.cos(a) * 950, vy: Math.sin(a) * 950, a, r: 9, dmg: 6 * DM() * (n > 1 ? .8 : 1), kind: 'bigbolt', pierce: 99, life: 1.1 }); } SFX.slash(); },
  a_fire() { const p = R.p, st = SS(), n = [1, 1, 2, 3][st]; for (let i = 0; i < n; i++) { const a = p.face + (i - (n - 1) / 2) * .14; pProj({ x: p.x, y: p.y, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, a, r: 8, dmg: 3.5 * DM() * (n > 1 ? .8 : 1), kind: 'boom', aoe: [95, 120, 120, 150][st], burn: true }); } SFX.fire(); },
  a_dark() { const q = aimPoint(280), st = SS(), n = [1, 2, 3, 5][st]; for (let i = 0; i < n; i++) R.traps.push({ x: q.x + (i ? (Math.random() - .5) * 130 : 0), y: q.y + (i ? (Math.random() - .5) * 130 : 0), t: 12, r: 32 + 4 * st, dmg: 4 * DM() * (n > 1 ? .8 : 1) }); },
  m_fire() {
    const st = SS(), n = [1, 2, 3, 9][st], mx = mouse.x, my = mouse.y, rain = st === 3;
    for (let i = 0; i < n; i++) sched(i * (rain ? .12 : .22), () => { const a = Math.random() * 6.283, d = i ? Math.random() * (rain ? 170 : 95) : 0; R.tels.push({ x: mx + Math.cos(a) * d, y: my + Math.sin(a) * d, r: rain ? 75 : 85, t: .8, max: .8, dmg: 5 * DM() * (n > 1 ? (rain ? .7 : .85) : 1), from: 'p', col: '#fa4', burn: true }); SFX.fire(); });
  },
  m_ice() { const q = mouse, st = SS(), r = [115, 130, 145, 165][st]; areaDmg(q.x, q.y, r, 1 * DM(), { stun: [3, 3.5, 4, 5][st] }); R.fx.push({ k: 'ring', x: q.x, y: q.y, r, t: .5, max: .5, col: '#8cf' }); burst(q.x, q.y, '#bef', 25 + 8 * st); spark(q.x, q.y, '#e8ffff', 30, 240, .9, 3, 160); R.fx.push({ k: 'crystals', x: q.x, y: q.y, r, t: 1.3, max: 1.3 }); SFX.ice(); },
  m_bolt() {
    const st = SS(), n = [7, 10, 14, 20][st];
    for (let i = 0; i < n; i++) sched(i * 1.4 / n, () => {
      const t = targets(); let x, y;
      if (t.length) { const e = t[Math.floor(Math.random() * t.length)]; x = e.x; y = e.y; } else { x = mouse.x + (Math.random() - .5) * 160; y = mouse.y + (Math.random() - .5) * 160; }
      areaDmg(x, y, 45, 2.5 * DM() * (st ? .85 : 1)); R.fx.push({ k: 'bolt', x, y, t: .25, max: .25 }); spark(x, y, '#ffe14a', 14, 200, .4, 3, 0); spark(x, y, '#fff', 8, 150, .3, 3, 0); SFX.thunder();
    });
  },
  m_arcane() { const st = SS(), r = [95, 105, 115, 135][st]; R.p.aura = { k: 'tox', t: [6, 7, 8, 10][st], r, dmg: .9, every: .5, tick: 0 }; R.fx.push({ k: 'ring', x: R.p.x, y: R.p.y, r, t: .45, max: .45, col: '#9be32f' }); burst(R.p.x, R.p.y, '#9be32f', 18); },   // circulo toxico a volta do mago
  m_dark() { const st = SS(), r = [150, 160, 170, 190][st]; R.p.aura = { k: 'drain', t: [5, 6, 7, 8][st], r, dmg: .8, every: .4, tick: 0 }; R.fx.push({ k: 'ring', x: R.p.x, y: R.p.y, r, t: .45, max: .45, col: '#ff4a6a' }); burst(R.p.x, R.p.y, '#ff4a6a', 18); },   // suga vida aos inimigos proximos
};
function skill() {
  const p = R.p, w = curW();
  if (p.sk > 0 || R.endT !== undefined) return;
  p.sk = w.sk.cd; p.swd = p.sw = .22; SFX.special(); SK[w.id]();
}
function dash() {
  const p = R.p;
  if (p.dashCd > 0 || R.endT !== undefined) return;
  let dx = (K('right') || keys.ArrowRight ? 1 : 0) - (K('left') || keys.ArrowLeft ? 1 : 0);
  let dy = (K('down') || keys.ArrowDown ? 1 : 0) - (K('up') || keys.ArrowUp ? 1 : 0);
  if (!dx && !dy) { dx = Math.cos(p.face); dy = Math.sin(p.face); }
  const l = Math.hypot(dx, dy); p.vx = dx / l * 540; p.vy = dy / l * 540; p.dashT = .15; p.dashCd = DASH_CD; p.inv = Math.max(p.inv, .3); SFX.dash();
}

/* ---- inimigos & bosses ---- */
function spawnE(type, x, y) {
  const d = EN[type], k = (1 + TUNE.zHP * R.m) * (R.hpM || 1);
  R.enemies.push({ type, x, y, r: d.r, hp: d.hp * k * TUNE.eHP * lvHP(), max: d.hp * k * TUNE.eHP * lvHP(), spd: d.spd * (1 + .04 * R.m) * (R.spdM || 1), hit: 0, kx: 0, ky: 0, slow: 0, stun: 0, burn: 0, bt: 0, ob: 0, cd: 1 + Math.random() * 1.5, ph: Math.random() * 6.28 });
}
function spawnEdge(type) {
  const s = Math.floor(Math.random() * 4); let x, y;
  if (s === 0) { x = Math.random() * W; y = -20; } else if (s === 1) { x = Math.random() * W; y = H + 20; } else if (s === 2) { x = -20; y = Math.random() * H; } else { x = W + 20; y = Math.random() * H; }
  spawnE(type, x, y);
}
function spawnBoss(mini) {
  const b = mini && MISSIONS[R.m].semi ? MISSIONS[R.m].semi : MISSIONS[R.m].boss, mk = mini ? .3 : 1, hpv = TUNE.boss[R.m] * (R.bossM || 1) * 1.2 * lvHP() * mk;   // semi-boss: 30% da vida, desenho proprio
  R.boss = { boss: true, mini: !!mini, x: W / 2, y: 80, r: b.r, hp: hpv, max: hpv, spd: b.spd, hit: 0, kx: 0, ky: 0, st: 'walk', t: 2, mt: 0, f: 0, dx: 0, dy: 0, slow: 0, burn: 0, bt: 0, ob: 0, summoned: false, pal: b.pal, name: b.name, ring: b.ring, chg: b.charge, col: b.col, pattern: b.pattern, pi: 0, spin: 0 };
  R.enemies = []; R.phase = 'boss'; R.toast = mini ? '! Semi-boss: ' + b.name + '!' : '! ' + b.name + ' apareceu!'; R.toastT = 3; R.shake = 14; SFX.boss();
}
function eProj(x, y, a, spd, dmg, kind, col) { R.projs.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, a, r: kind === 'orb' ? 7 : 4, dmg, from: 'e', kind, life: 4, col }); }
function ringShots(b, n, off = Math.random() * 6) { for (let i = 0; i < n; i++) eProj(b.x, b.y, off + i / n * 6.283, 190, 10, 'orb', b.col); }
const BOSS_DUR = { leap: 1.7, spin: 2.6, ring: .7, spread: 1.2, spiral: 2.4, charge: 1.4, slam: 1.5, meteors: 2.6, cone: 1.6, summon: 1.1, blink: 1.4 };
function bossBegin(b, mv, rage) {
  const p = R.p; b.st = mv; b.mt = 0; b.f = 0; b.t = BOSS_DUR[mv];
  if (mv === 'ring') { ringShots(b, b.ring + (rage ? 4 : 0)); SFX.fire(); }
  else if (mv === 'slam') { R.tels.push({ x: p.x, y: p.y, r: 90, t: .9, max: .9, dmg: 22, from: 'e', col: '#f44', ring: true }); if (rage) R.tels.push({ x: p.x + 110, y: p.y, r: 70, t: 1.1, max: 1.1, dmg: 18, from: 'e', col: '#f44' }); SFX.boss(); }
  else if (mv === 'meteors') { const n = rage ? 9 : 6; for (let i = 0; i < n; i++) R.tels.push({ x: Math.max(40, Math.min(W - 40, p.x + (Math.random() - .5) * 300)), y: Math.max(40, Math.min(H - 40, p.y + (Math.random() - .5) * 260)), r: 55, t: .9 + i * .16, max: .9 + i * .16, dmg: 18, from: 'e', col: '#f93' }); SFX.boss(); }
  else if (mv === 'summon') { const M = MISSIONS[R.m]; for (let i = 0; i < 3; i++) spawnE(M.types[Math.floor(Math.random() * M.types.length)], b.x + (i - 1) * 60, b.y + 55); SFX.boss(); }
  else if (mv === 'blink') SFX.dash();
  else if (mv === 'leap') { b.lx = Math.max(60, Math.min(W - 60, p.x)); b.ly = Math.max(60, Math.min(H - 60, p.y)); b.z = 0; b.air = false; R.tels.push({ x: b.lx, y: b.ly, r: 105, t: 1.5, max: 1.5, dmg: 34, from: 'e', col: '#ffd34a', ring: true }); SFX.dash(); }
  else if (mv === 'spin') { b.spinT = 0; SFX.boss(); }
}
// nas raids os ataques do boss crescem com o nivel recomendado (boss de raid dificil bate a serio)
function bossScaled(fn) {
  const np = R.projs.length, nt = R.tels.length; fn(); const k = R.bossDM || 1; if (k === 1) return;
  for (let i = np; i < R.projs.length; i++) if (R.projs[i].from === 'e') R.projs[i].dmg *= k;
  for (let i = nt; i < R.tels.length; i++) if (R.tels[i].from === 'e') R.tels[i].dmg *= k;
}
function bossTick(b, dt, rage, sl) {
  const p = R.p, ang = Math.atan2(p.y - b.y, p.x - b.x), d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
  b.mt += dt;
  switch (b.st) {
    case 'spread':
      if (b.f < 3 && b.mt > .4 + b.f * .3) { b.f++; const n = rage ? 7 : 5; for (let i = 0; i < n; i++) eProj(b.x, b.y, ang + (i - (n - 1) / 2) * .22, 260, 9, 'orb', b.col); SFX.fire(); } break;
    case 'spiral':
      if (b.mt > b.f * .09) { b.f++; for (let k = 0; k < (rage ? 3 : 2); k++) eProj(b.x, b.y, b.f * .45 + k * 6.283 / (rage ? 3 : 2), 200, 8, 'orb', b.col); if (b.f % 6 === 0) SFX.fire(); } break;
    case 'charge':
      if (b.mt < .7) { b.dx = (p.x - b.x) / d; b.dy = (p.y - b.y) / d; }
      else { if (b.f === 0) { b.f = 1; SFX.dash(); } b.x += b.dx * b.chg * sl * dt; b.y += b.dy * b.chg * sl * dt; } break;
    case 'cone':
      if (b.mt < 1.2 && b.mt > b.f * .06) { b.f++; eProj(b.x, b.y, ang + (Math.random() - .5) * .7, 260 + Math.random() * 60, 6, 'orb', b.col); if (b.f % 5 === 0) SFX.fire(); } break;
    case 'leap':
      if (b.mt >= .4 && b.mt < 1.5) { const k = (b.mt - .4) / 1.1; b.air = true; b.x += (b.lx - b.x) * Math.min(1, dt * 6); b.y += (b.ly - b.y) * Math.min(1, dt * 6); b.z = Math.sin(k * Math.PI) * 130; }
      else if (b.mt >= 1.5 && b.air) { b.air = false; b.z = 0; b.x = b.lx; b.y = b.ly; R.shake = 24; burst(b.x, b.y, '#ffd34a', 46); burst(b.x, b.y, '#fff', 20); SFX.boss(); } break;
    case 'spin':
      b.spinT += dt; if (b.mt > .5) { b.x += (p.x - b.x) / d * 95 * sl * dt; b.y += (p.y - b.y) / d * 95 * sl * dt; if (b.spinT > b.f * .32 + .5) { b.f++; SFX.hit(); if (d < b.r + 112) hurt(28 * (R.bossDM || 1)); } } break;
    case 'blink':
      if (b.f === 0 && b.mt > .5) { b.f = 1; burst(b.x, b.y, b.col, 20); const a = Math.random() * 6.283; b.x = Math.max(b.r, Math.min(W - b.r, p.x + Math.cos(a) * 150)); b.y = Math.max(b.r, Math.min(H - b.r, p.y + Math.sin(a) * 150)); burst(b.x, b.y, b.col, 20); SFX.dash(); }
      else if (b.f === 1 && b.mt > .85) { b.f = 2; const n = rage ? 9 : 7, a2 = Math.atan2(p.y - b.y, p.x - b.x); for (let i = 0; i < n; i++) eProj(b.x, b.y, a2 + (i - (n - 1) / 2) * .2, 270, 10, 'orb', b.col); SFX.fire(); } break;
  }
}

/* ---- update ---- */
function update(dt) {
  if (R.cine) { updateCine(dt); return; }   // cinematica de entrada do Guardiao: o jogo fica em pausa
  const p = R.p, M = MISSIONS[R.m]; R.time += dt;
  p.sw -= dt; p.cd -= dt; p.sp -= dt; p.sk -= dt; p.dashCd -= dt; p.inv -= dt; p.rage -= dt; p.shield -= dt; p.kshield = (p.kshield || 0) - dt; R.toastT -= dt; R.shake *= .9;
  const dead = R.endT !== undefined;
  p.face = Math.atan2(mouse.y - p.y, mouse.x - p.x); p.flip = mouse.x < p.x; updatePet(dt);
  const cwp = curW(); if (GLOWW[cwp.id] && Math.random() < .35 && R.endT === undefined) spark(p.x + Math.cos(p.face) * 34, p.y + 4 + Math.sin(p.face) * 24, GLOWW[cwp.id], 1, 25, .5, 2, -30);

  // avisos "pronto"
  const ready = k => { SFX.ready(); R.fx.push({ k: 'ring', x: p.x, y: p.y, r: 46, t: .5, max: .5, col: '#fc6' }); R.texts.push({ x: p.x, y: p.y - 40, s: keyName(binds[k]) + ' PRONTO!', t: 1.1, col: '#fc6' }); };
  if (p.sp > 0) p.spR = false; else if (!p.spR) { p.spR = true; ready('special'); }
  if (p.sk > 0) p.skR = false; else if (!p.skR) { p.skR = true; ready('skill'); }

  if (!dead) {
    if (mdown || K('attack')) attack();
    else if (autoAtk) {
      const w = curW(), reach = w.t === 'melee' ? w.range + 30 : (w.range || 440);
      let best = null, bd = reach; for (const e of targets()) { const d = Math.hypot(e.x - p.x, e.y - p.y) - e.r; if (d < bd) { bd = d; best = e; } }
      if (best) { p.face = Math.atan2(best.y - p.y, best.x - p.x); p.flip = best.x < p.x; attack(); }
    }
    if (p.dashT > 0) { p.dashT -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (Math.random() < .6) R.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: .25, color: '#9cf' }); p.mv = 1; }
    else {
      const dx = (K('right') || keys.ArrowRight ? 1 : 0) - (K('left') || keys.ArrowLeft ? 1 : 0), dy = (K('down') || keys.ArrowDown ? 1 : 0) - (K('up') || keys.ArrowUp ? 1 : 0);
      const l = Math.hypot(dx, dy) || 1, sp = stats().spd * (R.petBuff ? 1 + DOG_BUFF.spd : 1); p.mv = dx || dy ? 1 : 0; p.x += dx / l * sp * dt; p.y += dy / l * sp * dt;
    }
    p.x = Math.max(14, Math.min(W - 14, p.x)); p.y = Math.max(14, Math.min(H - 14, p.y));
    if (p.lunge) { p.lunge.t -= dt; for (const e of targets()) if (!p.lunge.hit.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < 34 + e.r) { p.lunge.hit.add(e); dmgE(e, 3.5 * p.lunge.dm, Math.atan2(e.y - p.y, e.x - p.x), 500); } if (p.lunge.t <= 0) p.lunge = null; }
  } else { R.endT -= dt; if (R.endT <= 0) { endMission(R.endWin); return; } }

  // auras da habilidade: circulo toxico (Cajado Venenoso) e dreno de vida (Cajado Vampirico)
  if (p.aura) {
    const A = p.aura; A.t -= dt; A.tick -= dt;
    if (A.tick <= 0) {
      A.tick = A.every; let got = 0;
      for (const e of targets()) {
        if (Math.hypot(e.x - p.x, e.y - p.y) > A.r + e.r) continue;
        const dm = A.dmg * DM(); dmgE(e, dm, Math.atan2(e.y - p.y, e.x - p.x), 0, true);
        if (A.k === 'tox') { e.psn = Math.max(e.psn || 0, 2); e.pd = Math.max(e.pd || 0, dm * .3); spark(e.x, e.y, '#9be32f', 3, 60, .4, 3, -40); }
        else { got += Math.min(p.max * .01, dm * 10 * .3); spark(e.x, e.y, '#ff4a6a', 3, 60, .4, 3, 0); }
      }
      if (got) heal(Math.min(p.max * .05, got));
    }
    if (A.t <= 0) p.aura = null;
  }

  // agendados
  for (const s of R.sched) { s.t -= dt; if (s.t <= 0) s.fn(); } R.sched = R.sched.filter(s => s.t > 0);

  // spawn
  if (R.phase === 'hunt' && !dead) {
    R.spawnT -= dt;
    if (R.spawnT <= 0 && R.enemies.length < M.cap + R.capB + (R.hordeB || 0)) { spawnEdge(M.types[Math.floor(Math.random() * M.types.length)]); R.spawnT = 1.2 / ((1 + .1 * (R.raid ? R.raid.d : 0)) * (R.spawnRate || 1) * (R.raid ? RAID_MINI.rate : 1)); }
    if (R.farm && R.hordeB) { R.packT -= dt; if (R.packT <= 0) { R.packT = 6; const n = 3 + Math.min(5, Math.floor(R.wave / 10)); for (let i = 0; i < n; i++) spawnEdge(M.types[Math.floor(Math.random() * M.types.length)]); } }
  }

  // inimigos
  for (const e of R.enemies) {
    const d0 = EN[e.type]; e.hit -= dt; e.slow -= dt; e.cd -= dt; e.ob -= dt;
    if (e.burn > 0) { e.burn -= dt; e.bt -= dt; if (e.bt <= 0) { e.bt = .5; dmgE(e, .3, 0, 0, true); } }
    if (e.psn > 0) { e.psn -= dt; e.pt = (e.pt || 0) - dt; if (e.pt <= 0) { e.pt = .5; dmgE(e, e.pd || .3, 0, 0, true); } }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, sl = e.slow > 0 ? .4 : 1;
    let mx = 0, my = 0;
    if (e.stun > 0) e.stun -= dt;
    else if (d0.ai === 'chase') { mx = dx / d; my = dy / d; }
    else if (d0.ai === 'charge') {
      e.ct = (e.ct || 2) - dt;
      if (e.dash > 0) { e.dash -= dt; mx = e.dx; my = e.dy; }
      else if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.dash = .5; e.dx = dx / d; e.dy = dy / d; } }
      else { mx = dx / d; my = dy / d; if (e.ct <= 0 && d < 280) { e.wind = .55; e.ct = 3 + Math.random(); } }
    }
    else if (d0.ai === 'bat') { e.ph += dt * 6; mx = dx / d - dy / d * Math.sin(e.ph) * .9; my = dy / d + dx / d * Math.sin(e.ph) * .9; }
    else if (d0.ai === 'shoot') {
      if (d > 240) { mx = dx / d; my = dy / d; } else if (d < 170) { mx = -dx / d; my = -dy / d; } else { mx = -dy / d * .6; my = dx / d * .6; }
      if (e.cd <= 0 && !dead) { eProj(e.x, e.y, Math.atan2(dy, dx), d0.pspd || 230, 8, d0.shot, d0.col || '#bdf'); e.cd = (d0.rate || 2) + Math.random(); }
    }
    const bst = e.dash > 0 ? 4.6 : 1; e.x += (mx * e.spd * sl * bst + e.kx) * dt; e.y += (my * e.spd * sl * bst + e.ky) * dt; e.kx *= .86; e.ky *= .86;
    if (d < e.r + 12 && !dead && e.stun <= 0) hurt(d0.dmg);
  }
  for (const e of R.enemies) if (e.hp <= 0) {
    const d0 = EN[e.type]; R.kills++; R.petXp = (R.petXp | 0) + 1; burst(e.x, e.y, '#9f9', 12); SFX.kill();
    if (d0.boom) { R.tels.push({ x: e.x, y: e.y, r: 56, t: .75, max: .75, dmg: 14, from: 'e', col: '#9acd32' }); burst(e.x, e.y, '#9acd32', 10); }
    R.coins.push({ x: e.x, y: e.y, v: Math.max(1, Math.round(d0.gold * (R.goldM || 1) * COIN_RATE * (R.farm ? FARM_RATE : 1) * (1 + R.G.gf / 100))) }); R.xp += (R.farm && R.rec ? 4 + (R.rec - 1) / 3 : 4 + 2 * R.m) * (R.farm ? FARM_RATE * xpK(save.pl.lv, R.rec) : 1); R.waveKills++;
    { const tr = mobTier(e.type); if (Math.random() < (.012 + .001 * (R.wave || 1) + (R.raid ? .012 : 0)) * (.5 + .5 * tr) * (1 + gb().drop)) giveLoot(e.x, e.y, 0, tr); }
    if (Math.random() < .012 + (R.raid ? .02 : 0)) giveWeaponCopy(e.x, e.y); if (Math.random() < .04) R.hearts.push({ x: e.x + 10, y: e.y });
  }
  R.enemies = R.enemies.filter(e => e.hp > 0);
  if (R.raid && R.phase === 'hunt' && !dead) {
    const per = Math.ceil(R.need / 4), w = Math.min(4, Math.floor(R.kills / per) + 1);
    if (w > R.wave) { R.wave = w; R.toast = `ONDA ${w}/4!`; R.toastT = 2.5; R.shake = 8; SFX.boss(); for (let i = 0; i < RAID_MINI.burst + 2 * R.raid.d; i++) spawnEdge(M.types[Math.floor(Math.random() * M.types.length)]); }
  }
  if (R.farm) { if (R.phase === 'hunt' && R.waveKills >= R.need && !dead) { if (isHorde(R.wave)) { giveLoot(R.p.x, R.p.y - 24, 1); R.toast = 'HORDA DERROTADA!'; R.toastT = 2.2; } if (R.wave % 10 === 0) spawnBoss(); else if (R.wave % 5 === 0) spawnBoss(true); else nextWave(); } }
  else if (R.phase === 'hunt' && R.kills >= R.need && !dead) spawnBoss();

  // boss
  const b = R.boss;
  if (b) {
    b.hit -= dt; b.slow -= dt; b.ob -= dt;
    if (b.burn > 0) { b.burn -= dt; b.bt -= dt; if (b.bt <= 0) { b.bt = .5; dmgE(b, .3, 0, 0, true); } }
    if (b.psn > 0) { b.psn -= dt; b.pt = (b.pt || 0) - dt; if (b.pt <= 0) { b.pt = .5; dmgE(b, b.pd || .3, 0, 0, true); } }
    const sl = b.slow > 0 ? .6 : 1, rage = b.mini || b.hp < b.max * (R.raid ? .65 : .5);
    b.x += b.kx * dt; b.y += b.ky * dt; b.kx *= .9; b.ky *= .9;
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (rage && !b.summoned) { b.summoned = true; for (let i = 0; i < 3; i++) spawnE(MISSIONS[R.m].types[Math.floor(Math.random() * MISSIONS[R.m].types.length)], b.x + (i - 1) * 50, b.y + 50); R.toast = 'O Boss está furioso!'; R.toastT = 2; R.shake = 10; }
    if (b.st === 'walk') {
      b.x += dx / d * b.spd * (rage ? 1.35 : 1) * sl * dt; b.y += dy / d * b.spd * (rage ? 1.35 : 1) * sl * dt; b.t -= dt;
      if (b.t <= 0 && !dead) bossScaled(() => bossBegin(b, b.pattern[b.pi++ % b.pattern.length], rage));
    } else { bossScaled(() => bossTick(b, dt, rage, sl)); b.t -= dt; if (b.t <= 0) { b.st = 'walk'; b.t = (rage ? 1.1 : 1.9) * (R.raid ? .7 : 1) * (b.mini ? .6 : 1); } }
    b.x = Math.max(b.r, Math.min(W - b.r, b.x)); b.y = Math.max(b.r, Math.min(H - b.r, b.y));
    if (d < b.r + 12 && !dead && !b.air) hurt((b.st === 'charge' && b.mt > .7 ? 25 : 12) * (R.bossDM || 1));
    if (b.hp <= 0) {
      burst(b.x, b.y, '#fc6', 60); burst(b.x, b.y, '#fff', 30); R.shake = 18; SFX.kill(); SFX.boss(); R.boss = null; R.bossK = (R.bossK || 0) + 1; R.xp += (R.farm && R.rec ? 40 + 25 * (R.rec - 1) / 6 : 40 + 25 * R.m) * (R.farm ? FARM_RATE * xpK(save.pl.lv, R.rec) : 1); R.tels = []; bossDown(b);
      for (let i = 0; i < 8; i++) R.coins.push({ x: b.x + (Math.random() - .5) * 90, y: b.y + (Math.random() - .5) * 90, v: Math.max(1, Math.round(8 * (R.goldM || 1) * COIN_RATE * (R.farm ? FARM_RATE : 1))) });
    }
  }

  // telegrafias (meteoros, slams)
  for (const t of R.tels) {
    t.t -= dt; if (t.from === 'p' && t.burn && t.t > 0) { const f = t.t / t.max; spark(t.x - 80 * f, t.y - 420 * f, Math.random() < .5 ? '#ffb040' : '#fff0a0', 2, 30, .4, 4, 0); } if (t.t > 0) continue;
    R.fx.push({ k: 'ring', x: t.x, y: t.y, r: t.r, t: .3, max: .3, col: t.col }); burst(t.x, t.y, t.col, 12);
    if (t.from === 'p' && t.burn) { R.zones.push({ x: t.x, y: t.y, r: t.r * .85, t: 2.6 }); spark(t.x, t.y, '#ffa030', 40, 260, .8, 4, 120); spark(t.x, t.y, '#ffe9a0', 20, 160, .5, 3, 0); spark(t.x, t.y, '#555', 12, 70, 1.2, 6, -40); R.shake = 13; } R.shake = Math.max(R.shake, 7); SFX.boom();
    if (t.from === 'p') areaDmg(t.x, t.y, t.r, t.dmg, { kb: 250, burn: t.burn });
    else { if (Math.hypot(p.x - t.x, p.y - t.y) < t.r + 10) hurt(t.dmg); if (t.ring && R.boss) ringShots({ x: t.x, y: t.y, col: R.boss.col }, 8); }
  }
  R.tels = R.tels.filter(t => t.t > 0);
  // armadilhas
  for (const tr of R.traps) {
    tr.t -= dt;
    if (targets().some(e => Math.hypot(e.x - tr.x, e.y - tr.y) < tr.r + e.r)) { areaDmg(tr.x, tr.y, 95, tr.dmg, { stun: 1.2, slow: 3, kb: 200 }); R.fx.push({ k: 'ring', x: tr.x, y: tr.y, r: 95, t: .3, max: .3, col: '#c8f' }); SFX.boom(); tr.t = 0; }
  }
  R.traps = R.traps.filter(t => t.t > 0);
  for (const z of R.zones) {
    z.t -= dt; if (Math.random() < .6) spark(z.x + (Math.random() - .5) * z.r * 1.5, z.y + (Math.random() - .5) * z.r, Math.random() < .5 ? '#ff7a1a' : '#ffd34a', 1, 12, .55, 3, -70);
    z.tick = (z.tick || 0) - dt; if (z.tick <= 0) { z.tick = .35; for (const e of targets()) if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) e.burn = Math.max(e.burn, 1.2); }
  }
  R.zones = R.zones.filter(z => z.t > 0);

  // projéteis
  for (const q of R.projs) {
    if (q.homing) {
      let best = null, bd = 260; for (const e of targets()) { const dd = Math.hypot(e.x - q.x, e.y - q.y); if (dd < bd) { bd = dd; best = e; } }
      if (best) { const sp = Math.hypot(q.vx, q.vy), want = Math.atan2(best.y - q.y, best.x - q.x); let cur = Math.atan2(q.vy, q.vx), df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)); cur += Math.max(-6 * dt, Math.min(6 * dt, df)); q.vx = Math.cos(cur) * sp; q.vy = Math.sin(cur) * sp; q.a = cur; }
    }
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
    if (q.x < -20 || q.x > W + 20 || q.y < -20 || q.y > H + 20) q.life = 0;
    if (q.from === 'p' && q.life > 0) {
      if (q.kind === 'fire') spark(q.x, q.y, Math.random() < .5 ? '#ff9a2a' : '#ffd34a', 2, 40, .35, 4, -60);
      else if (q.kind === 'ice') { spark(q.x, q.y, Math.random() < .5 ? '#bff' : '#8cf', 2, 25, .45, 3, 40); if (Math.random() < .3) spark(q.x, q.y, '#fff', 1, 15, .5, 2, 60); }
      else if (q.kind === 'poison') { if (Math.random() < .6) spark(q.x, q.y, Math.random() < .5 ? '#9be32f' : '#e8ffb0', 1, 30, .45, 3, -50); }
      else if (q.kind === 'blood') spark(q.x, q.y, Math.random() < .5 ? '#8a0f2a' : '#ff4a6a', 2, 30, .5, 4, -30);
    }
    if (q.from === 'p') {
      for (const e of targets()) {
        if (q.life <= 0) break;
        if (q.hit.has(e) || Math.hypot(e.x - q.x, e.y - q.y) > e.r + q.r) continue;
        q.hit.add(e); dmgE(e, q.dmg, q.a, 120);
        if (q.burn) e.burn = 3; if (q.kind === 'ice') e.slow = Math.max(e.slow, q.slow || 2); if (q.leech && q.kind !== 'blood') heal(q.leech);
        if (q.kind === 'poison') { e.psn = 4; e.pd = Math.max(e.pd || 0, q.dmg * .45); }   // veneno: dano ao longo do tempo (renova, nao acumula)
        if (q.kind === 'blood') heal(Math.min(R.p.max * .012, q.dmg * 10 * q.leech));   // rouba vida em cada acerto
        if (q.kind === 'ice') { spark(e.x, e.y, '#d8ffff', 14, 220, .55, 3, 220); spark(e.x, e.y, '#6ad0ff', 8, 120, .5, 4, 0); R.fx.push({ k: 'ring', x: e.x, y: e.y, r: 34, t: .3, max: .3, col: '#8cf' }); }
        else if (q.kind === 'poison') { spark(e.x, e.y, '#e8ffb0', 10, 160, .45, 3, 0); spark(e.x, e.y, '#7acb1f', 8, 100, .5, 4, -40); R.fx.push({ k: 'ring', x: e.x, y: e.y, r: 28, t: .3, max: .3, col: '#9be32f' }); }
        else if (q.kind === 'blood') { spark(e.x, e.y, '#ff4a6a', 10, 90, .8, 4, -100); for (let i = 0; i < 4; i++) R.parts.push({ x: e.x, y: e.y, vx: (p.x - e.x) * 2.2 + (Math.random() - .5) * 60, vy: (p.y - e.y) * 2.2 + (Math.random() - .5) * 60, life: .45, color: '#ff4a6a', s: 3, g: 0 }); }
        if (q.kind === 'fire' || q.kind === 'boom') {
          for (const o of targets()) if (o !== e && Math.hypot(o.x - q.x, o.y - q.y) < q.aoe + o.r) { dmgE(o, q.dmg * .6, Math.atan2(o.y - q.y, o.x - q.x), 160); if (q.burn) o.burn = 3; }
          R.fx.push({ k: 'ring', x: q.x, y: q.y, r: q.aoe, t: .25, max: .25, col: '#fa4' }); burst(q.x, q.y, '#fa4', 14); if (q.kind === 'fire') { spark(q.x, q.y, '#ffb040', 26, 230, .7, 4, 100); spark(q.x, q.y, '#ffe08a', 12, 140, .5, 3, 0); spark(q.x, q.y, '#555', 8, 60, 1, 5, -40); R.zones.push({ x: q.x, y: q.y, r: q.aoe * .9, t: 1.8 }); R.shake = Math.max(R.shake, 5); } if (q.kind === 'boom') SFX.boom(); q.life = 0; break;
        }
        if (q.pierce-- <= 0) { q.life = 0; break; }
      }
    } else if (!dead && Math.hypot(p.x - q.x, p.y - q.y) < q.r + 11) { hurt(q.dmg); q.life = 0; }
  }
  R.projs = R.projs.filter(q => q.life > 0);

  // moedas, corações
  for (const c of R.coins) {
    c.t = (c.t || 0) + dt; if (c.life === undefined) c.life = 30 + Math.random() * 15; if (c.t > c.life) { c.got = true; continue; }   // ninguem apanhou: desaparece
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < 100) { c.x += (p.x - c.x) / d * 260 * dt; c.y += (p.y - c.y) / d * 260 * dt; }
    if (d < 18) { c.got = true; R.gold += c.v; SFX.coin(); R.texts.push({ x: c.x, y: c.y - 8, s: '+' + c.v, t: .6, col: '#fd5' }); }
  }
  R.coins = R.coins.filter(c => !c.got);
  for (const h of R.hearts) { h.t = (h.t || 0) + dt; if (h.life === undefined) h.life = 30 + Math.random() * 15; if (h.t > h.life) h.got = true; }
  for (const h of R.hearts) if (!h.got && Math.hypot(p.x - h.x, p.y - h.y) < 20) { h.got = true; { const n = heartHeal(); heal(n); SFX.heal(); R.texts.push({ x: p.x, y: p.y - 24, s: '+' + n, t: .8, col: '#6f6' }); } }
  R.hearts = R.hearts.filter(h => !h.got);

  for (const q of R.parts) { q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; } R.parts = R.parts.filter(q => q.life > 0);
  for (const q of R.texts) { q.y -= 30 * dt; q.t -= dt; } R.texts = R.texts.filter(q => q.t > 0);
  for (const f of R.fx) f.t -= dt; R.fx = R.fx.filter(f => f.t > 0);
}

