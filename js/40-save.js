'use strict';
/* =====================================================================
   SAVE + TECLAS
   ===================================================================== */
const SAVE_KEY = 'bladehunter_v3', KEYS_KEY = 'bladehunter_keys';
function newSave(cls) {
  const s = { cls, gold: 0, up: { hp: 0, dmg: 0, spd: 0, cd: 0 }, done: 0, own: {}, eq: {}, wl: {}, sk: {}, skE: {}, pity: {}, cheat: {}, stats: { kills: 0, gold: 0, bosses: 0 }, pl: { lv: 1, xp: 0 }, raids: {}, attr: { vit: 0, str: 0, agi: 0, per: 0 }, pts: 0, bag: [], gear: { head: null, chest: null, boots: null, amulet: null }, farmBest: {}, gems: 0, wst: {}, chestDone: 0, rwv: 3, stones: [0, 0, 0, 0, 0], pets: { own: {}, eq: '', lv: {}, xp: {}, names: {} }, bagSlots: 1, tut: { on: true, skip: false, done: {}, claim: {} },
    pres: [0, 0, 0, 0, 0, 0], presW: [0, 0, 0, 0, 0, 0], farmN: [0, 0, 0, 0, 0, 0], ach: {}, codes: {}, title: '', buyN: 0, skRef: 1, dexRf: 1, pt: 0 };   // campos completos desde o inicio: um personagem recem-criado nao passa pelo normalize e o separador Campanha rebentava sem estes
  for (const c in CLASSES) { CLASSES[c].weapons.forEach((w, i) => s.wst[w.id] = [i === 0 ? 1 : 0, 0, 0, 0, 0, 0, 0]); s.own[c] = [1, 0, 0, 0, 0]; s.eq[c] = 0; s.sk[c] = SKINS[c].map((_, k) => k === 0 ? 1 : 0); s.skE[c] = 0; }
  return s;
}
// reembolso (uma vez) das skins compradas antes de serem removidas: 1.ª extra = 5000 de ouro; as restantes 300/600/900 diamantes
const SK_GEMS = { knight: [0, 0, 300, 600, 900], archer: [0, 0, 300, 600], mage: [0, 0, 300, 600] };
// Respec gratis (uma vez) quando a Agilidade passou a Destreza e a vel. de ataque saiu da Pericia: todos os pontos voltam a estar por gastar, tambem nas builds guardadas
function respecDex(s) {
  if (s.dexRf) return; const A = s.attr || {}, n = ['vit', 'str', 'agi', 'per'].reduce((t, k) => t + Math.max(0, A[k] | 0), 0);
  s.attr = { vit: 0, str: 0, agi: 0, per: 0 }; s.pts = Math.max(0, s.pts | 0) + n;
  if (s.lo && Array.isArray(s.lo.b)) s.lo.b.forEach(b => { if (b && b.attr) b.attr = { str: 0, vit: 0, per: 0, agi: 0 }; });
  s.dexRf = 1; if (n) window.__dexRf = n;
}
function refundSkins(s) {
  if (s.skRef) return; let g = 0, d = 0;
  for (const c in SK_GEMS) { const a = (s.sk && s.sk[c]) || []; SK_GEMS[c].forEach((cost, i) => { if (i > 0 && a[i] === 1) { if (i === 1) g += 5000; else d += cost; } }); }
  s.skRef = 1; if (g || d) { s.gold = Math.min(GOLD_MAX, (s.gold | 0) + g); s.gems = (s.gems | 0) + d; window.__skRef = [g, d]; }
}
function normalize(s) {
  const d = newSave(s.cls || 'knight');
  s.stones = Array.from({ length: 5 }, (_, i) => (s.stones && s.stones[i]) | 0); s.bagSlots = Math.max(1, Math.min(5, s.bagSlots | 0 || 1));
  s.pets = s.pets && typeof s.pets === 'object' ? s.pets : {}; s.pets.own = s.pets.own || {}; s.pets.eq = s.pets.eq || ''; for (const k of ['lv', 'xp', 'names']) s.pets[k] = s.pets[k] && typeof s.pets[k] === 'object' && !Array.isArray(s.pets[k]) ? s.pets[k] : {};
  s.pres = Array.from({ length: 6 }, (_, i) => Math.min(PRES_MAX, (Array.isArray(s.pres) && s.pres[i]) | 0)); s.presW = Array.from({ length: 6 }, (_, i) => (Array.isArray(s.presW) && s.presW[i]) | 0);
  s.codes = s.codes && typeof s.codes === 'object' ? s.codes : {}; s.ach = s.ach && typeof s.ach === 'object' ? s.ach : {}; s.title = typeof s.title === 'string' ? s.title : ''; s.farmN = Array.from({ length: 6 }, (_, i) => (Array.isArray(s.farmN) && s.farmN[i]) | 0);
  if (s.pl && s.pl.lv > MAXLV) { s.pl.lv = MAXLV; s.pl.xp = 0; } if (s.chestDone > s.pl.lv) s.chestDone = s.pl.lv;   // nivel maximo 120
  s.daily = s.daily && typeof s.daily === 'object' && Array.isArray(s.daily.m) ? s.daily : { d: '', m: [], n: 0, ev: { d: '', t: 0 }, best: 0 };   // missoes diarias e evento (a6-events.js)
  s.lo = s.lo && typeof s.lo === 'object' ? s.lo : { cur: 0, own: [1, 0, 0], b: [null, null, null] };   // loadouts (a7-loadouts.js)
  s.ar = s.ar && typeof s.ar === 'object' ? s.ar : { n: 0, gold: 0 };   // Auto-Raid comprada (a8-shop.js)
  s.ep = Number.isFinite(+s.ep) ? Math.max(0, Math.floor(+s.ep)) : 0;   // epoca do save: se o servidor a mudar (reposicao pelo admin), o save local deixa de valer
  s.pt = Number.isFinite(+s.pt) ? Math.max(0, +s.pt) : 0;   // tempo de jogo em segundos (b9-loop.js)
  s.wp = s.wp && typeof s.wp === 'object' ? s.wp : {};   // progresso por arma (abates, raids) para subir de estrela
  s.gold = s.gold || 0; s.up = Object.assign({}, d.up, s.up); s.done = s.done || 0; s.wl = s.wl || {}; s.pity = s.pity || {}; s.cheat = s.cheat || {}; s.stats = s.stats || { kills: 0, gold: 0, bosses: 0 }; s.pl = s.pl || { lv: 1, xp: 0 }; s.raids = s.raids || {}; s.attr = s.attr || { vit: 0, str: 0, agi: 0, per: 0 }; s.bag = s.bag || []; s.gear = Object.assign({ head: null, chest: null, boots: null, amulet: null }, s.gear); s.farmBest = s.farmBest || {}; s.gems = s.gems === undefined ? Math.floor(s.pl.lv / 10) * 10 : s.gems; s.chestDone = s.chestDone === undefined ? 0 : s.chestDone; if ((s.rwv | 0) < 3) { s.chestDone = 0; s.rwv = 3; }   // recompensas por nivel: reset unico, todos podem resgatar desde o nivel 1 s.wst = s.wst || {};
  s.tut = s.tut && typeof s.tut === 'object' ? s.tut : { on: (s.pl.lv | 0) <= 3 && !(s.stats && s.stats.kills > 20), skip: false, done: {}, claim: {} };   // tutorial (94-tutorial.js): saves antigos avancados nao o veem
  s.tut.done = s.tut.done || {}; s.tut.claim = s.tut.claim || {};
  s.buyN = Math.max(0, s.buyN | 0);   // pontos de atributo ja comprados com ouro (o preco sobe com cada um)
  if (s.pts === undefined) s.pts = Math.max(0, (s.pl.lv - 1) * 3 - Object.values(s.attr).reduce((a, b) => a + b, 0));
  for (const c in CLASSES) {
    s.own = s.own || {}; s.eq = s.eq || {}; s.sk = s.sk || {}; s.skE = s.skE || {};
    s.own[c] = (s.own[c] || []).concat([0, 0, 0, 0, 0]).slice(0, 5); s.own[c][0] = 1;
    s.eq[c] = s.eq[c] || 0; s.sk[c] = s.sk[c] || d.sk[c]; while (s.sk[c].length < SKINS[c].length) s.sk[c].push(0); s.skE[c] = s.skE[c] || 0;
  }
  for (const c in CLASSES) CLASSES[c].weapons.forEach((w, i) => {
    const old = s.wst[w.id] || []; s.wst[w.id] = [0, 0, 0, 0, 0, 0, 0].map((_, k) => k < 3 ? (old[k] || 0) : k === 3 ? (old[3] || 0) + (old[4] || 0) + (old[5] || 0) + (old[6] || 0) : 0);
    if (!s.wst[w.id].some(x => x)) s.wst[w.id][0] = (s.own[c] && s.own[c][i]) ? 1 : 0;
  });
  refundSkins(s); respecDex(s);
  return s;
}
let save = null;
try { const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('bladehunter_v2'); if (raw) save = normalize(JSON.parse(raw)); } catch (e) { save = null; }
let autoSim = false;   // a simular uma Auto-Raid (a8-shop.js): nada e guardado nem enviado
let labOn = false, labGod = false;   // laboratorio de batalha (96-lab.js): enquanto ligado nada e gravado nem enviado
function persist() { if (labOn || autoSim) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} cloudMark(); }

const DEF_BINDS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'Space', special: 'KeyQ', skill: 'KeyE', dash: 'ShiftLeft', auto: 'KeyT', speed: 'KeyG', pause: 'Escape' };
const BIND_LABELS = [['up', 'Mover para cima'], ['down', 'Mover para baixo'], ['left', 'Mover para a esquerda'], ['right', 'Mover para a direita'],
  ['attack', 'Atacar (também clique esquerdo)'], ['special', 'Especial da classe (também clique direito)'], ['skill', 'Habilidade da arma'], ['dash', 'Esquiva'], ['auto', 'Auto-ataque (ligar/desligar)'], ['speed', 'Velocidade do jogo (x1/x2)'], ['pause', 'Pausa']];
let binds = Object.assign({}, DEF_BINDS);
try { Object.assign(binds, JSON.parse(localStorage.getItem(KEYS_KEY) || '{}')); } catch (e) {}
function saveBinds() { try { localStorage.setItem(KEYS_KEY, JSON.stringify(binds)); } catch (e) {} }
function keyName(c) {
  const m = { Space: 'Espaço', ShiftLeft: 'Shift', ShiftRight: 'Shift (dir.)', ControlLeft: 'Ctrl', ControlRight: 'Ctrl (dir.)', AltLeft: 'Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab', Backspace: '⌫' };
  if (m[c]) return m[c]; if (c.startsWith('Key')) return c.slice(3); if (c.startsWith('Digit')) return c.slice(5); return c;
}
const attrEff = n => n;   // sem travao por nivel: cada ponto vale sempre por inteiro (cada um distribui como quiser)
const stats = () => {
  const c = CLASSES[save.cls], g = gearStats(), L = save.pl.lv, ga = 1 + gb().attr, a = { vit: attrEff(save.attr.vit) * ga, str: attrEff(save.attr.str) * ga, agiS: attrEff(Math.floor((save.attr.agi | 0) / 2)) * ga, agiA: attrEff(Math.ceil((save.attr.agi | 0) / 2)) * ga };   // Destreza alterna: 1.º ponto vel. de ataque, 2.º velocidade, ...
  const sb = setBonus(), bm = k => (sb && sb.on && sb.k === k ? 1 + sb.p : 1) * (1 + setPct(k));   // bonus do anel (so com o conjunto completo) e dos conjuntos de armadura (92-sets.js)
  return { hp: Math.round((c.hp + a.vit * 7 + 4 * (L - 1) + g.hp) * bm('hp') * (1 + drOver(g) / 100)), spd: c.spd * (1 + (a.agiS * .6 + g.spd) / 100) * bm('spd'), dm: (1 + TUNE.lvDmg * (L - 1) + a.str * .01) * (1 + g.dmg / 100) * bm('dmg'), cdm: Math.max(.3, (1 - a.agiA * .006 - g.cdr / 100) / bm('cdr')) };   // cada ponto vale metade do que valia
};
const curW = () => CLASSES[save.cls].weapons[save.eq[save.cls]];
const wlvl = () => save.wl[curW().id] || 0;
const STAR_MAX = 3, STAR_MULT = [1, 1.4, 1.9, 2.5], GEAR_STAR = [1, 1.1, 1.2, 1.35], ENC_K = .06, GEAR_F = { hp: .75, dmg: .85, xpb: .5, ls: .35 }, MYTH_F = .85, FUSE_LV = 20, FUSE_N = 5;   // 0..3 estrelas (3 = MAX)
const wStar = id => { const a = save && save.wst && save.wst[id]; if (!a) return 0; for (let i = STAR_MAX; i >= 0; i--) if (a[i] > 0) return i; return 0; };
/* ---- subir de estrela: alem das 5 copias e do ouro, cada estrela pede uma pedra de evolucao e um objetivo com ESTA arma ---- */
const WSTAR_REQ = [{ stone: 0, n: 1, kills: 1 }, { stone: 1, n: 2, raids: 20 }, { stone: 3, n: 1, nraids: 50 }];   // para ir de t para t+1 (kills: 1 = usa starKills): pedra Comum + 1000 a 5000 abates conforme a raridade da arma / 2 pedras Raras + 20 raids / 1 pedra Lendaria + 50 raids Normal ou acima
// abates para a 1.a estrela: 1000 na arma Comum, +1000 por raridade, 5000 na Mitica
const wTierOf = id => { for (const c in CLASSES) { const i = CLASSES[c].weapons.findIndex(w => w.id === id); if (i >= 0) return i; } return 0; };
const starKills = id => 1000 * (1 + Math.min(4, wTierOf(id)));
const wProg = id => { save.wp = save.wp || {}; return save.wp[id] = save.wp[id] || { k: 0, r: 0, n: 0, u: 0 }; };
/* cada estrela e uma missao que se faz UMA vez por arma: depois de desbloqueada, podes juntar copias para essa estrela as vezes que quiseres. Quem ja tem a estrela tem-na desbloqueada */
const wUnlocked = id => Math.max(wProg(id).u | 0, wStar(id));
function wpAdd(raidWon) {   // no fim de cada missao: o que fizeste conta para a arma equipada
  if (!R || !save || R.lab) return; const w = curW(), p = wProg(w.id), st = wUnlocked(w.id);
  p.k += R.kills | 0;
  if (R.raid && raidWon) { if (st >= 1) p.r++; if (st >= 2 && R.raid.d >= 1) p.n++; }
}
function wUnlock(id) {   // cumpre a missao da proxima estrela: gasta a(s) pedra(s) e desbloqueia
  const t = wUnlocked(id), r = wReq(id, t); if (t >= STAR_MAX || !r.ok) return false;
  save.stones[r.q.stone] -= r.q.n; wProg(id).u = t + 1; return true;
}
function wReq(id, t) {   // estado dos requisitos para a estrela t+1
  const q = WSTAR_REQ[t]; if (!q) return { ok: false, lines: [] }; const p = wProg(id), have = save.stones[q.stone] | 0, lines = [];
  lines.push({ ok: have >= q.n, t: `${q.n}× ${['Pedra Comum', 'Pedra Rara', 'Pedra Épica', 'Pedra Lendária', 'Pedra Mítica'][q.stone]} (${have})` });
  if (q.kills) { const K = starKills(id); lines.push({ ok: p.k >= K, t: `${Math.min(p.k, K)}/${K} abates com esta arma` }); }
  if (q.raids) lines.push({ ok: p.r >= q.raids, t: `${Math.min(p.r, q.raids)}/${q.raids} raids (depois de ter ${t}★)` });
  if (q.nraids) lines.push({ ok: p.n >= q.nraids, t: `${Math.min(p.n, q.nraids)}/${q.nraids} raids Normal+ (depois de ter ${t}★)` });
  return { ok: lines.every(l => l.ok), lines, q };
}
const wTotal = id => ((save && save.wst && save.wst[id]) || []).reduce((a, b) => a + b, 0);
const wlm = l => 1 + .15 * l + .006 * l * l;   // bonus de dano do nivel da Bigorna (+12 = x3,6)
const DM = () => stats().dm * wlm(wlvl()) * STAR_MULT[wStar(curW().id)] * TUNE.cls[save.cls];
const myG = () => (typeof on === 'object' && on && on.gender === 'f') ? 'f' : 'm';
const hk = cls => cls + '0';   // nome do sprite do heroi (uma so aparencia)
const heroSpr = () => hk(save.cls);

