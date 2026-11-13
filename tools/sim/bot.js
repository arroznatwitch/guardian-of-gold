// Corre DENTRO do jogo carregado por load-game.js: monta um personagem tipico, joga uma raid ou o Farm com um bot e devolve numeros.
// O bot: o corpo a corpo avanca e recua (golpeia ~60% do tempo), os ranged mantem distancia, e todos usam Q, E e a esquiva quando faz sentido.
const SIM_DT = 1 / 60;

// personagem tipico para (classe, nivel, mapa): atributos 45/25/20/10, equipamento do mesmo nivel/raridade em todas as pecas
function simBuild(o) {
  const L = o.level, cls = o.cls, m = o.mission | 0;
  save = newSave(cls); save.pl.lv = L; markUnl(save); save.cheat = {}; save.pts = 0;
  const pts = Math.round(3 * (L - 1) * (o.points === undefined ? 1 : o.points));
  save.attr = { str: Math.round(pts * .45), vit: Math.round(pts * .25), per: Math.round(pts * .2), agi: Math.round(pts * .1) };
  const W_ = CLASSES[cls].weapons; let wi = o.weapon;
  if (wi === undefined || wi === 'best') { wi = 0; WEAPON_REQ.forEach((r, i) => { if (r.lv <= L) wi = i; }); }
  const w0 = W_[wi]; save.own[cls][wi] = 1; save.eq[cls] = wi;
  save.wl[w0.id] = o.anvil !== undefined ? o.anvil : Math.min(12, Math.floor(L / 5), Math.floor(L / 3));
  const stars = o.stars !== undefined ? o.stars : L >= 60 ? 2 : L >= 40 ? 1 : 0; save.wst[w0.id] = [0, 0, 0, 0, 0, 0, 0]; save.wst[w0.id][stars] = 1;
  const r = o.rarity !== undefined ? o.rarity : Math.min(4, Math.floor(L / 20)), il = o.il !== undefined ? o.il : Math.min(120, 7 + 6 * m + Math.floor(L * .5));
  for (const sl of SLOTS) save.gear[sl] = genItem(sl, r, il);
  if (o.ring !== undefined && typeof genRing === 'function') { save.gear.ring = genRing(Math.min(3, o.ring), il); }
  return { weapon: w0.id, weaponIndex: wi, rarity: r, il, anvil: save.wl[w0.id], stars };
}

function simBotStep(t) {
  const p = R.p, tg = targets(); let best = null, bd = 1e9;
  for (const e of tg) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
  keys[binds.up] = keys[binds.down] = keys[binds.left] = keys[binds.right] = false; mdown = false;
  if (!best) return;
  const w = curW(); mouse.x = best.x; mouse.y = best.y; const ang = Math.atan2(best.y - p.y, best.x - p.x); let mx = 0, my = 0;
  if (w.t === 'melee') {
    const rg = best.type && EN[best.type] && EN[best.type].ai === 'shoot', hit = rg || (t % 1.5) < .95, reach = w.range * .8;
    if (hit) { mdown = bd < w.range + 20; if (bd > reach) { mx = Math.cos(ang); my = Math.sin(ang); } } else { mx = -Math.cos(ang); my = -Math.sin(ang); mdown = bd < w.range + 10; }
    let near = 0; for (const e of tg) if (Math.hypot(e.x - p.x, e.y - p.y) < 70) near++;
    if (near >= 3) { mx = -Math.cos(ang); my = -Math.sin(ang); mdown = true; }
  } else {
    mdown = true; const pref = 200;
    if (bd < pref - 40) { mx = -Math.cos(ang); my = -Math.sin(ang); } else if (bd > pref + 80) { mx = Math.cos(ang); my = Math.sin(ang); } else { mx = -Math.sin(ang); my = Math.cos(ang); }
  }
  const cx = W / 2 - p.x, cy = H / 2 - p.y, ed = Math.min(p.x, W - p.x, p.y, H - p.y); if (ed < 110) { mx = cx / Math.hypot(cx, cy); my = cy / Math.hypot(cx, cy); }
  keys[binds.right] = mx > .3; keys[binds.left] = mx < -.3; keys[binds.down] = my > .3; keys[binds.up] = my < -.3;
  try { if (p.spR && bd < 140) special(); if (p.skR && bd < 260) skill(); if (p.dashCd <= 0 && p.hp < p.max * .55 && bd < 80) dash(); } catch (e) { }
}

// uma raid: devolve se ganhou, quanto demorou e quanta vida perdeu
function simRaid(o) {
  const info = simBuild(Object.assign({}, o, { mission: o.raid }));
  startMission(o.raid, o.diff); const tmax = o.tmax || 300; let t = 0, lost = 0;
  while (state === 'play' && t < tmax) { simBotStep(t); const h = R.p.hp; update(SIM_DT); t += SIM_DT; if (R.p.hp < h) lost += h - R.p.hp; }
  const win = state === 'win', res = { win, timeout: state === 'play', t: Math.round(t), hpLostPct: Math.round(100 * lost / R.p.max), kills: R.kills, hp: Math.round(R.p.max), info };
  state = 'hub'; return res;
}
// o Farm: ate a onda pedida (ou a morte)
function simFarm(o) {
  const info = simBuild(Object.assign({}, o, { mission: o.zone }));
  startMission(o.zone, undefined, true); const tmax = o.tmax || 2400, stop = o.waves || 30; let t = 0;
  while ((state === 'play' || state === 'cp') && t < tmax && R.wave <= stop) {
    if (state === 'cp') { R.phase = 'hunt'; state = 'play'; nextWave(); continue; }   // checkpoint de cada 10 ondas: o bot continua
    simBotStep(t); update(SIM_DT); t += SIM_DT;
  }
  const res = { wave: Math.min(R.wave, stop + 1), died: state === 'lose', t: Math.round(t), kills: R.kills, spk: +(t / Math.max(1, R.kills)).toFixed(2), info };
  state = 'hub'; return res;
}
function simRuns(fn, o, runs) { const rs = []; for (let i = 0; i < runs; i++) rs.push(fn(o)); return rs; }
// taxa de vitoria numa raid
function simWinRate(o, runs) {
  const rs = simRuns(simRaid, o, runs), w = rs.filter(r => r.win);
  return { rate: w.length / runs, avgT: w.length ? Math.round(w.reduce((a, r) => a + r.t, 0) / w.length) : null, avgLost: Math.round(rs.reduce((a, r) => a + r.hpLostPct, 0) / runs), timeouts: rs.filter(r => r.timeout).length, info: rs[0].info };
}
// nivel minimo com taxa de vitoria >= alvo (procura binaria; assume que mais nivel nunca piora)
function simFindLevel(o, runs, target, lo, hi) {
  let best = null; lo = lo || 1; hi = hi || 200;
  while (lo <= hi) { const mid = (lo + hi) >> 1, wr = simWinRate(Object.assign({}, o, { level: mid }), runs); if (wr.rate >= target) { best = { level: mid, wr }; hi = mid - 1; } else lo = mid + 1; }
  return best;
}
