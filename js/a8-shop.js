'use strict';
/* ----- Shop: Auto-Raid (5 minutos). Simula UMA raid com o teu personagem (como se estivesses AFK), ve quanto demora e calcula
   quantas vezes a farias em 5 minutos. Recebes tudo de uma vez. Estas raids nao contam para o ranking (raids feitas), nem para as missoes diarias. ----- */
const AR = { cost: 1000, secs: 300, tmax: 400, k: .9 };   // 5 minutos; os resultados levam -10%; sem diamantes nem pedras
let shopSel = { i: 0, d: 0 }, shopSim = null, shopBusy = false, shopLast = null;
// so podes usar raids que ja concluiste
const arOpen = (i, d) => diffOpen(d) && (i === 0 || ((save.raids[i - 1] || [])[d] | 0) > 0) && ((save.raids[i] || [])[d] | 0) > 0;
const arKey = () => [save.cls, save.lo ? save.lo.cur : 0, save.pl.lv, save.eq[save.cls], shopSel.i, shopSel.d].join('|');

// o mesmo robo do simulador (tools/sim/bot.js): corpo a corpo avanca e recua, ranged mantem distancia, usa Q, E e esquiva
function arBot(t) {
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
// corre uma raid inteira num save COPIADO (nada do jogo real muda, nada e guardado nem enviado) e devolve o que uma corrida dava
function arSimulate(i, d) {
  const real = { save, R, state, mdown, mouse: { x: mouse.x, y: mouse.y }, keys: Object.assign({}, keys) };
  let out;
  autoSim = true; sfxQuiet = true;
  try {
    save = JSON.parse(JSON.stringify(real.save));
    startMission(i, d); let t = 0;
    while (state === 'play' && t < AR.tmax) { arBot(t); update(1 / 60); t += 1 / 60; }
    const win = state === 'win';
    out = { win, timeout: state === 'play', t: Math.max(1, Math.round(t)), gold: R.earned | 0, xp: R.xpGain | 0, loot: (R.loot || []).map(it => ({ r: it.r, il: it.il })), wloot: (R.wloot || []).slice(), stones: R.stoneGain ? R.stoneGain.slice() : [0, 0, 0, 0, 0], petXp: R.petXp | 0, hpLost: 0 };
  } catch (e) { out = { error: String(e && e.message || e) }; }
  finally {
    save = real.save; R = real.R; state = real.state; mdown = real.mdown; mouse = real.mouse; for (const k in keys) delete keys[k]; Object.assign(keys, real.keys);
    autoSim = false; sfxQuiet = false; setMusic('calm');
  }
  return out;
}
const arRuns = o => o && o.win ? Math.floor(AR.secs / o.t) : 0;
function arRun() {
  if (shopBusy || !arOpen(shopSel.i, shopSel.d)) { SFX.error(); return; }
  shopBusy = true; shopSim = null; const key = arKey(), i = shopSel.i, d = shopSel.d;
  setTimeout(() => { const o = arSimulate(i, d); o.key = key; o.i = i; o.d = d; shopSim = o; shopBusy = false; }, 40);
}
function arPlan(o, n) {   // o que a compra dava (-10%); sem diamantes nem pedras
  const k = AR.k, items = Math.floor(o.loot.length * n * k), free = Math.max(0, bagMax() - save.bag.length);
  return { items, free, overflow: Math.max(0, items - free), gold: Math.round(o.gold * n * k), xp: Math.round(o.xp * n * k), copies: Math.floor(o.wloot.length * n * k) };
}
async function arBuyUI() {   // o servidor cobra os 1000 diamantes e regista a compra (ar.paid); depois aplica-se o resultado
  const o = shopSim, n = arRuns(o); if (buyBusy || !o || !o.win || o.key !== arKey() || n < 1 || save.gems < AR.cost) { SFX.error(); return; }
  buyBusy = true; const sv = await shopServer('ar', 0); buyBusy = false;
  if (sv.ok === false) { hubToast = { t: 3, s: buyMsg(sv.error), col: '#f88' }; SFX.error(); return; }
  if (shopSim !== o) { SFX.error(); return; }
  arBuy(sv.ok ? sv.paid : null);
}
function arBuy(paid) {
  const o = shopSim, n = arRuns(o); if (!o || !o.win || o.key !== arKey() || n < 1 || save.gems < AR.cost) { SFX.error(); return; }
  const P = arPlan(o, n); save.gems -= AR.cost;
  const lv0 = save.pl.lv, res = { n, t: o.t, gold: P.gold, xp: P.xp, items: 0, sold: 0, soldN: 0, copies: 0, lvUp: 0 };
  for (let k = 0; k < P.items; k++) { const tp = o.loot[Math.floor(Math.random() * o.loot.length)], it = genLoot(tp.r, tp.il); res.items++; if (!addBag(it)) { res.sold += sellValue(it); res.soldN++; } }   // mochila cheia: o resto vende-se
  for (let c = 0; c < P.copies; c++) { const id = o.wloot[c % o.wloot.length]; if (save.wst[id]) { save.wst[id][0]++; res.copies++; } }   // copias de arma (-10%)
  save.gold = Math.min(GOLD_MAX, save.gold + res.gold + res.sold); addXP(res.xp); res.lvUp = save.pl.lv - lv0;
  if (o.petXp && save.pets && save.pets.eq && save.pets.own[save.pets.eq]) { try { addPetXp(save.pets.eq, Math.round(o.petXp * n * AR.k)); } catch (e) { } }
  const a = save.ar = save.ar && typeof save.ar === 'object' ? save.ar : { n: 0, gold: 0 }; a.n = (a.n | 0) + 1; a.gold = (a.gold | 0) + res.gold + res.sold; if (paid != null) a.paid = paid;   // o servidor usa isto para permitir o ouro
  shopLast = res; shopSim = null; SFX.buy(); SFX.special(); persist();
}

function hubShop() {
  txt('Shop', 197, 114, 22, '#ffd34a', 'left', 'bold'); txt(`${T2('Diamantes', 'Diamonds')}: ${gfmt(save.gems)}`, 780, 112, 14, '#7fe8ff', 'right', 'bold');
  const X = 197, Y = 126, WD = 583, o = shopSim, n = arRuns(o), open = arOpen(shopSel.i, shopSel.d), ok = !!o && o.win && o.key === arKey();
  bevel(X, Y, WD, 232, '#14142a', '#a8821f', '#05050a');
  txt(T2('Auto-Raid · 5 minutos', 'Auto-Raid · 5 minutes'), X + 16, Y + 30, 20, '#f0c060', 'left', 'bold');
  txt(`${gfmt(AR.cost)} ◆`, X + WD - 16, Y + 30, 20, '#7fe8ff', 'right', 'bold');
  wrap(T2('O teu personagem faz a raid sozinho. Simulamos uma raid (como se estivesses AFK), vemos quanto demora e calculamos quantas vezes a farias em 5 minutos. Recebes tudo de uma vez: ouro, XP, itens e cópias de arma, com -10%. Sem diamantes nem pedras.', 'Your character runs the raid on its own. We simulate one raid (as if you were AFK), see how long it takes and work out how many times you would run it in 5 minutes. You get everything at once: gold, XP, items and weapon copies, with -10%. No diamonds or stones.'), X + 16, Y + 52, WD - 32, 15, 12, '#cdd6f4');
  txt(T2('Se a mochila encher, os itens a mais são vendidos automaticamente. Não conta para o ranking de raids nem para as missões diárias.', 'If your backpack fills up, extra items are sold automatically. Does not count for the raids ranking or daily missions.'), X + 16, Y + 108, 11, '#ffb060');
  // escolha da raid e da dificuldade
  const sel = (label, y, text, col, prev, next) => { txt(label, X + 16, y + 17, 12, '#8890a8'); btn(X + 90, y, 28, 24, '<', prev, { size: 14 }); txt(text, X + 90 + 28 + 80, y + 17, 14, col, 'center', 'bold'); btn(X + 90 + 28 + 160, y, 28, 24, '>', next, { size: 14 }); };
  sel(T2('Raid', 'Raid'), Y + 120, MISSIONS[shopSel.i].name, '#fff', () => { shopSel.i = (shopSel.i + MISSIONS.length - 1) % MISSIONS.length; shopSim = null; }, () => { shopSel.i = (shopSel.i + 1) % MISSIONS.length; shopSim = null; });
  sel(T2('Dificuldade', 'Difficulty'), Y + 150, RAID_D[shopSel.d].n, RAID_D[shopSel.d].col, () => { shopSel.d = (shopSel.d + RAID_D.length - 1) % RAID_D.length; shopSim = null; }, () => { shopSel.d = (shopSel.d + 1) % RAID_D.length; shopSim = null; });
  if (!open) txt(T2('Ainda não concluíste esta raid.', 'You have not cleared this raid yet.'), X + 16, Y + 196, 12, '#f88', 'left', 'bold');
  btn(X + 16, Y + 186, 150, 32, shopBusy ? T2('A simular...', 'Simulating...') : T2('Simular (grátis)', 'Simulate (free)'), arRun, { size: 14, off: shopBusy || !open, col: '#2a5a7a', hot: '#3a7aa0' });
  btn(X + WD - 216, Y + 186, 200, 32, `${T2('Comprar', 'Buy')} · ${gfmt(AR.cost)} ◆`, arBuyUI, { size: 14, off: !ok || n < 1 || save.gems < AR.cost, col: '#2f7a4a', hot: '#3fa061' });
  // resultado da simulacao
  const rx = X + 350;
  if (shopBusy) txt(T2('A simular a raid...', 'Simulating the raid...'), rx, Y + 140, 13, '#ffd34a', 'left', 'bold');
  else if (o && o.error) txt('Erro: ' + o.error, rx, Y + 140, 12, '#f88');
  else if (o && !o.win) { txt(o.timeout ? T2('O teu personagem não consegue acabar esta raid sozinho (demora demasiado).', 'Your character cannot finish this raid on its own (it takes too long).') : T2('O teu personagem perdeu a raid simulada. Escolhe uma mais fácil.', 'Your character lost the simulated raid. Pick an easier one.'), rx, Y + 140, 12, '#f88', 'left', 'bold'); }
  else if (o && o.key !== arKey()) txt(T2('O personagem mudou: simula outra vez.', 'Your character changed: simulate again.'), rx, Y + 140, 12, '#f88');
  else if (ok) {
    const P = arPlan(o, n);
    txt(`${o.t}s/raid → ${n} raids`, rx, Y + 134, 13, '#6f6', 'left', 'bold');
    txt(`¢${gfmt(P.gold)} · ${gfmt(P.xp)} XP`, rx, Y + 152, 12, '#fd5');
    txt(`~${P.items} ${T2('itens', 'items')}${P.copies ? ` · ${P.copies} ${T2('cópias', 'copies')}` : ''}`, rx, Y + 168, 12, '#c9a0ff');
    if (P.overflow > 0) txt(T2(`Mochila: ${P.free} livres · ~${P.overflow} serão vendidos`, `Backpack: ${P.free} free · ~${P.overflow} will be sold`), rx, Y + 182, 10, '#ffb060', 'left', 'bold');
    if (save.gems < AR.cost) txt(T2('Diamantes insuficientes.', 'Not enough diamonds.'), X + WD - 216, Y + 226, 11, '#f88');
  } else txt(T2('Carrega em Simular para veres quanto rende.', 'Press Simulate to see what you would get.'), rx, Y + 140, 12, '#778');
  // ultima compra
  txt(T2('Última compra', 'Last purchase'), X, 384, 14, '#f0c060', 'left', 'bold');
  if (!shopLast) txt(T2('Ainda não compraste nada.', 'You have not bought anything yet.'), X, 408, 12, '#667');
  else { const r = shopLast;
    txt(`${r.n} ${T2('raids', 'raids')} (${r.t}s ${T2('cada', 'each')}) · ¢${gfmt(r.gold + r.sold)} · ${gfmt(r.xp)} XP${r.lvUp ? ` (+${r.lvUp} ${T2('níveis', 'levels')})` : ''}`, X, 408, 12, '#cdd6f4');
    txt(`${r.items - r.soldN} ${T2('itens na mochila', 'items in the backpack')}${r.soldN ? ` · ${r.soldN} ${T2('vendidos (mochila cheia)', 'sold (backpack full)')} +¢${gfmt(r.sold)}` : ''}${r.copies ? ` · ${r.copies} ${T2('cópias de arma', 'weapon copies')}` : ''}`, X, 428, 12, r.soldN ? '#ffb060' : '#9ab'); }
}
