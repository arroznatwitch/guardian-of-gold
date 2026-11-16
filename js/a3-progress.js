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

/* ----- Recompensas: premios FIXOS por nivel (sem baus, sem sorte; ao estilo de um passe de batalha) ----- */
// cada nivel tem sempre o mesmo premio. Itens e armas ficam sempre do nivel/raridade do premio (um item do nivel 5 e nivel 5, mesmo que ja sejas nivel 65).
const RW_SLOTS = ['head', 'chest', 'boots', 'amulet'];
function levelReward(L) {
  const r = { gold: Math.round(100 + 45 * L + 2 * L * L / 5), pts: 0, gems: 0, stone: null, item: null, wpn: -1 };
  if (L % 2 === 0) r.pts = 1; if (L % 5 === 0) r.pts = 2; if (L % 10 === 0) r.pts = 4;
  if (L % 5 === 0) r.gems = 5; if (L % 10 === 0) r.gems = 15;
  if (L % 4 === 0) r.stone = { r: Math.min(4, Math.floor(L / 25)), n: L % 20 === 0 ? 2 : 1 };
  if (L % 5 === 0) r.item = { slot: RW_SLOTS[(L / 5 - 1) % 4], r: Math.min(4, Math.floor(L / 20) + (L % 10 === 0 ? 1 : 0)), il: Math.min(120, L) };
  if (L % 10 === 5) r.wpn = Math.min(4, Math.floor(L / 15));
  return r;
}
let chestAnim = 0, lastRw = null, rwPage = -1;   // chestAnim: so para o ciclo principal nao falhar
const RW_PER = 6, rwAvail = () => Math.max(0, Math.min(MAXLV, save.pl.lv) - save.chestDone);
const rwWeaponIdx = tier => { const c = CLASSES[save.cls]; for (let i = Math.min(tier, c.weapons.length - 1); i >= 0; i--) if (save.own[save.cls][i]) return i; return 0; };   // so copias de armas que ja tens
function claimRewards(upTo) {   // resgata, por ordem, os premios ate ao nivel pedido (cada nivel so se resgata uma vez)
  const rw = { gold: 0, pts: 0, gems: 0, items: [], wpn: {}, stones: [0, 0, 0, 0, 0], n: 0, sold: 0, from: save.chestDone + 1, to: save.chestDone };
  while (save.chestDone < Math.min(MAXLV, save.pl.lv) && save.chestDone < upTo) {
    const L = ++save.chestDone, d = levelReward(L); rw.to = L;
    rw.gold += d.gold; rw.pts += d.pts; rw.gems += d.gems;
    if (d.stone) { save.stones[d.stone.r] = (save.stones[d.stone.r] | 0) + d.stone.n; rw.stones[d.stone.r] += d.stone.n; }
    if (d.item) { const it = genItem(d.item.slot, d.item.r, d.item.il); if (addBag(it)) rw.items.push(it); else rw.sold += sellValue(it); }
    if (d.wpn >= 0) { const wi = rwWeaponIdx(d.wpn), id = CLASSES[save.cls].weapons[wi].id; save.wst[id][0]++; rw.wpn[id] = (rw.wpn[id] || 0) + 1; }
    rw.n++;
  }
  if (!rw.n) return;
  save.gold = Math.min(GOLD_MAX, save.gold + rw.gold + rw.sold); save.pts += rw.pts; save.gems += rw.gems; lastRw = rw; SFX.buy(); persist();
}
// linhas do premio de um nivel (texto curto, para a lista)
function rewardLines(d) {
  const t = [{ txt: '¢' + gfmt(d.gold), col: '#fd5' }];
  if (d.pts) t.push({ txt: `+${d.pts} ${T2('pts', 'pts')}`, col: '#9fe' });
  if (d.gems) t.push({ txt: '◆' + d.gems, col: '#7fe8ff' });
  if (d.stone) t.push({ txt: `${d.stone.n}× ${T2('Pedra', 'Stone')} ${L(RAR[d.stone.r][0])}`, col: RAR[d.stone.r][1], ico: STONE_SPR[d.stone.r] });
  if (d.item) t.push({ txt: `${L(ITEM_NAMES[d.item.slot][d.item.r])} ${T2('Nv', 'Lv')}${d.item.il}`, col: RAR[d.item.r][1] });
  if (d.wpn >= 0) { const w = CLASSES[save.cls].weapons[rwWeaponIdx(d.wpn)]; t.push({ txt: `${T2('Cópia', 'Copy')}: ${L(w.n)}`, col: '#ffd34a' }); }
  return t;
}
function hubRewards() {
  const avail = rwAvail(), first = save.chestDone + 1; rwPage = Math.min(rwPage, Math.ceil(MAXLV / RW_PER) - 1); if (rwPage < 0) rwPage = Math.floor((first - 1) / RW_PER);
  const p0 = rwPage * RW_PER + 1, X = 200, WD = 582;
  txt(T2('Recompensas por nível', 'Level rewards'), 490, 120, 18, '#ffd34a', 'center', 'bold');
  txt(avail ? T2(`${avail} por resgatar`, `${avail} to claim`) : T2('Sobe de nível para desbloqueares a próxima', 'Level up to unlock the next one'), 490, 140, 12, avail ? '#9fe' : '#9ab', 'center', 'bold');
  for (let i = 0; i < RW_PER; i++) {
    const Lv = p0 + i; if (Lv > MAXLV) break; const d = levelReward(Lv), done = Lv <= save.chestDone, can = !done && Lv <= save.pl.lv, big = Lv % 10 === 0, y = 150 + i * 46;
    bevel(X, y, WD, 42, done ? '#162216' : can ? '#2a2412' : '#12121f', done ? '#4a8a4a' : can ? '#f0c060' : big ? '#a8821f' : '#2a2a3a', '#05050a');
    txt(`${T2('Nível', 'Level')} ${Lv}`, X + 12, y + 26, 14, done ? '#7a7' : can ? '#ffd34a' : '#9ab', 'left', 'bold');
    let x = X + 100; ctx.globalAlpha = done ? .5 : 1;
    rewardLines(d).forEach(t => { if (t.ico) { ctx.drawImage(t.ico, x, y + 14, 16, 16); x += 18; } txt(t.txt, x, y + 26, 10, t.col, 'left', 'bold'); x += txtW(t.txt, 10, 'bold') + 12; });
    ctx.globalAlpha = 1;
    if (done) txt('✔ ' + T2('Recebido', 'Claimed'), X + WD - 14, y + 26, 12, '#7a7', 'right', 'bold');
    else btn(X + WD - 104, y + 6, 94, 30, can ? T2('Resgatar', 'Claim') : T2('Bloqueado', 'Locked'), () => claimRewards(Lv), { off: !can, size: 13, col: '#a06a20', hot: '#c98a30' });
  }
  btn(X, 430, 50, 28, '<', () => { rwPage = Math.max(0, rwPage - 1); }, { off: rwPage === 0, size: 14 });
  btn(X + WD - 50, 430, 50, 28, '>', () => { rwPage++; }, { off: p0 + RW_PER > MAXLV, size: 14 });
  btn(X + WD / 2 - 90, 430, 180, 28, T2('Resgatar tudo', 'Claim all'), () => { claimRewards(1e9); rwPage = Math.floor(save.chestDone / RW_PER); }, { off: !avail, size: 13, col: '#2f7a4a', hot: '#3fa061' });
  if (lastRw) { const r = lastRw, p = [`${r.from === r.to ? T2('Nível', 'Level') + ' ' + r.to : T2('Níveis', 'Levels') + ' ' + r.from + '-' + r.to}:`, '¢' + gfmt(r.gold)]; if (r.pts) p.push(`+${r.pts} pts`); if (r.gems) p.push('◆' + r.gems); r.stones.forEach((n, q) => { if (n) p.push(`${n}× ${L(RAR[q][0])}`); }); const nw = Object.values(r.wpn).reduce((a, b) => a + b, 0); if (nw) p.push(`${nw} ${T2('cópia(s)', 'copy(ies)')}`); if (r.items.length) p.push(`${r.items.length} ${lang === 'en' ? 'item(s)' : 'item(ns)'}`); txt(T2('Último resgate', 'Last claim') + ' · ' + p.join('  '), 490, 472, 11, '#9ab', 'center'); }
}
