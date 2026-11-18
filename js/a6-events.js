'use strict';
/* ----- Eventos, missoes diarias e fim de semana x2 ----- */
const pad2 = n => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
/* calendario semanal (dia pela hora de Portugal, igual para todos e para o servidor):
   quarta = Estatua Dourada, quinta = sorte de drops x2, sexta = -20% em todas as compras, sabado e domingo = XP e ouro x2 */
const LX_FMT = (() => { try { return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Lisbon', weekday: 'short' }); } catch (e) { return null; } })();
let lxCache = { t: 0, d: 0 };
const evDay = () => { const now = Date.now(); if (now - lxCache.t > 1000) { let d = new Date().getDay(); if (LX_FMT) { const i = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(LX_FMT.format(new Date(now))); if (i >= 0) d = i; } lxCache = { t: now, d }; } return lxCache.d; };   // 0 = domingo ... 6 = sabado
const isWeekend = () => { const d = evDay(); return d === 0 || d === 6; };   // sabado e domingo: XP e ouro x2
const isLuckDay = () => evDay() === 4;   // quinta: sorte de drops x2 (raridades melhores com o dobro da hipotese)
const isSaleDay = () => evDay() === 5;   // sexta: -20% em todas as compras
const LUCK_X = 2, SALE_K = .8;
const disc = n => isSaleDay() ? Math.round(n * SALE_K) : n;   // preco com o desconto de sexta (o servidor faz a mesma conta)
const WEEKEND_X = 2;
/* eventos semanais: a Estatua Dourada abre todas as quartas */
const EVENTS = [{ id: 'statue', day: 3, tries: 2, secs: 30, goldPer: 1 / 33, goldCap: 40000 }];   // estatua dourada: 30 s para dar o maximo de dano
const eventOn = ev => evDay() === ev.day;
const WEEK = [   // [dia, PT, EN, cor] pela ordem segunda..domingo
  [1, ['—', '—'], '#556'], [2, ['—', '—'], '#556'], [3, ['Estátua Dourada', 'Golden Statue'], '#f5c542'], [4, ['Drops x2', 'Drops x2'], '#c9a0ff'],
  [5, ['Compras -20%', 'Shop -20%'], '#5ad6ff'], [6, ['XP e Ouro x2', 'XP & Gold x2'], '#ffd34a'], [0, ['XP e Ouro x2', 'XP & Gold x2'], '#ffd34a']];
const DAY_N = [['Dom', 'Sun'], ['Seg', 'Mon'], ['Ter', 'Tue'], ['Qua', 'Wed'], ['Qui', 'Thu'], ['Sex', 'Fri'], ['Sáb', 'Sat']];
const evBonusToday = () => isWeekend() || isLuckDay() || isSaleDay() || EVENTS.some(eventOn);

/* ---- missoes diarias: 3 por dia, sempre as mesmas para o mesmo dia ---- */
const DAILY_POOL = [
  { k: 'kills', goal: l => [120, 250, 400][l], pt: n => `Mata ${n} monstros`, en: n => `Kill ${n} monsters` },
  { k: 'bosses', goal: l => [1, 2, 3][l], pt: n => `Derrota ${n} boss${n > 1 ? 'es' : ''}`, en: n => `Defeat ${n} boss${n > 1 ? 'es' : ''}` },
  { k: 'raids', goal: l => [1, 2, 3][l], min: 10, pt: n => `Vence ${n} raid${n > 1 ? 's' : ''}`, en: n => `Win ${n} raid${n > 1 ? 's' : ''}` },
  { k: 'waves', goal: l => [8, 12, 18][l], pt: n => `Chega à onda ${n} na Campanha`, en: n => `Reach wave ${n} in the Campaign` },
  { k: 'gold', goal: l => [400, 900, 1800][l], pt: n => `Ganha ¢${gfmt(n)} em missões`, en: n => `Earn ¢${gfmt(n)} in missions` },
  { k: 'skills', goal: l => [15, 30, 50][l], pt: n => `Usa a habilidade (E) ${n} vezes`, en: n => `Use your skill (E) ${n} times` },
  { k: 'loot', goal: l => [3, 5, 8][l], pt: n => `Apanha ${n} itens`, en: n => `Pick up ${n} items` },
];
const dailyTier = () => save.pl.lv < 25 ? 0 : save.pl.lv < 60 ? 1 : 2;
function dailySeed(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function dailyEnsure() {
  const key = todayKey(), d = save.daily = save.daily && typeof save.daily === 'object' ? save.daily : { d: '', m: [], n: 0, ev: { d: '', t: 0 }, best: 0 };
  if (d.d === key && d.m.length) return d;
  let a = dailySeed(key + save.cls) || 1; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = DAILY_POOL.filter(p => !p.min || save.pl.lv >= p.min), pick = [];
  while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  d.d = key; d.m = pick.map(p => ({ k: p.k, n: p.goal(dailyTier()), p: 0, c: 0 })); d.ev = { d: key, t: 0 }; d.bonus = 0;
  return d;
}
function dailyAdd(kind, v) {   // chamado no fim das missoes
  if (!save || !v || labOn) return; const d = dailyEnsure();
  for (const m of d.m) if (m.k === kind) m.p = Math.min(m.n, kind === 'waves' ? Math.max(m.p, v) : m.p + v);
}
function dailyAll(win, g, doneWave) {   // fim de missao: soma o progresso das missoes diarias
  dailyAdd('kills', R.kills | 0); dailyAdd('bosses', R.bossK | 0); if (win && R.raid) dailyAdd('raids', 1); if (R.farm && !R.tower) dailyAdd('waves', doneWave | 0); dailyAdd('gold', g | 0); dailyAdd('skills', R.skillN | 0); dailyAdd('loot', R.lootN | 0);
}
const dailyDef = m => DAILY_POOL.find(p => p.k === m.k);
const dailyReady = () => { if (!save || !save.pl) return 0; const d = dailyEnsure(); return d.m.filter(m => m.p >= m.n && !m.c).length; };
const dailyGold = () => 100 + 15 * save.pl.lv;
function dailyClaim(i) {
  const d = dailyEnsure(), m = d.m[i]; if (!m || m.c || m.p < m.n) { SFX.error(); return; }
  m.c = 1; d.n = (d.n | 0) + 1; save.gold = Math.min(GOLD_MAX, save.gold + dailyGold()); save.gems += 3;
  if (d.m.every(q => q.c) && !d.bonus) { d.bonus = 1; save.gems += 5; save.gold = Math.min(GOLD_MAX, save.gold + dailyGold() * 2); hubToast = { t: 3, s: T2('Todas as missões diárias feitas! Bónus: +5 ◆', 'All daily missions done! Bonus: +5 ◆'), col: '#ffd34a' }; }
  SFX.buy(); persist();
}
[[1, 'f'], [5, 'f'], [25, 'm'], [50, 'm'], [100, 'd'], [250, 'd']].forEach(([n, t], i) => achAdd('daily' + n, 'prog', t, [`Dedicado ${ROM[i]}`, `Dedicated ${ROM[i]}`], [n === 1 ? 'Completa uma missão diária' : `Completa ${n} missões diárias`, n === 1 ? 'Complete a daily mission' : `Complete ${n} daily missions`], () => [Math.min(n, (save.daily && save.daily.n) | 0), n]));

/* ---- evento: Estatua Dourada ---- */
function eventTriesLeft(ev) { const d = dailyEnsure(); return Math.max(0, ev.tries - (d.ev.t | 0)); }
function startEvent(ev) {
  if (!eventOn(ev) || !eventTriesLeft(ev)) { SFX.error(); return; }
  dailyEnsure().ev.t++; persist();
  startMission(0, undefined, false);
  const b = GUARD, hp = 1e12;
  R.event = { id: ev.id, t: ev.secs, dmg: 0, secs: ev.secs, ev }; R.need = 1e9; R.phase = 'event'; R.enemies = []; R.p.x = W / 2; R.p.y = 270;
  R.boss = { boss: true, statue: true, x: W / 2, y: 150, r: b.r, hp, max: hp, spd: 0, hit: 0, kx: 0, ky: 0, st: 'idle', t: 0, mt: 0, f: 0, dx: 0, dy: 0, slow: 0, burn: 0, bt: 0, ob: 0, summoned: true, pal: b.pal, name: T2('Estátua Dourada', 'Golden Statue'), ring: 0, chg: 0, col: '#f5c542', pattern: [], pi: 0, spin: 0, air: false, z: 0 };
  R.toast = T2('Dá o máximo de dano em 30 segundos!', 'Deal as much damage as you can in 30 seconds!'); R.toastT = 3; setMusic('boss');
}
function updateEvent(dt) {   // chamado em update() enquanto o evento corre
  const E = R.event; if (!E || R.endT !== undefined) return;
  R.p.inv = 99; E.t -= dt; if (R.boss) { R.boss.x = W / 2; R.boss.y = 150; R.boss.kx = R.boss.ky = 0; }
  if (E.t <= 0) endEvent();
}
function endEvent() {
  const E = R.event, ev = E.ev, disp = Math.round(E.dmg * 10);
  let gold = Math.min(ev.goldCap, Math.round(disp * ev.goldPer)); if (isWeekend()) gold *= WEEKEND_X;
  const d = dailyEnsure(); if (disp > (d.best | 0)) d.best = disp;
  save.gold = Math.min(GOLD_MAX, save.gold + gold); R.earned = gold; R.xpGain = 0; R.lootN = 0; R.wlootN = 0; R.lvUp = 0; R.gemGain = 0; R.stoneGain = null; R.petGain = 0; R.boosted = false;
  R.eventRes = { dmg: disp, gold }; R.endT = undefined; R.projs = []; R.boss = null; persist(); state = 'win'; setMusic('calm'); SFX.win();
}

/* ---- ecra: separador Eventos ---- */
function hubEvents() {
  const d = dailyEnsure(), X = 197, WD = 583, today = evDay(), cw = (WD - 6 * 4) / 7;
  WEEK.forEach(([dw, nm, col], i) => {   // calendario da semana: hoje fica destacado
    const x = X + i * (cw + 4), on = dw === today, has = nm[0] !== '—';
    bevel(x, 92, cw, 46, on ? (has ? '#3a2a08' : '#22223a') : '#12121f', on ? '#ffd34a' : '#2a2a3a', '#05050a');
    txt(DAY_N[dw][lang === 'en' ? 1 : 0] + (on ? ' · ' + T2('Hoje', 'Today') : ''), x + cw / 2, 108, 11, on ? '#ffd34a' : '#8890a8', 'center', 'bold');
    let fs = 11; const s2 = nm[lang === 'en' ? 1 : 0]; while (fs > 8 && txtW(s2, fs, 'bold') > cw - 6) fs--; txt(s2, x + cw / 2, 128, fs, has ? (on ? col : col + 'aa') : '#445', 'center', 'bold');
  });
  txt(T2('Missões diárias', 'Daily missions'), X + 4, 162, 16, '#f0c060', 'left', 'bold'); txt(`${T2('Completas', 'Completed')}: ${d.n | 0}`, X + WD - 4, 162, 12, '#9ab', 'right');
  d.m.forEach((m, i) => {
    const def = dailyDef(m), y = 170 + i * 50, done = m.p >= m.n, got = !!m.c;
    bevel(X, y, WD, 44, got ? '#162216' : done ? '#2a2412' : '#12121f', got ? '#4a8a4a' : done ? '#f0c060' : '#2a2a3a', '#05050a');
    txt(lang === 'en' ? def.en(m.n) : def.pt(m.n), X + 12, y + 19, 14, got ? '#7a7' : '#fff', 'left', 'bold');
    bar(X + 12, y + 28, 280, 9, m.p / m.n, got ? '#4a8a4a' : '#7fe8ff', '#0008'); txt(`${gfmt(m.p)}/${gfmt(m.n)}`, X + 300, y + 36, 11, '#9ab');
    txt(`¢${gfmt(dailyGold())} + 3 ◆`, X + 400, y + 26, 12, '#fd5', 'left', 'bold');
    if (got) txt('✔ ' + T2('Recebido', 'Claimed'), X + WD - 14, y + 27, 12, '#7a7', 'right', 'bold');
    else btn(X + WD - 104, y + 7, 94, 30, T2('Resgatar', 'Claim'), () => dailyClaim(i), { off: !done, size: 13, col: '#a06a20', hot: '#c98a30' });
  });
  txt(T2('Faz as 3 para um bónus extra (+5 ◆).', 'Do all 3 for an extra bonus (+5 ◆).'), X + 4, 330, 11, '#889'); txt(T2('Dias pela hora de Portugal', 'Days follow Portugal time'), X + WD - 4, 330, 10, '#667', 'right');
  txt(T2('Evento', 'Event'), X + 4, 352, 16, '#f0c060', 'left', 'bold');
  EVENTS.forEach((ev, i) => {
    const on = eventOn(ev), left = eventTriesLeft(ev), y = 360 + i * 108;
    bevel(X, y, WD, 102, on ? '#2a2210' : '#16161e', on ? '#f5c542' : '#2a2a3a', '#05050a');
    drawSprBig('gguard', X + 52, y + 51, .6);
    txt(T2('Estátua Dourada', 'Golden Statue'), X + 108, y + 26, 18, '#ffd34a', 'left', 'bold');
    txt(T2('Uma estátua do Guardião Dourado, parada. 30 segundos para dar o máximo de dano!', 'A motionless Golden Guardian statue. 30 seconds to deal as much damage as you can!'), X + 108, y + 46, 11, '#cdd6f4');
    txt(`${on ? T2('Hoje', 'Today') : T2('Todas as quartas', 'Every Wednesday')} · ${T2('Tentativas hoje', 'Tries today')}: ${on ? left : ev.tries}/${ev.tries}` + ((d.best | 0) ? ` · ${T2('Melhor', 'Best')}: ${gfmt(d.best)}` : ''), X + 108, y + 66, 12, on ? '#9fe' : '#f88', 'left', 'bold');
    txt(T2('Ouro = dano / 33 (máx. ¢40K) · x2 ao fim de semana', 'Gold = damage / 33 (max ¢40K) · x2 on weekends'), X + 108, y + 84, 11, '#889');
    btn(X + WD - 124, y + 30, 112, 40, on ? T2('Jogar', 'Play') : T2('Quarta', 'Wednesday'), () => startEvent(ev), { off: !on || !left, size: 17, col: '#2f7a4a', hot: '#3fa061' });
  });
}
