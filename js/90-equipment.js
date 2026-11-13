'use strict';
/* =====================================================================
   EQUIPAMENTO, ATRIBUTOS E ENCANTAMENTOS
   ===================================================================== */
const RAR = [['Comum', '#9aa4b8'], ['Raro', '#5aa8ff'], ['Épico', '#b06aff'], ['Lendário', '#ff9a2a'], ['Mítico', '#ff4a6a']];
const SLOTS = ['head', 'chest', 'boots', 'amulet'], BAG_PAGE = 30;
const EQ_SLOTS = SLOTS.concat('ring');   // slots de equipamento: 4 pecas de armadura + o anel (o anel nao tem refino, encantamento nem fusao)
// 5 mochilas de 30 lugares: a 1.a e gratis, as outras compram-se por ordem (ouro ou diamantes)
const BAG_COST = [null, ['g', 10000], ['g', 25000], ['d', 200], ['d', 300]];
const bagMax = () => BAG_PAGE * ((save && save.bagSlots) || 1);
const SLOT_LBL = { head: 'Capacete', chest: 'Armadura', boots: 'Botas', amulet: 'Amuleto', ring: 'Anel' };
const ITEM_NAMES = {
  head:   ['Capacete de Couro', 'Elmo de Ferro', 'Elmo Rúnico', 'Coroa Ancestral', 'Coroa Divina'],
  chest:  ['Armadura de Couro', 'Peitoral de Aço', 'Armadura Rúnica', 'Armadura Ancestral', 'Armadura Divina'],
  boots:  ['Botas de Couro', 'Botas de Ferro', 'Botas Rúnicas', 'Botas Ancestrais', 'Botas Divinas'],
  amulet: ['Amuleto de Bronze', 'Colar de Prata', 'Talismã Rúnico', 'Talismã Ancestral', 'Talismã Divino'],
  ring:   ['Anel de Prata', 'Anel de Ouro', 'Anel de Diamante', 'Anel Roxo'],   // Comum, Raro, Epico, Lendario (nao ha anel Mitico)
};
const SLOT_ROWS = {
  head: [
    ['...mmmm...', '..mmmmmm..', '.mmmmmmmm.', '.mmddddmm.', '.mmddddmm.', '.mm....mm.'],
    ['..mmmmmm..', '.mmhhmmmm.', '.mmmmmmmm.', '.mmdmmdmm.', '.mmmddmmm.', '.mm.dd.mm.'],
    ['m........m', 'mm.mmmm.mm', '.mmmmmmmm.', '.mmhhhhmm.', '.mmdmmdmm.', '.mmmddmmm.', '.mm.dd.mm.'],
    ['g.g.gg.g.g', 'gggggggggg', 'gmmmeemmmg', '.mmmmmmmm.', '.mmdmmdmm.', '.mmmddmmm.', '.mm.dd.mm.'],
    ['w..gggg..w', 'ww.gwwg.ww', '.gggggggg.', 'gmmmeemmmg', '.mmmmmmmm.', '.mmdmmdmm.', '.mmmddmmm.', '.mm.dd.mm.'],
  ],
  chest: [
    ['..mmmmmm..', '.mmmmmmmm.', 'mmmmddmmmm', 'mmmmmmmmmm', '.mmmmmmmm.', '.mmmmmmmm.'],
    ['mm.mmmm.mm', 'mmmmmmmmmm', 'mhhmmmmhhm', '.mmmddmmm.', '.mmmddmmm.', '.mmmmmmmm.', '..mmmmmm..'],
    ['m.m....m.m', 'mmmmmmmmmm', 'mmhmmmmhmm', 'mmmmeemmmm', '.mmmeemmm.', '.mmmddmmm.', '.mmmmmmmm.', '..mmmmmm..'],
    ['g.gmmmmg.g', 'gggmmmmggg', 'gmmmggmmmg', 'gmmmeemmmg', '.gmmeemmg.', '.gmmddmmg.', '.gmmmmmmg.', '..gggggg..'],
    ['w...gg...w', 'ww.gggg.ww', 'wwgmmmmgww', 'wgmmeemmgw', 'wgmmeemmgw', '.gmmddmmg.', '.gmmmmmmg.', '..gggggg..'],
  ],
  boots: [
    ['.mm....mm.', '.mm....mm.', 'mmmm..mmmm', 'dddd..dddd'],
    ['.mmm..mmm.', '.mmm..mmm.', '.mhm..mhm.', 'mmmm..mmmm', 'mmmm..mmmm', 'dddd..dddd'],
    ['.mmm..mmm.', '.mem..mem.', '.mmm..mmm.', '.mhm..mhm.', 'mmmm..mmmm', 'mmmm..mmmm', 'dddd..dddd'],
    ['gggg..gggg', '.mmm..mmm.', '.mem..mem.', '.mmm..mmm.', 'mmmm..mmmm', 'mmmm..mmmm', 'gggg..gggg'],
    ['w.gg..gg.w', 'wwgg..ggww', '.gmm..mmg.', '.gem..meg.', '.gmm..mmg.', 'gmmm..mmmg', 'gmmm..mmmg', 'gggg..gggg'],
  ],
  amulet: [
    ['.d......d.', '..d....d..', '...d..d...', '...dddd...', '..dmmmmd..', '..dmhhmd..', '...dmmd...', '....dd....'],
    ['.d......d.', '..d....d..', '...d..d...', '..dmmmmd..', '.dmhhhhmd.', '.dmhddhmd.', '.dmhhhhmd.', '..dmmmmd..', '...dddd...'],
    ['.d......d.', '..d....d..', '...d..d...', '....dd....', '...dmmd...', '..dmeemd..', '.dmmeemmd.', '..dmeemd..', '...dmmd...', '....dd....'],
    ['.g......g.', '..g....g..', '...g..g...', '..gggggg..', '.gmmmmmmg.', 'gmmmeemmmg', 'gmmmeemmmg', '.gmmmmmmg.', '..gggggg..'],
    ['w..g..g..w', 'ww.gggg.ww', 'wwgmmmmgww', 'wgmmeemmgw', '.gmmeemmg.', '..gmmmmg..', '...gggg...'],
  ],
};
const EGEM = ['#ffffff', '#bfe6ff', '#ffd34a', '#ff4a4a', '#7fffd4'];
const SLOT_SPR = {}; for (const sl of SLOTS) SLOT_SPR[sl] = RAR.map((r, i) => makeSprite(SLOT_ROWS[sl][i], { m: r[1], d: shade(r[1], -.55), h: '#ffffff', g: '#f5c542', e: EGEM[i], w: shade(r[1], .55) }, 1, false));
for (const sl of SLOTS) SLOT_SPR[sl][0] = C16[sl];   // os comuns usam a pixel art feita a mao (16x16)

// ----- Aneis: bonus de conjunto -----
// 4 aros (Prata, Ouro, Diamante, Roxo = Comum, Raro, Epico, Lendario) x 4 gemas (a cor da gema e o stat que o anel melhora)
const RING_ART = [[{ rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ffe24a', b: '#ffffff', c: '#9b9999', d: '#deff4a', e: '#737070' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#6adfff', b: '#ffffff', c: '#9b9999', d: '#6aa8ff', e: '#737070' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff6a7a', b: '#ffffff', c: '#9b9999', d: '#ff6abb', e: '#737070' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff9a3a', b: '#ffffff', c: '#9b9999', d: '#ffc63a', e: '#737070' } }], [{ rows: ['..aab..', '.cadac.', 'e.....e', 'e.....e', 'e.....e', '.c...c.', '..eee..'], pal: { a: '#ffe24a', b: '#ffffff', c: '#a67c00', d: '#deff4a', e: '#ffdc73' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#6adfff', b: '#ffffff', c: '#ffdc73', d: '#6aa8ff', e: '#a67c00' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff6a7a', b: '#ffffff', c: '#ffdc73', d: '#ff6abb', e: '#a67c00' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff9a3a', b: '#ffffff', c: '#ffdc73', d: '#ffc63a', e: '#a67c00' } }], [{ rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ffe24a', b: '#ffffff', c: '#b7bef4', d: '#deff4a', e: '#b7f4f2' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#6adfff', b: '#ffffff', c: '#b7bef4', d: '#6aa8ff', e: '#b7f4f2' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff6a7a', b: '#ffffff', c: '#b7bef4', d: '#ff6abb', e: '#b7f4f2' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff9a3a', b: '#ffffff', c: '#b7bef4', d: '#ffc63a', e: '#b7f4f2' } }], [{ rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ffe24a', b: '#ffffff', c: '#e24e94', d: '#deff4a', e: '#c54ee2' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#6adfff', b: '#ffffff', c: '#e24e94', d: '#6aa8ff', e: '#c54ee2' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff6a7a', b: '#ffffff', c: '#e24e94', d: '#ff6abb', e: '#c54ee2' } }, { rows: ['..aab..', '.cadac.', 'c.....c', 'c.....c', 'c.....c', '.e...e.', '..ccc..'], pal: { a: '#ff9a3a', b: '#ffffff', c: '#e24e94', d: '#ffc63a', e: '#c54ee2' } }]];   // desenhado a mao (art/items/rings)
const RING_SPR = RING_ART.map(b => b.map(a => makeSprite(a.rows, a.pal, 1, false)));
const GEM_STAT = ['cdr', 'spd', 'hp', 'dmg'];   // amarelo = vel. de ataque, azul = velocidade, vermelho = vida, laranja = dano
const GEM_NM = ['do Topázio', 'da Safira', 'do Rubi', 'do Âmbar'];
const RING_BASE = [3, 6.5, 9, 13], RING_DROP = .12;   // bonus maximo (nivel de item 120) por raridade do anel; 12% dos drops de equipamento sao aneis
const ringPct = (r, il) => +(RING_BASE[Math.min(3, r | 0)] * (.5 + .5 * Math.min(120, Math.max(1, il | 0)) / 120)).toFixed(1);   // metade do maximo no nivel 1, o maximo no nivel 120
function ringIcon(r, g, cx, cy, k) { const im = RING_SPR[Math.min(3, r | 0)][(g | 0) % 4]; k = Math.max(1, Math.round(k));   // escala inteira: os pixeis ficam nitidos
  ctx.drawImage(im, Math.round(cx - im.width * k / 2), Math.round(cy - im.height * k / 2), im.width * k, im.height * k); }
function itemIcon(it, cx, cy, k) { if (it.slot === 'ring') ringIcon(it.r, it.gem, cx, cy, k); else slotIcon(it.slot, it.r | 0, cx, cy, k); }
// conjunto completo = as 4 pecas de armadura equipadas e todas da mesma raridade (qualquer raridade); o anel so da bonus nesse caso
function setComplete() { const g = save && save.gear; if (!g || !g.head || !g.chest || !g.boots || !g.amulet) return false; return g.chest.r === g.head.r && g.boots.r === g.head.r && g.amulet.r === g.head.r; }
function setBonus() { const g = save && save.gear; if (!g || !g.ring) return null; return { ring: g.ring, k: g.ring.main.k, p: g.ring.main.v / 100, on: setComplete() }; }
const AFF = {
  hp: { n: 'Vida', u: '', b: 12, p: 3 }, dmg: { n: 'Dano', u: '%', b: 2.5, p: .25 }, spd: { n: 'Velocidade', u: '%', b: 1.5, p: .12 }, cdr: { n: 'Vel. de ataque', u: '%', b: 1.5, p: .12 },
  crit: { n: 'Crítico', u: '%', b: 1.5, p: .1 }, ls: { n: 'Roubo de vida', u: '%', b: .8, p: .05 }, dr: { n: 'Redução de dano', u: '%', b: 1, p: .08 },
  gf: { n: 'Ouro extra', u: '%', b: 3, p: .3 }, xpb: { n: 'XP extra', u: '%', b: 3, p: .3 }, burn: { n: 'Chance de queimar', u: '%', b: 6, p: .5 }, slow: { n: 'Chance de abrandar', u: '%', b: 6, p: .5 },
};
const AFF_POOL = ['hp', 'dmg', 'spd', 'cdr', 'crit', 'ls', 'dr', 'gf', 'xpb'];
const SPEC_POOL = [['burn', 'Ígneo'], ['slow', 'Gélido'], ['ls', 'Vampírico'], ['crit', 'Letal'], ['gf', 'Próspero'], ['xpb', 'Sábio'], ['dr', 'Protetor'], ['dmg', 'Poderoso']];
const SLOT_MAIN = { head: 'hp', chest: 'hp', boots: 'spd', amulet: 'dmg' };
const ATTRS = [['vit', 'Vitalidade', '+7 vida'], ['str', 'Força', '+1% dano'], ['agi', 'Agilidade', '+0.6% velocidade'], ['per', 'Perícia', '+0.6% vel. de ataque']];
const ENC_CH = [100, 90, 80, 70, 60, 50, 40, 30, 22, 15], ENC_MAX = 10;
const refCost = it => Math.round(45 * (1 + it.il * .25) * (1 + it.r * .5) * (it.ench + 1) * lvMul());
const specCost = it => Math.round(150 * (1 + it.il * .2) * (1 + it.r * .4) * (1 + (it.rr || 0) * .15) * lvMul());
const ev = (k, v, m) => k === 'hp' ? Math.round(v * m) : +(v * m).toFixed(1);
const statLine = (k, v) => { const a = AFF[k]; return a.u ? `+${v}${a.u} ${a.n}` : `+${v} ${a.n}`; };
const itemName = it => `${ITEM_NAMES[it.slot][it.r]}${it.slot === 'ring' ? ' ' + GEM_NM[it.gem | 0] : ''}${it.spec ? ' ' + it.spec.nm : ''}${it.ench ? ` +${it.ench}` : ''}${it.st ? ' ' + '★'.repeat(it.st) : ''}`;
const sellValue = it => Math.round(.6 * (6 + it.il * 2) * (1 + it.r * it.r * .8) * (1 + .15 * it.ench) * (1 + .5 * (it.st || 0)));
const CMP_W = { hp: 1, dmg: 1.5, spd: .8, cdr: 1.2, crit: 1.1, ls: 1, dr: 1, gf: .5, xpb: .5, burn: .6, slow: .5 };
function itemStats(it) { const m = (1 + ENC_K * it.ench) * GEAR_STAR[it.st || 0], o = {}; o[it.main.k] = (o[it.main.k] || 0) + it.main.v * m; for (const a of it.aff) o[a.k] = (o[a.k] || 0) + a.v * m; if (it.spec) o[it.spec.k] = (o[it.spec.k] || 0) + it.spec.v * m; return o; }
function cmpItems(nw, old) {
  if (nw.slot === 'ring') { const s = nw.r - (old ? old.r : -1); return { score: s, rows: [], verdict: s > 0 ? 1 : s < 0 ? -1 : 0 }; }   // aneis: ganha a raridade mais alta
  const A = itemStats(nw), B = old ? itemStats(old) : {}, rows = []; let score = 0;
  for (const k of new Set(Object.keys(A).concat(Object.keys(B)))) { const d = (A[k] || 0) - (B[k] || 0); if (Math.abs(d) < (k === 'hp' ? .5 : .05)) continue; const w = (CMP_W[k] || 1) / (AFF[k].b + AFF[k].p * 20); score += d * w; rows.push({ k, d, w: Math.abs(d * w) }); }
  rows.sort((p, q) => q.w - p.w); return { score, rows, verdict: !old || score > .06 ? 1 : score < -.06 ? -1 : 0 };
}
// limites por nivel do jogador: equipamento (nivel do item / 2), Bigorna (nivel / 3) e refino (nivel / 4)
const itemReq = it => Math.ceil(it.il / 2), canWear = it => save.pl.lv >= itemReq(it);
const anvCap = () => Math.min(ANV_MAX, Math.floor(save.pl.lv / 3)), refCap = () => Math.min(ENC_MAX, Math.floor(save.pl.lv / 4));
function equipFromBag(i) { const it = save.bag[i], old = save.gear[it.slot]; if (!canWear(it)) { SFX.error(); return; } save.gear[it.slot] = it; if (old) save.bag[i] = old; else save.bag.splice(i, 1); bagSel = -1; persist(); SFX.buy(); }
function equipBest(sl) {
  const cur = save.gear[sl]; let bi = -1, bs = -1e9, li = -1, ls = -1e9;
  save.bag.forEach((it, i) => { if (it.slot !== sl) return; const c = cmpItems(it, cur); if (canWear(it)) { if (c.score > bs) { bs = c.score; bi = i; } } else if (c.score > ls) { ls = c.score; li = i; } });
  if (bi >= 0 && (!cur || bs > .06)) { const nm = itemName(save.bag[bi]); equipFromBag(bi); hubToast = { t: 2.4, s: 'Equipado: ' + nm, col: '#6f6' }; }
  else if (li >= 0 && (!cur || ls > .06)) { SFX.error(); hubToast = { t: 3, s: `Há um item melhor, mas exige nível ${itemReq(save.bag[li])}`, col: '#fd5' }; }   // existe, mas ainda nao o podes usar
  else { SFX.error(); hubToast = { t: 2, s: 'Nada melhor na mochila', col: '#f88' }; }
}
function arrowTri(x, y, up, col) { ctx.fillStyle = col; ctx.beginPath(); if (up) { ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x - 6, y + 2); } else { ctx.moveTo(x, y + 6); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x - 6, y - 2); } ctx.fill(); }
const wpnDps = w => w.dmg * (w.count || 1) * 10 * wlm(save.wl[w.id] || 0) * STAR_MULT[wStar(w.id)] / w.cd;
function spendG(n) { save.gold -= n; const t = save.stats = save.stats || { kills: 0, gold: 0, bosses: 0 }; t.spent = (t.spent | 0) + Math.max(0, n | 0); }   // o ouro gasto conta para as conquistas
function statUp(k, v) { const t = save.stats = save.stats || { kills: 0, gold: 0, bosses: 0 }; t[k] = (t[k] | 0) + (v === undefined ? 1 : v); }
function addBag(it) { const t = save.stats = save.stats || { kills: 0, gold: 0, bosses: 0 }; if (it && it.r > (t.rar | 0)) t.rar = it.r; if (save.bag.length >= bagMax()) return false; save.bag.push(it); return true; }
function mainVal(slot, r, il) {
  if (slot === 'head') return Math.round((30 + 8 * il) * (1 + .24 * r) * GEAR_F.hp * (r === 4 ? MYTH_F : 1));
  if (slot === 'chest') return Math.round((50 + 12 * il) * (1 + .24 * r) * GEAR_F.hp * (r === 4 ? MYTH_F : 1));
  if (slot === 'boots') return +((3 + .25 * il) * (1 + .2 * r) * (r === 4 ? MYTH_F : 1)).toFixed(1);
  return +((3 + .35 * il) * (1 + .2 * r) * GEAR_F.dmg * (r === 4 ? MYTH_F : 1)).toFixed(1);
}
function affVal(k, r, il) { const a = AFF[k], v = (a.b + a.p * il) * (.75 + .5 * Math.random()) * (1 + .1 * r) * (GEAR_F[k] || 1) * (r === 4 ? MYTH_F : 1); return k === 'hp' ? Math.round(v) : +v.toFixed(1); }
function rollSpec(it, avoid) {
  let c; do { c = SPEC_POOL[Math.floor(Math.random() * SPEC_POOL.length)]; } while (avoid && c[0] === avoid);
  const cap = (c[0] === 'burn' || c[0] === 'slow') ? 35 : c[0] === 'xpb' ? 20 : 45; return { k: c[0], nm: c[1], v: Math.min(cap, +(affVal(c[0], it.r + 1, it.il) * 1.5).toFixed(1)) };
}
function genItem(slot, r, il) {
  const it = { slot, r, il, ench: 0, rr: 0, main: { k: SLOT_MAIN[slot], v: mainVal(slot, r, il) }, aff: [], spec: null };
  const pool = AFF_POOL.filter(k => k !== it.main.k);
  for (let i = 0; i < r; i++) { const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; it.aff.push({ k, v: affVal(k, r, il) }); }
  if (r >= 3 && Math.random() < (r === 4 ? 1 : .5)) it.spec = rollSpec(it);
  return it;
}
function genRing(r, il) {   // anel: so tem o bonus de conjunto (+2/5/7/10% do stat da gema)
  r = Math.min(3, r); const gem = Math.floor(Math.random() * 4);
  return { slot: 'ring', r, il, gem, ench: 0, rr: 0, st: 0, main: { k: GEM_STAT[gem], v: ringPct(r, il) }, aff: [], spec: null };
}
const genLoot = (r, il) => Math.random() < RING_DROP ? genRing(r, il) : genItem(SLOTS[Math.floor(Math.random() * 4)], r, il);
function gearStats() {
  const g = { hp: 0, dmg: 0, spd: 0, cdr: 0, crit: 0, ls: 0, dr: 0, gf: 0, xpb: 0, burn: 0, slow: 0 };
  if (!save || !save.gear) return g;
  for (const sl of SLOTS) { const it = save.gear[sl]; if (!it) continue; const m = (1 + ENC_K * it.ench) * GEAR_STAR[it.st || 0]; g[it.main.k] += it.main.v * m; for (const a of it.aff) g[a.k] += a.v * m; if (it.spec) g[it.spec.k] += it.spec.v * m; }
  g.xpb = Math.min(25, g.xpb); g.ls = Math.min(6, g.ls);   // tetos   // XP extra tem teto
  return g;
}
// pesos de raridade (Comum..Mitico): Lendario ronda 1% e Mitico 0,1% mesmo no melhor caso
const rarityWeights = b => [70, 24 + b * 1.8, 6 + b * 1.2, .5 + b * .12, .04 + b * .015];
function rollRarity(boost = 0, min = 0) {
  const w = rarityWeights(boost); let x = Math.random() * w.reduce((a, b) => a + b), r = 0;
  for (; r < 4; r++) { if (x < w[r]) break; x -= w[r]; } return Math.max(min, r);
}
const runIL = () => (R.raid ? 6 + R.m * 6 + R.raid.d * 4 : (R.farm && R.rec ? R.rec : 1 + R.m * 6) + Math.floor((R.wave || 1) * .9)) + Math.floor((save.pl.lv || 1) * .5);
const lootBoost = () => R.raid ? 2 + R.raid.d * 2 : Math.min(6, Math.floor((R.wave || 1) / 4));
function giveWeaponCopy(x, y) {
  const c = CLASSES[save.cls], ok = c.weapons.map((w, i) => i).filter(i => weaponReq(i).ok), i = ok[Math.floor(Math.random() * ok.length)], w = c.weapons[i];
  R.wloot.push(w.id); R.texts.push({ x, y: y - 28, s: 'Cópia: ' + w.n, t: 1.8, col: '#ffd34a', sz: 14 }); R.fx.push({ k: 'ring', x, y, r: 24, t: .4, max: .4, col: '#ffd34a' }); SFX.heal();
}
// o drop depende do monstro: os fortes (bruto, escaravelho) largam mais vezes e itens melhores; os fracos (lodo, morcego) menos e piores
const mobTier = type => (EN[type] ? EN[type].gold : 8) / 8;   // 0,4 (lodo) ... 1,75 (escaravelho)
function giveLoot(x, y, minR = 0, tier = 1) {
  const it = genLoot(rollRarity(Math.max(0, lootBoost() + (tier - 1) * 2), minR), Math.max(1, Math.min(120, runIL() + Math.round((tier - 1) * 8)))); R.loot.push(it);
  R.texts.push({ x, y: y - 14, s: itemName(it), t: 1.8, col: RAR[it.r][1], sz: 14 }); R.fx.push({ k: 'ring', x, y, r: 28, t: .4, max: .4, col: RAR[it.r][1] }); SFX.heal();
}
function bossDown(b) {
  R.petXp = (R.petXp | 0) + (b.guardian ? 60 : b.mini ? 12 : 25);   // o pet equipado ganha XP com os bosses
  if (b.guardian) { statUp('guard'); R.toast = 'GUARDIÃO DOURADO DERROTADO!'; R.toastT = 3.2; R.phase = 'hunt'; R.shake = 16; return; }   // por enquanto nao da recompensa
  if (b.mini) { giveLoot(b.x, b.y, 0); if (Math.random() < .4) giveWeaponCopy(b.x + 22, b.y + 22);
    if (R.farm && R.m === 0 && !((save.pres && save.pres[0]) | 0)) { R.phase = 'cp'; R.cpWave = R.wave; state = 'cp'; SFX.win(); return; }   // so na Floresta Sombria e so sem prestigio: tambem podes sair nas ondas 5, 15, 25...
    R.phase = 'hunt'; nextWave(); return; }
  const n = R.raid ? 2 + R.raid.d : 1, minR = R.raid ? Math.min(2, 1 + (R.raid.d >= 2 ? 1 : 0)) : 1;   // o boss garante no minimo Raro (Epico nas raids dificeis); Lendario e Mitico so por sorte
  for (let i = 0; i < n; i++) giveLoot(b.x + (i - (n - 1) / 2) * 30, b.y, minR);
  for (let i = 0; i < (R.raid ? 1 + Math.floor(R.raid.d / 2) : 1); i++) giveWeaponCopy(b.x + 22 * i, b.y + 22);
  if (R.farm) { if (R.wave % 10 === 0) { R.phase = 'cp'; R.cpWave = R.wave; state = 'cp'; SFX.win(); } else { R.phase = 'hunt'; nextWave(); } } else { R.endT = 1.4; R.endWin = true; }   // a cada 10 ondas (depois do boss) podes sair e guardar tudo
}
const isHorde = w => w > 0 && w % 10 === 0;   // a cada 10 ondas do Farm vem uma horda
function applyWave() {
  const w = R.wave, h = isHorde(w); R.need = Math.round(Math.min(50, 6 + 1.6 * w) * (h ? 1.5 : 1)); R.waveKills = 0;
  R.hpM = 1 + TUNE.wHP * (w - 1) + TUNE.wHP2 * (w - 1) * (w - 1); R.dmgM = 1 + TUNE.wDM * (w - 1); R.goldM = (1 + .12 * (w - 1)) * (h ? 1.5 : 1); R.spdM = Math.min(1.4, 1 + .01 * (w - 1));
  R.kdm = 1; if (R.farm && R.rec) { const fk = farmK(R.rec); R.hpM *= fk.hp; R.dmgM *= fk.dm; R.kdm = fk.dm; R.goldM *= 1 + .02 * (R.rec - 1); }   // mapas e prestigios mais altos: monstros mais fortes e mais ouro
  R.bossM = R.hpM * .9; R.bossDM = (1 + .05 * (w - 1) + .08 * R.m) * R.kdm;   // os ataques do boss do Farm tambem crescem com a onda e a zona
  R.capB = 3 + Math.min(10, Math.floor(w / 4)) + Math.min(10, 2 * Math.floor(w / 10));       // mais monstros em simultaneo, sempre a subir
  R.hordeB = h ? 6 + Math.min(10, Math.floor(w / 10)) : 0;                               // a horda aguenta ainda mais
  R.spawnRate = Math.min(3, 1.8 + .03 * (w - 1)) * (h ? 1.8 : 1); R.packT = 5;
}
function hordeBurst() {
  const n = 8 + Math.min(14, Math.floor(R.wave / 5)); for (let i = 0; i < n; i++) spawnEdge(MISSIONS[R.m].types[Math.floor(Math.random() * MISSIONS[R.m].types.length)]);
}
// Depois da onda 40 (e de 40 em 40 ondas) o Guardiao Dourado desce do ceu para te enfrentar
const GUARD = { name: 'Guardião Dourado', pal: 'gguard', r: 64, spd: 70, ring: 12, charge: 430, col: '#f5c542', pattern: ['leap', 'spin', 'slam', 'charge', 'leap', 'spin', 'ring'], hpK: 6 };
const guardHere = w => w > 40 && (w - 1) % 40 === 0;   // o Guardiao Dourado vem nas ondas 41, 81, 121...
function spawnGuardian() {
  const b = GUARD, hpv = TUNE.boss[R.m] * (R.bossM || 1) * 1.2 * lvHP() * b.hpK;
  R.boss = { boss: true, guardian: true, x: W / 2, y: 130, r: b.r, hp: hpv, max: hpv, spd: b.spd, hit: 0, kx: 0, ky: 0, st: 'walk', t: 1.2, mt: 0, f: 0, dx: 0, dy: 0, slow: 0, burn: 0, bt: 0, ob: 0, summoned: false, pal: b.pal, name: b.name, ring: b.ring, chg: b.charge, col: b.col, pattern: b.pattern, pi: 0, spin: 0, air: false, z: 0 };
  R.enemies = []; R.projs = []; R.tels = []; R.phase = 'boss'; R.p.x = W / 2; R.p.y = H - 110; R.p.inv = 5; R.cine = { t: 0, dur: 4.4 }; SFX.boss();
}
function updateCine(dt) {
  const c = R.cine, b = R.boss; c.t += dt; R.time += dt; R.shake *= .93; R.toastT = 0;
  if (c.t > .35 && !c.a) { c.a = 1; SFX.boss(); R.shake = 8; }
  if (c.t > 1.2 && !c.b) { c.b = 1; SFX.boss(); R.shake = 14; for (let i = 0; i < 4; i++) burst(W / 2 + (Math.random() - .5) * 120, 60 + Math.random() * 120, '#ffe58a', 18); }
  if (c.t > 2 && !c.c) { c.c = 1; SFX.boss(); R.shake = 34; burst(b.x, b.y + b.r, '#ffd34a', 90); burst(b.x, b.y + b.r, '#fff', 40); R.fx.push({ k: 'ring', x: b.x, y: b.y + b.r, r: 320, t: .7, max: .7, col: '#ffd34a' }); R.fx.push({ k: 'ring', x: b.x, y: b.y + b.r, r: 200, t: .5, max: .5, col: '#fff' }); }
  if (c.t >= c.dur) { R.cine = null; R.p.inv = Math.max(R.p.inv, 1); R.toast = '! Guardião Dourado !'; R.toastT = 2.4; }
}
function drawCine() {
  const c = R.cine; if (!c) return; const t = c.t, ease = Math.min(1, t / .5) * Math.min(1, (c.dur - t) / .5), bh = 64 * ease;
  ctx.save(); ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
  const vg = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 460); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(20,10,0,${.75 * ease})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
  if (t > .35 && t < 2.1) { const k = Math.min(1, (t - .35) / .6), fl = .5 + .5 * Math.sin(t * 40); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(W / 2 - 70, 0, W / 2 + 70, 0); g.addColorStop(0, 'rgba(255,200,60,0)'); g.addColorStop(.5, `rgba(255,230,140,${.55 * k * (.7 + .3 * fl)})`); g.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = g; ctx.fillRect(W / 2 - 70, 0, 140, H);
    ctx.strokeStyle = `rgba(255,240,170,${.8 * fl})`; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { let x = W / 2 + (rn(i + Math.floor(t * 12)) - .5) * 160, y = 0; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (rn(i * 9 + j + Math.floor(t * 12)) - .5) * 50; y += H / 7; ctx.lineTo(x, y); } ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; }
  if (t > 2 && t < 2.25) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 2) / .25})`; ctx.fillRect(0, 0, W, H); }
  if (t > 2.3) { const k = Math.min(1, (t - 2.3) / .6), n = 'GUARDIÃO DOURADO', shown = n.slice(0, Math.ceil(n.length * k)); ctx.globalAlpha = Math.min(1, (c.dur - t) / .5);
    txt(L(shown), W / 2 + 2, H - bh - 36 + 2, 34, '#3a2a08', 'center', 'bold'); txt(L(shown), W / 2, H - bh - 38, 34, '#ffd34a', 'center', 'bold'); if (k >= 1) txt('O Protetor do Ouro', W / 2, H - bh - 12, 15, '#ffe9a0', 'center'); ctx.globalAlpha = 1; }
  ctx.restore();
}
function nextWave() {
  R.wave++; applyWave(); R.toast = isHorde(R.wave) ? `ONDA ${R.wave} · HORDA!` : R.wave % 10 === 0 ? `ONDA ${R.wave} · BOSS!` : R.wave % 5 === 0 ? `ONDA ${R.wave} · SEMI-BOSS!` : `ONDA ${R.wave}`; R.toastT = 2.5; heal(R.p.max * .15); SFX.ready(); R.shake = 6;
  if (isHorde(R.wave)) { R.toastT = 3.2; R.shake = 14; SFX.boss(); hordeBurst(); }
  if (R.farm && guardHere(R.wave)) spawnGuardian();
}
function endTitle(win) { return R.farm ? (win ? (R.exitMode === 'quit' ? 'SAÍSTE DA CAMPANHA' : 'CAMPANHA GUARDADA') : 'DERROTADO') : R.raid ? (win ? 'RAID CONCLUÍDA!' : 'RAID FALHADA') : (win ? 'MISSÃO CUMPRIDA!' : 'MISSÃO FALHADA'); }
function endLines(win) {
  const a = [R.farm ? `Onda alcançada: ${R.wave}` : win ? `${MISSIONS[R.m].boss.name} foi derrotado!` : 'Foste derrotado...'];
  a.push(R.farm ? (win ? (R.exitMode === 'quit' ? `Saíste a meio: ficaste com 30% (¢${R.earned})` : `Guardaste tudo: ¢${R.earned}`) : `Morreste: ficaste com 40% do XP e 10% do ouro (¢${R.earned}) · itens perdidos`) : win ? `Ganhaste ¢${R.earned} (inclui recompensa)` : `Guardaste ¢${R.earned} (metade do ouro)`);
  a.push(`+${R.xpGain} XP · Itens: ${R.lootN}` + (R.wlootN ? ` · Cópias: ${R.wlootN}` : ''));
  { const B = gb(); if (B.gold || B.xp) a.push(E2(`Guild bonus: +${Math.round(B.gold * 1000) / 10}% gold, +${Math.round(B.xp * 1000) / 10}% XP`, `Bónus da guilda: +${Math.round(B.gold * 1000) / 10}% ouro, +${Math.round(B.xp * 1000) / 10}% XP`)); }
  if (R.petGain) a.push(`${petDisplayName(save.pets.eq)}: +${R.petGain} XP` + (R.petUp ? T2(` · subiu para o nível ${petLv(save.pets.eq)}!`, ` · reached level ${petLv(save.pets.eq)}!`) : ''));
  if (R.lvUp) a.push(`Subiste para o nível ${R.lvUp}! (+${R.ptsGain} pontos)`);
  if (R.gemGain) a.push(`+${R.gemGain} ◆ Diamantes`);
  if (R.stoneGain && R.stoneGain.some(Boolean)) a.push('Pedras de evolução: ' + R.stoneGain.map((n, r) => n ? `${n}× ${RAR[r][0]}` : '').filter(Boolean).join(', '));
  return a;
}
function miniStars(n, x, y) { for (let q = 0; q < n; q++) drawIcon('star', x + q * 8, y, .9); }
function slotIcon(slot, r, cx, cy, k) { if (slot === 'ring') { ringIcon(r, 2, cx, cy, k); return; } const im = SLOT_SPR[slot][r]; if (im.width === 16) k = Math.max(1, Math.round(k * .7));   // 16x16: escala inteira
  ctx.drawImage(im, Math.round(cx - im.width * k / 2), Math.round(cy - im.height * k / 2), im.width * k, im.height * k); }
function itemCard(it, x, y, w = 230) {
  const col = RAR[it.r][1], m = (1 + ENC_K * it.ench) * GEAR_STAR[it.st || 0], nm = L(itemName(it)), avail = w - 52; let sz = 15, lines = [nm];
  if (txtW(nm, sz, 'bold') > avail) {
    sz = 13;
    if (txtW(nm, sz, 'bold') > avail) { const words = nm.split(' '); let a = '', b = ''; for (const wd of words) { const t = (a + ' ' + wd).trim(); if (!b && txtW(t, sz, 'bold') <= avail) a = t; else b = (b + ' ' + wd).trim(); } lines = b ? [a, b] : [a]; }
  }
  itemIcon(it, x + 20, y + 20, 3.4);
  lines.forEach((ln, i) => txtR(ln, x + 46, y + 14 + i * 14, sz, col, 'left', 'bold'));
  const ex = (lines.length - 1) * 14;
  { const t0 = `${RAR[it.r][0]} · Item Nv ${it.il}`; txt(t0, x + 46, y + 32 + ex, 12, '#aab'); txt(`· Req. Nv ${itemReq(it)}`, x + 46 + txtW(t0, 12) + 6, y + 32 + ex, 12, canWear(it) ? '#6c8' : '#f66', 'left', 'bold'); }
  if (it.slot === 'ring') {
    let yy = y + 58 + ex; txt(`Bónus de conjunto: +${it.main.v}% ${AFF[it.main.k].n}`, x, yy, 14, '#fff', 'left', 'bold'); yy += 18;
    wrap('Só fica ativo com 4 peças de armadura da mesma raridade (capacete, armadura, botas e amuleto).', x, yy, w - 8, 13, 11, '#9ab'); yy += 30;
    const ok = setComplete(); txt(ok ? 'Conjunto completo' : 'Conjunto incompleto', x, yy, 13, ok ? '#6f6' : '#f88', 'left', 'bold'); return yy + 16;
  }
  let yy = y + 58 + ex; txt(statLine(it.main.k, ev(it.main.k, it.main.v, m)), x, yy, 14, '#fff', 'left', 'bold'); yy += 18;
  for (const a of it.aff) { txt(statLine(a.k, ev(a.k, a.v, m)), x, yy, 13, '#7cf'); yy += 16; }
  if (it.spec) { txt(`${it.spec.nm}: ${statLine(it.spec.k, ev(it.spec.k, it.spec.v, m))}`, x, yy, 13, '#ffd34a'); yy += 16; }
  if (it.ench) { txt(`Refinado +${it.ench}`, x, yy, 12, '#9fe'); yy += 15; }
  if (it.st) { txt(`Fusão ${'★'.repeat(it.st)} (×${GEAR_STAR[it.st].toFixed(2)})`, x, yy, 12, '#ffd34a'); yy += 15; }
  return yy;
}

