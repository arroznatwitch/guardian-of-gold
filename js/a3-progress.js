'use strict';
/* ----- Conquistas e titulos ----- */
const T2 = (pt, en) => lang === 'en' ? en : pt;
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const ACH_TIER = { f: 25, m: 50, d: 75 };   // facil 25, medio 50, dificil 75 diamantes
const TITLES = {
  lodestar: ['Estrela Guia', 'Guiding Star'], astro: ['Astro da Campanha', 'Campaign Star'], emperor: ['Imperador da Campanha', 'Campaign Emperor'], abyss5: ['Lenda do Abismo', 'Abyss Legend'],
  reaper: ['Ceifador de Almas', 'Soul Reaper'], slayer: ['Aniquilador', 'Annihilator'], treasure: ['Caçador de Tesouros', 'Treasure Hunter'], tycoon: ['Magnata', 'Tycoon'],
  veteran: ['Veterano', 'Veteran'], legend: ['Lenda Viva', 'Living Legend'], immortal: ['Imortal', 'Immortal'], tireless: ['Incansável', 'Tireless'],
  lord0: ['Senhor da Floresta', 'Lord of the Forest'], lord1: ['Rei das Cavernas', 'King of the Caves'], lord2: ['Conquistador do Castelo', 'Castle Conqueror'], lord3: ['Mestre do Pântano', 'Swamp Master'], lord4: ['Faraó das Areias', 'Pharaoh of the Sands'], lord5: ['Dominador do Abismo', 'Abyss Dominator'],
  beta: ['Beta Tester', 'Beta Tester'], hardcore: ['Veterano das Raids', 'Raid Veteran'], nightmare: ['Terror dos Pesadelos', 'Nightmare Terror'], inferno: ['Campeão do Inferno', 'Inferno Champion'],
  enchanter: ['Encantador', 'Enchanter'], armorer: ['Mestre Armeiro', 'Master Armorer'], smith: ['Ferreiro Lendário', 'Legendary Smith'], lucky: ['O Sortudo', 'The Lucky One'],
};
const ACH = [];
function achAdd(id, cat, tier, name, desc, prog, title) { ACH.push({ id, cat, tier, gems: ACH_TIER[tier], name, desc, prog, title: title || '' }); }
const stat = k => (save && save.stats && save.stats[k]) | 0;
const gfmtK = n => n >= 1000 ? (n / 1000) + 'K' : String(n);
const wMaxCount = () => Object.keys(save.wst || {}).filter(id => wStar(id) >= STAR_MAX).length;
const gearEnchN = k => SLOTS.filter(sl => save.gear[sl] && (save.gear[sl].ench | 0) >= k).length;
[[1000, 'f'], [2500, 'f'], [5000, 'm'], [10000, 'm'], [25000, 'd'], [50000, 'd']].forEach(([n, t], i) => achAdd('kills' + n, 'combat', t, [`Caçador ${ROM[i]}`, `Hunter ${ROM[i]}`], [`Mata ${gfmt(n)} monstros`, `Kill ${gfmt(n)} monsters`], () => [Math.min(n, stat('kills')), n], n === 10000 ? 'reaper' : n === 50000 ? 'slayer' : ''));
[[10, 'f'], [50, 'm'], [250, 'd']].forEach(([n, t], i) => achAdd('boss' + n, 'combat', t, [`Matador de Bosses ${ROM[i]}`, `Boss Slayer ${ROM[i]}`], [`Derrota ${n} bosses`, `Defeat ${n} bosses`], () => [Math.min(n, stat('bosses')), n]));
[[1, 'd', 'treasure'], [10, 'd', '']].forEach(([n, t, ti], i) => achAdd('guard' + n, 'combat', t, [n === 1 ? 'Guardião Quebrado' : 'Pesadelo do Guardião', n === 1 ? 'Guardian Broken' : 'Guardian\'s Nightmare'], [n === 1 ? 'Derrota o Guardião do Ouro' : `Derrota o Guardião do Ouro ${n} vezes`, n === 1 ? 'Defeat the Gold Guardian' : `Defeat the Gold Guardian ${n} times`], () => [Math.min(n, stat('guard')), n], ti));
[[5000, 'f'], [10000, 'f'], [25000, 'f'], [50000, 'm'], [75000, 'm'], [100000, 'd'], [250000, 'd'], [500000, 'd']].forEach(([n, t], i) => achAdd('spend' + n, 'prog', t, [`Cliente Frequente ${ROM[i]}`, `Big Spender ${ROM[i]}`], [`Gasta ${gfmtK(n)} de ouro`, `Spend ${gfmtK(n)} gold`], () => [Math.min(n, stat('spent')), n], n === 100000 ? 'tycoon' : ''));
for (let l = 10; l <= 120; l += 10) achAdd('lv' + l, 'prog', l <= 30 ? 'f' : l <= 70 ? 'm' : 'd', [`Nível ${l}`, `Level ${l}`], [`Chega ao nível ${l}`, `Reach level ${l}`], () => [Math.min(l, save.pl.lv), l], l === 50 ? 'veteran' : l === 100 ? 'legend' : l === 120 ? 'immortal' : '');
achAdd('bag5', 'prog', 'm', ['Mochileiro', 'Backpacker'], ['Compra todos os espaços da mochila', 'Buy every backpack slot'], () => [Math.min(5, save.bagSlots | 0), 5]);
[[5, 'f'], [10, 'm'], [15, 'd'], [25, 'd']].forEach(([n, t]) => achAdd('farm' + n, 'farm', t, [`Fazendeiro ${n}`, `Farmer ${n}`], [`Conclui a Campanha de todos os mapas ${n} vezes (onda 10)`, `Finish the Campaign of every map ${n} times (wave 10)`], () => [Math.min(n, Math.min(...MISSIONS.map((m, i) => (save.farmN || [])[i] | 0))), n], n === 25 ? 'tireless' : ''));
MISSIONS.forEach((m, i) => [[10, 'f'], [20, 'f'], [30, 'm'], [40, 'm'], [50, 'd']].forEach(([w, t]) => achAdd(`wave${i}_${w}`, 'farm', t, [`${m.name}: onda ${w}`, `${m.name}: wave ${w}`], [`Chega à onda ${w} na Campanha de ${m.name}`, `Reach wave ${w} in the ${m.name} Campaign`], () => [Math.min(w, (save.farmBest[i] | 0)), w], w === 50 ? 'lord' + i : '')));
RAID_D.forEach((d, j) => achAdd('raid' + j, 'raid', ['f', 'm', 'd', 'd', 'd'][j], [`Raids ${d.n}`, `${['Easy', 'Normal', 'Hard', 'Nightmare', 'Inferno'][j]} Raids`], [`Conclui as 6 raids na dificuldade ${d.n}`, `Clear all 6 raids on ${['Easy', 'Normal', 'Hard', 'Nightmare', 'Inferno'][j]}`], () => [MISSIONS.filter((m, i) => ((save.raids[i] || [])[j] | 0) > 0).length, 6], j === 2 ? 'hardcore' : j === 3 ? 'nightmare' : j === 4 ? 'inferno' : ''));
[[1, 'f'], [3, 'f'], [6, 'm'], [12, 'm'], [20, 'd'], [30, 'd']].forEach(([n, t]) => achAdd('stars' + n, 'farm', t, [`Estrelas ${n}`, `Stars ${n}`], [`Junta ${n} ${n > 1 ? 'estrelas' : 'estrela'} de prestígio na Campanha`, `Collect ${n} prestige ${n > 1 ? 'stars' : 'star'} in the Campaign`], () => [Math.min(n, (save.pres || []).reduce((a, b) => a + (b | 0), 0)), n], n === 6 ? 'lodestar' : n === 20 ? 'astro' : n === 30 ? 'emperor' : ''));
MISSIONS.forEach((m, i) => achAdd('presmax' + i, 'farm', 'd', [`Prestígio máximo: ${m.name}`, `Max prestige: ${m.name}`], [`Leva ${m.name} ao prestígio ${PRES_MAX} (nível ${REC_BASE[i] + PRES_STEP * PRES_MAX})`, `Take ${m.name} to prestige ${PRES_MAX} (level ${REC_BASE[i] + PRES_STEP * PRES_MAX})`], () => [(save.pres || [])[i] | 0, PRES_MAX], i === 5 ? 'abyss5' : ''));
achAdd('ench5', 'gear', 'm', ['Equipado a Sério', 'Properly Geared'], ['Tem as 4 peças de equipamento em +5', 'Have all 4 gear pieces at +5'], () => [gearEnchN(5), 4]);
achAdd('ench10', 'gear', 'd', ['Setup Completo', 'Full Setup'], ['Tem as 4 peças de equipamento em +10 (máximo)', 'Have all 4 gear pieces at +10 (max)'], () => [gearEnchN(ENC_MAX), 4], 'enchanter');
[[1, 'm'], [2, 'm'], [3, 'd'], [4, 'd'], [5, 'd']].forEach(([n, t]) => achAdd('wmax' + n, 'gear', t, [`Coleção MAX ${n}`, `MAX Collection ${n}`], [`Tem ${n} ${n > 1 ? 'armas' : 'arma'} no máximo (3 estrelas)`, `Own ${n} ${n > 1 ? 'weapons' : 'weapon'} at max (3 stars)`], () => [Math.min(n, wMaxCount()), n], n === 5 ? 'armorer' : ''));
[[5, 'f'], [10, 'm'], [15, 'd'], [20, 'd']].forEach(([n, t]) => achAdd('anv' + n, 'gear', t, [`Ferreiro +${n}`, `Smith +${n}`], [`Leva uma arma a +${n} na Bigorna`, `Take a weapon to +${n} at the Anvil`], () => [Math.min(n, Math.max(0, ...Object.values(save.wl || {}).map(v => v | 0))), n], n === 20 ? 'smith' : ''));
achAdd('rar3', 'gear', 'm', ['Brilho Dourado', 'Golden Glow'], ['Obtém um item Lendário', 'Get a Legendary item'], () => [stat('rar') >= 3 ? 1 : 0, 1]);
achAdd('rar4', 'gear', 'd', ['Sorte Absoluta', 'Absolute Luck'], ['Obtém um item Mítico', 'Get a Mythic item'], () => [stat('rar') >= 4 ? 1 : 0, 1], 'lucky');
[[1, 'f'], [10, 'm'], [50, 'd']].forEach(([n, t]) => achAdd('fuse' + n, 'gear', t, [`Fundidor ${n}`, `Fuser ${n}`], [`Funde equipamento ${n} ${n > 1 ? 'vezes' : 'vez'}`, `Fuse gear ${n} ${n > 1 ? 'times' : 'time'}`], () => [Math.min(n, stat('fuses')), n]));
const achSt = a => (save.ach && save.ach[a.id]) | 0;   // 0 em curso, 1 concluida por receber, 2 recebida
const achReady = () => save && save.ach ? ACH.filter(a => save.ach[a.id] === 1).length : 0;
const titleName = id => TITLES[id] ? T2(TITLES[id][0], TITLES[id][1]) : '';
const titleOwned = id => ACH.some(a => a.title === id && achSt(a) === 2) || (id === 'beta' && !!(save && save.codes && save.codes.beta));

// efeitos nas palavras dos titulos: os mais raros brilham, ardem ou mudam de cor (so desenho)
const TITLE_FX = {
  emperor: { k: 'rainbow' }, abyss5: { k: 'void' }, astro: { k: 'fire' }, lodestar: { k: 'shine', c: '#6ac8ff' }, beta: { k: 'rainbow' }, legend: { k: 'rainbow' }, immortal: { k: 'rainbow' }, lucky: { k: 'rainbow' },
  inferno: { k: 'fire' }, smith: { k: 'fire' }, nightmare: { k: 'void' }, slayer: { k: 'void' }, reaper: { k: 'void' }, lord5: { k: 'void' },
  lord0: { k: 'shine', c: '#7ae05a' }, lord1: { k: 'shine', c: '#6ac8ff' }, lord2: { k: 'shine', c: '#ff6a6a' }, lord3: { k: 'shine', c: '#b8e04a' }, lord4: { k: 'shine', c: '#f0d070' },
  treasure: { k: 'shine', c: '#ffd34a' }, tycoon: { k: 'shine', c: '#ffd34a' }, tireless: { k: 'shine', c: '#ffd34a' }, enchanter: { k: 'shine', c: '#b890ff' }, armorer: { k: 'shine', c: '#cfd8e8' }, dandy: { k: 'shine', c: '#ff9ad0' },
};
const TFW = {};
function drawTitle(str, x, y, size, id, al = 'left') {
  const f = TITLE_FX[id];
  if (!f) { txt(str, x, y, size, '#ffd34a', al, 'bold'); return; }
  const key = size + '|' + str; let ws = TFW[key]; if (!ws) { ws = TFW[key] = [...str].map(ch => txtW(ch, size, 'bold')); }
  const tot = ws.reduce((a, b) => a + b, 0), sx = al === 'center' ? x - tot / 2 : al === 'right' ? x - tot : x, chars = [...str]; let cx = sx;
  const sweep = ((T * .7) % 1.7) * (tot + 40) - 20;
  chars.forEach((ch, i) => {
    let col, yy = y;
    if (f.k === 'rainbow') { col = `hsl(${(T * 110 + i * 26) % 360},95%,64%)`; yy = y + Math.sin(T * 5 + i * .8) * 1.1; }
    else if (f.k === 'fire') { col = `hsl(${10 + 26 * (.5 + .5 * Math.sin(T * 7 + i * .9))},100%,${56 + 9 * Math.sin(T * 11 + i * 1.3)}%)`; yy = y - Math.max(0, Math.sin(T * 9 + i * 1.7)) * .9; }
    else if (f.k === 'void') col = `hsl(${272 + 34 * Math.sin(T * 2 + i * .5)},88%,${58 + 16 * Math.sin(T * 4 + i * .7)}%)`;
    else { const dd = Math.abs(cx - sx + ws[i] / 2 - sweep); col = dd < 16 ? mixC(f.c, '#ffffff', 1 - dd / 16) : f.c; }
    if (ch !== ' ') txt(ch, cx, yy, size, col, 'left', 'bold'); cx += ws[i];
  });
  if (f.k === 'rainbow' || f.k === 'fire') {   // faiscas
    const q = Math.floor(T * 5), h1 = Math.abs(Math.sin(q * 12.9898)) , h2 = Math.abs(Math.sin(q * 78.233)); ctx.fillStyle = f.k === 'fire' ? '#ffe08a' : '#ffffff'; ctx.globalAlpha = .5 + .5 * Math.sin(T * 20); ctx.fillRect(Math.round(sx + h1 * tot), Math.round(y - size * .95 - h2 * 3), 2, 2); ctx.globalAlpha = 1;
  }
}
function setTitle(id) { save.title = id; persist(); SFX.click(); if (on.token) { rk.at = {}; onlineSubmit(); } }   // o titulo vai na build publica: aparece no ranking e no perfil dos outros
function checkAch() {
  if (!save) return; save.ach = save.ach || {}; const fresh = [];
  for (const a of ACH) if (!save.ach[a.id]) { const [x, y] = a.prog(); if (x >= y) { save.ach[a.id] = 1; fresh.push(a); } }
  if (!fresh.length) return;
  hubToast = { t: 3.5, s: fresh.length === 1 ? T2('Conquista concluída: ', 'Achievement complete: ') + T2(...fresh[0].name) : T2(`${fresh.length} conquistas concluídas!`, `${fresh.length} achievements complete!`), col: '#ffd34a' }; SFX.unlock(); persist();
}
function achClaim(a) {
  if (achSt(a) !== 1) return; save.ach[a.id] = 2; save.gems += a.gems; if (a.title && !save.title) save.title = a.title;
  hubToast = { t: 2.6, s: `+${a.gems} ◆` + (a.title ? T2(' · Novo título: ', ' · New title: ') + titleName(a.title) : ''), col: '#7fe8ff' }; SFX.buy(); persist();
}
let achCat = 'all', achPage = 0, codeMsg = { s: '', col: '#9ab' }, codeBusy = false;
async function redeemCode() {   // codigos promocionais: validados no servidor e so se usam uma vez por CONTA
  const c = (rk.code || '').trim().toLowerCase(); rk.focus = ''; if (!c || codeBusy) return;
  if (!on.token) { codeMsg = { s: T2('Inicia sessão para usar códigos.', 'Log in to use codes.'), col: '#f88' }; SFX.error(); return; }
  codeBusy = true; codeMsg = { s: T2('A verificar...', 'Checking...'), col: '#9ab' }; const r = await rpc('gog_redeem', { p_token: on.token, p_code: c }); codeBusy = false;
  if (r && r.ok) {
    save.codes = save.codes || {}; save.codes[c] = 1; save.gems += r.gems | 0; if (r.title && TITLES[r.title] && !save.title) save.title = r.title; rk.code = '';
    codeMsg = { s: T2(`Código aceite: +${r.gems | 0} ◆` + (r.title && TITLES[r.title] ? ' · título ' + titleName(r.title) : ''), `Code accepted: +${r.gems | 0} ◆` + (r.title && TITLES[r.title] ? ' · title ' + titleName(r.title) : '')), col: '#6f6' }; hubToast = { t: 2.6, s: `+${r.gems | 0} ◆`, col: '#7fe8ff' }; SFX.buy(); persist();
  } else {
    const e = r && r.error; codeMsg = { s: e === 'used' ? T2('Este código já foi usado nesta conta.', 'This code was already used on this account.') : e === 'bad_code' ? T2('Código inválido.', 'Invalid code.') : e === 'auth' ? T2('Sessão expirada. Entra outra vez.', 'Session expired. Log in again.') : T2('Não foi possível verificar o código.', 'Could not check the code.'), col: '#f88' }; SFX.error();
  }
}
function hubAch() {
  if (!save) return;
  const cats = [['all', 'Todas', 'All'], ['combat', 'Combate', 'Combat'], ['prog', 'Progresso', 'Progress'], ['farm', 'Campanha', 'Campaign'], ['raid', 'Raids', 'Raids'], ['gear', 'Equipamento', 'Gear'], ['titles', 'Títulos', 'Titles']];
  cats.forEach(([k, pt, en], i) => btn(197 + i * 84, 113, 80, 22, T2(pt, en), () => { achCat = k; achPage = 0; }, { size: 11, col: achCat === k ? '#a8821f' : '#2a2a48', hot: '#c9a030' }));
  const done = ACH.filter(a => achSt(a) > 0).length, ready = achReady();
  if (achCat === 'titles') {
    const own = Object.keys(TITLES).filter(titleOwned).length; txt(T2(`${own} / ${Object.keys(TITLES).length} títulos`, `${own} / ${Object.keys(TITLES).length} titles`), 197, 160, 13, '#9ab', 'left', 'bold');
    btn(650, 146, 130, 24, T2('Sem título', 'No title'), () => setTitle(''), { size: 12, col: save.title ? '#4a3a3a' : '#2a2a48', off: !save.title });
    Object.keys(TITLES).forEach((id, i) => {
      const x = 197 + (i % 4) * 147, y = 172 + Math.floor(i / 4) * 36, own = titleOwned(id), eq = save.title === id, a = ACH.find(q => q.title === id);
      const fit = (str, sz, mw, wt) => { let f = sz; while (f > 8 && txtW(str, f, wt) > mw) f--; return f; }, nm = titleName(id);
      if (own) { btn(x, y, 141, 32, '', () => setTitle(eq ? '' : id), { col: eq ? '#a8821f' : '#222240', hot: '#3a3a60' }); drawTitle(nm, x + 70, y + 21, fit(nm, 12, 130, 'bold'), id, 'center'); }
      else { bevel(x, y, 141, 32, '#0e0e18', '#26263a', '#05050a'); txt(nm, x + 70, y + 14, fit(nm, 11, 130, 'bold'), '#667', 'center', 'bold'); { let q = L(a ? T2(...a.name) : T2('Código especial', 'Special code')); while (q.length > 6 && txtW(q, 9) > 132) q = q.slice(0, -2) + '…'; txt(q, x + 70, y + 26, 9, '#556', 'center'); } }
    });
    rkField(197, 450, 200, T2('Código promocional', 'Promo code'), 'code', false); btn(405, 450, 110, 28, T2('Resgatar', 'Redeem'), redeemCode, { size: 13, col: '#2f7a4a', hot: '#3fa061' });
    if (codeMsg.s) txt(codeMsg.s, 524, 469, 11, codeMsg.col);
    return;
  }
  txt(T2(`${done} / ${ACH.length} concluídas`, `${done} / ${ACH.length} complete`) + (ready ? T2(` · ${ready} por receber`, ` · ${ready} to claim`) : ''), 197, 160, 13, ready ? '#ffd34a' : '#9ab', 'left', 'bold');
  btn(650, 146, 130, 24, T2('Receber tudo', 'Claim all'), () => { let g = 0, n = 0; for (const a of ACH) if (achSt(a) === 1) { save.ach[a.id] = 2; g += a.gems; n++; if (a.title && !save.title) save.title = a.title; } if (n) { save.gems += g; hubToast = { t: 2.6, s: `+${g} ◆`, col: '#7fe8ff' }; SFX.buy(); persist(); } }, { size: 12, col: ready ? '#2f7a4a' : '#2a2a48', hot: '#3fa061', off: !ready });
  const rnk = a => { const s = achSt(a); return s === 1 ? 0 : s === 0 ? 1 : 2; };
  const list = ACH.filter(a => achCat === 'all' || a.cat === achCat).map((a, i) => [a, i]).sort((u, v) => rnk(u[0]) - rnk(v[0]) || u[1] - v[1]).map(u => u[0]);
  const per = 5, pages = Math.max(1, Math.ceil(list.length / per)); achPage = Math.max(0, Math.min(pages - 1, achPage));
  list.slice(achPage * per, achPage * per + per).forEach((a, i) => {
    const x = 197, y = 176 + i * 54, w = 583, h = 50, st = achSt(a), [p, g] = a.prog();
    bevel(x, y, w, h, st === 1 ? '#2c2410' : st === 2 ? '#13231a' : '#12121f', st === 1 ? '#d8b030' : st === 2 ? '#2f6a44' : '#33334a', '#05050a');
    ctx.fillStyle = '#0c0c18'; ctx.fillRect(x + 8, y + 8, 50, 34); txt('◆' + a.gems, x + 33, y + 31, 14, st === 2 ? '#4a7a88' : '#7fe8ff', 'center', 'bold');
    const nm = T2(...a.name); txt(nm, x + 68, y + 21, 14, st === 2 ? '#9ab' : '#fff', 'left', 'bold');
    if (a.title) drawTitle('★ ' + titleName(a.title), x + 68 + txtW(nm, 14, 'bold') + 8, y + 21, 11, a.title);
    txt(T2(...a.desc), x + 68, y + 39, 11, '#9ab');
    bar(x + 380, y + 14, 90, 8, g ? Math.min(1, p / g) : 0, st ? '#4cc46a' : '#ffd34a'); txt(`${gfmt(p)} / ${gfmt(g)}`, x + 425, y + 38, 11, '#9ab', 'center');
    if (st === 1) btn(x + w - 100, y + 9, 92, 32, T2('Receber', 'Claim'), () => achClaim(a), { size: 13, col: '#2f7a4a', hot: '#3fa061' });
    else if (st === 2) txt('✓', x + w - 54, y + 33, 22, '#6f6', 'center', 'bold');
  });
  btn(197, 452, 60, 24, '<', () => { achPage = Math.max(0, achPage - 1); }, { size: 14, off: achPage === 0 });
  txt(`${achPage + 1} / ${pages}`, 487, 470, 13, '#9ab', 'center', 'bold');
  btn(720, 452, 60, 24, '>', () => { achPage = Math.min(pages - 1, achPage + 1); }, { size: 14, off: achPage >= pages - 1 });
}

/* ----- Recompensas: um baú por nível ----- */
const CHEST_BASE = ['gggggggggggg', 'mMMMMggMMMMm', 'mMMMMggMMMMm', 'mMMMMMMMMMMm', 'mmmmmmmmmmmm'];
const CHEST_LID = ['..mmmmmmmm..', '.mMMMMMMMMm.', 'mMMMMMMMMMMm'];
const CHEST_SPR = [{ m: '#6b4a22', M: '#a06a30', g: '#f5c542' }, { m: '#a8821f', M: '#f5c542', g: '#fff2a8' }].map(pal => ({ base: makeSprite(CHEST_BASE, pal, 1, false), lid: makeSprite(CHEST_LID, pal, 1, false) }));
let chestAnim = 0, lastRw = null;
function openChests(n) {
  const rw = { gold: 0, pts: 0, gems: 0, items: [], wpn: {}, n: 0, sold: 0 };
  for (let i = 0; i < n && save.chestDone < save.pl.lv; i++) {
    const L = ++save.chestDone, g5 = L % 10 === 0;
    rw.gold += Math.round((60 + 30 * L) * (.8 + Math.random() * .6) * (g5 ? 5 : 1));
    if (Math.random() < (g5 ? 1 : .45)) rw.pts += g5 ? 3 : (Math.random() < .3 ? 2 : 1);
    if (g5 || Math.random() < .18) { const it = genLoot(rollRarity(Math.floor(L / 8), g5 ? 2 : 0), Math.min(120, 1 + Math.floor(L * .8))); if (addBag(it)) rw.items.push(it); else rw.sold += sellValue(it); }
    if (g5 || Math.random() < .15) { const ok = CLASSES[save.cls].weapons.map((w, k) => k).filter(k => weaponReq(k).ok), wi = ok[Math.floor(Math.random() * ok.length)], id = CLASSES[save.cls].weapons[wi].id; save.wst[id][0]++; save.own[save.cls][wi] = 1; rw.wpn[id] = (rw.wpn[id] || 0) + 1; }
    if (Math.random() < (g5 ? .5 : .06)) rw.gems += g5 ? 5 : 2;
    rw.n++;
  }
  save.gold = Math.min(GOLD_MAX, save.gold + rw.gold + rw.sold); save.pts += rw.pts; save.gems += rw.gems; lastRw = rw; chestAnim = 3.2; chestPops = 0; SFX.buy(); persist();
}
let chestPops = 0;
function rewardTokens(r) {
  const t = [];
  if (r.gold) t.push({ txt: '¢' + gfmt(r.gold), col: '#fd5', r: 0, icon: (x, y) => drawIcon('coin', x, y, 1.2) });
  if (r.pts) t.push({ txt: lang === 'en' ? `+${r.pts} points` : `+${r.pts} pontos`, col: '#9fe', r: 0 });
  if (r.gems) t.push({ txt: '◆ ' + r.gems, col: '#7fe8ff', r: 1 });
  for (const id in r.wpn) { const w = CLASSES[save.cls].weapons.find(q => q.id === id); t.push({ txt: `${L(w.n)} ×${r.wpn[id]}`, col: '#ffd34a', r: 2, icon: (x, y) => weaponIcon(id, x, y, .9) }); }
  r.items.slice().sort((a, b) => a.r - b.r).forEach(it => t.push({ txt: L(it.slot === 'ring' ? itemName(it) : ITEM_NAMES[it.slot][it.r]), col: RAR[it.r][1], r: it.r, icon: (x, y) => itemIcon(it, x, y, 1.4) }));
  return t;
}
function hubRewards() {
  const avail = Math.max(0, save.pl.lv - save.chestDone), next = save.chestDone + 1, g5 = next % 10 === 0, sp = CHEST_SPR[g5 ? 1 : 0];
  txt(g5 ? `Baú dourado: nível ${next}` : `Baú do nível ${next}`, 350, 128, 16, g5 ? '#ffd34a' : '#fff', 'center', 'bold');
  const k = 7, bx = 350 - 6 * k, by = 252, el = chestAnim > 0 ? 3.2 - chestAnim : 9, open = chestAnim > 0 ? Math.max(0, Math.min(1, (el - .5) * 3, chestAnim * 1.2)) : 0, pop = (el - .95) / .28;
  const best = lastRw ? Math.max(-1, ...lastRw.items.map(i => i.r), lastRw.gems ? 1 : -1) : -1, rc = best >= 0 ? RAR[Math.min(4, best)][1] : '#ffd34a';
  if (open > 0 && el < 8) { ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(350, by, 5, 350, by, 150); gr.addColorStop(0, `rgba(255,220,120,${.55 * open})`); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.fillRect(200, by - 150, 300, 300);
    ctx.fillStyle = rc; for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i - 6.5) * .16, L = (60 + 70 * rn(i + 3)) * open * Math.max(0, 1 - (el - .6) / 2.6); ctx.globalAlpha = .35 * open; ctx.save(); ctx.translate(350, by + 6); ctx.rotate(a + Math.PI / 2); ctx.fillRect(-2, -L, 4, L); ctx.restore(); }
    for (let i = 0; i < 26; i++) { const t = ((el - .6) * .6 + rn(i) * 3) % 1.4, x = 350 + (rn(i + 9) - .5) * 140 * t, y = by - 20 - t * 120 + 80 * t * t; ctx.globalAlpha = Math.max(0, 1 - t / 1.4); ctx.fillRect(Math.round(x), Math.round(y), 3, 3); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const sh = !avail && el > 3 ? 0 : (el < .5 ? Math.sin(T * 55) * (2 + el * 5) : !avail ? 0 : Math.sin(T * 8) * 1.5);
  ctx.drawImage(sp.base, bx + sh, by, 12 * k, 5 * k);
  ctx.save(); ctx.translate(bx + sh, by); ctx.rotate(-open * 1.15); ctx.drawImage(sp.lid, 0, -3 * k, 12 * k, 3 * k); ctx.restore();
  // recompensas a saltar do bau, uma a uma
  if (lastRw && chestAnim > -1 && el < 7.5) {
    const toks = rewardTokens(lastRw), shown = toks.slice(-6), n = shown.length, fade = chestAnim > 0 ? 1 : 0;
    if (pop >= 0) { const cnt = Math.min(n, Math.floor(pop) + 1); if (cnt > chestPops) { for (let q = chestPops; q < cnt; q++) { const tk = shown[q]; tk && tk.r >= 3 ? SFX.special() : SFX.heal(); } chestPops = cnt; } }
    shown.forEach((tk, i) => {
      const t = Math.max(0, Math.min(1, pop - i)); if (t <= 0) return; const e = 1 - Math.pow(1 - t, 3), cols = 2, cx = 350 + ((i % cols) - .5) * 136, rowY = 142 + Math.floor(i / cols) * 34, yy = by + 10 + (rowY - by - 10) * e;
      ctx.globalAlpha = Math.min(1, t * 2) * (el > 3.2 ? Math.max(0, 1 - (el - 3.2) * 2) : 1); bevel(cx - 62, yy - 14, 124, 28, '#12121f', tk.col, '#05050a'); if (tk.icon) tk.icon(cx - 48, yy); { let fs = 12; while (fs > 8 && txtW(tk.txt, fs, 'bold') > 82) fs--; txt(tk.txt, cx - 34, yy + 5, fs, tk.col, 'left', 'bold'); } ctx.globalAlpha = 1;
    });
    if (best >= 3 && pop > n - 1 && el < 4.2) { ctx.globalAlpha = .6 + .4 * Math.sin(T * 10); txt(best >= 4 ? 'ITEM MÍTICO!' : 'ITEM LENDÁRIO!', 350, 134, 18, RAR[best][1], 'center', 'bold'); ctx.globalAlpha = 1; }
  }
  txt(avail ? `${avail} baús por abrir` : 'Sem baús por abrir', 350, 322, 18, avail ? '#ffd34a' : '#778', 'center', 'bold');
  btn(235, 340, 230, 36, 'Abrir baú', () => openChests(1), { off: !avail, size: 17, col: '#a06a20', hot: '#c98a30' });
  btn(235, 384, 230, 34, 'Abrir todos (25)', () => openChests(25), { off: avail < 2, size: 15, col: '#2f7a4a', hot: '#3fa061' });
  txt(avail ? `Próximo baú dourado: nível ${next + (10 - next % 10) % 10}` : 'Sobe de nível para ganhares mais baús.', 350, 446, 13, '#9ab', 'center');
  panel(520, 118, 262, 358, '#16162a'); txt('Última abertura', 651, 144, 16, '#f0c060', 'center', 'bold');
  if (!lastRw) { txt('Ainda não abriste nenhum baú.', 651, 270, 13, '#667', 'center'); return; }
  const r = lastRw; let y = 172; txt(`${r.n} baú(s)`, 534, y, 13, '#9ab'); y += 24;
  txt('¢' + gfmt(r.gold) + (r.sold ? ` (+${gfmt(r.sold)} ${lang === 'en' ? 'sales' : 'vendas'})` : ''), 534, y, 16, '#fd5', 'left', 'bold'); y += 22;
  if (r.pts) { txt(`+${r.pts} pontos de atributo`, 534, y, 14, '#9fe', 'left', 'bold'); y += 20; }
  if (r.gems) { txt('◆+' + r.gems, 534, y, 16, '#7fe8ff', 'left', 'bold'); y += 22; }
  for (const id in r.wpn) { const w = CLASSES[save.cls].weapons.find(q => q.id === id); weaponIcon(id, 546, y - 4, 1.2); txt(`${w.n} ×${r.wpn[id]}`, 566, y, 13, '#ffd34a'); y += 22; }
  r.items.slice(0, 6).forEach(it => { itemIcon(it, 546, y - 4, 1.6); txt(itemName(it), 566, y, 13, RAR[it.r][1], 'left', 'bold'); y += 22; });
  if (r.items.length > 6) txt(`+${r.items.length - 6} ${lang === 'en' ? 'items' : 'itens'}`, 534, y, 12, '#889');
}

