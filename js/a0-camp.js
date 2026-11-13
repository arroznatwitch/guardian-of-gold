'use strict';
/* =====================================================================
   ACAMPAMENTO
   ===================================================================== */
let slotHover = null, bagSel = -1, bagFilter = 'all', enchItem = null;
let enc = { t: 0, res: null, msg: '', msgT: 0, col: '#fff', sparks: [] };
function drawHub() {
  menuBg(); const c = CLASSES[save.cls], L = save.pl.lv;
  panel(10, 8, 780, 60, '#17172a'); drawSprBig(heroSpr(), 42, 40, 1.3);
  { const hv = mouse.x - UIOX >= 14 && mouse.x - UIOX <= 76 && mouse.y >= 12 && mouse.y <= 64; if (on.token) { ui.push({ x: 14, y: 12, w: 62, h: 52, fn: () => { tab = 'profile'; chList = null; editProf = null; } }); if (hv) { ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 2; ctx.strokeRect(14, 12, 62, 52); } ctx.fillStyle = '#05050a'; ctx.fillRect(61, 13, 15, 15); ctx.fillStyle = hv ? '#ffd34a' : '#3a3a5a'; ctx.fillRect(62, 14, 13, 13); ctx.fillStyle = hv ? '#3a2a08' : '#fff'; ctx.fillRect(70, 16, 3, 3); ctx.fillRect(68, 18, 3, 3); ctx.fillRect(66, 20, 3, 3); ctx.fillRect(64, 22, 3, 3); ctx.fillRect(64, 24, 2, 2); } }
  const pn = on && on.nick ? on.nick : c.name;   // no menu aparece o nome do jogador
  txt(pn, 94, 30, 20, '#fff', 'left', 'bold'); txt(`Nv ${L}`, 94 + txtW(pn, 20, 'bold') + 12, 29, 15, '#6cf', 'left', 'bold'); if (on.token) drawFlag(on.country || 'ZZ', 94 + txtW(pn, 20, 'bold') + 12 + txtW(`Nv ${L}`, 15, 'bold') + 10, 17, 20, 13); if (gld.info) txt('[' + gld.info.tag + ']', 94 + txtW(pn, 20, 'bold') + 12 + txtW(`Nv ${L}`, 15, 'bold') + 38, 29, 12, '#8ab', 'left', 'bold');
  if (save.title && TITLES[save.title]) drawTitle('« ' + titleName(save.title) + ' »', 94 + txtW(L >= MAXLV ? 'MAX' : `${save.pl.xp}/${xpNeed(L)} XP`, 11) + 14, 61, 11, save.title);
  bar(94, 38, 170, 8, L >= MAXLV ? 1 : save.pl.xp / xpNeed(L), '#6cf'); txt(L >= MAXLV ? 'MAX' : `${save.pl.xp}/${xpNeed(L)} XP`, 94, 61, 11, '#8ab');
  txt('ACAMPAMENTO', UW / 2, 46, 26, '#f0c060', 'center', 'bold');
  { const gs = gfmt(save.gold), ms = String(save.gems), x0 = 770 - 22 - Math.max(txtW(gs, 22), txtW(ms, 18));   // moeda e diamante na mesma coluna, centrados na altura dos numeros
    ctx.drawImage(ICN.coin, x0, Math.round(34 - 22 * .34 - 9), 18, 18); txt(gs, x0 + 22, 34, 22, '#fd5', 'left', 'bold');
    ctx.drawImage(ICN.gem, x0, Math.round(58 - 18 * .34 - 9), 18, 18); txt(ms, x0 + 22, 58, 18, '#7fe8ff', 'left', 'bold'); }
  if (save.pts > 0) txt(`${save.pts} pontos por gastar`, 650, 28, 12, '#ffd34a', 'right', 'bold');
  const tabs = [['farm', 'Campanha'], ['raids', 'Raids'], ['char', 'Personagem'], ['bag', 'Mochila'], ['ench', 'Encantar'], ['weapons', 'Armas'], ['fuse', 'Fusão'], ['anvil', 'Bigorna'], ['pets', 'Pets'], ['guild', 'Guilda'], ['rank', 'Ranking'], ['options', 'Opções']];
  tabs.forEach((t, i) => {
    const by = 76 + i * 29;
    if (t[0] === 'options') { btn(20, by, 150, 26, t[1], () => { rk.focus = ''; optBack = 'hub'; state = 'options'; }, { col: '#2a2a48', hot: '#d2a73a', size: 13 }); return; }
    btn(20, by, 150, 26, t[1], () => { rk.focus = ''; tab = t[0]; if (tab === 'rank') { rkLoad(false); autoSync(); } if (!tabOpen(t[0])) lockClick(t[0]); if (tab === 'anvil') anvSel = save.eq[save.cls]; if (tab === 'fuse') fuseSel = save.eq[save.cls]; }, { col: tab === t[0] ? '#a8821f' : '#2a2a48', hot: '#d2a73a', size: 13 });
    if (!tabOpen(t[0])) drawIcon('lock', 36, by + 13, 1.3);
    if (t[0] === 'char' && save.pts > 0) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(152, by + 5, 12, 14); txt('!', 158, by + 16, 11, '#000', 'center', 'bold'); }
  });
  if (on.token && (save.pl.lv > save.chestDone || achReady() > 0)) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(14, 54, 14, 14); txt('!', 21, 65, 11, '#000', 'center', 'bold'); }   // aviso no retrato: ha baus por abrir no Perfil
  btn(20, 442, 150, 34, '< Menu', () => state = 'menu', { size: 14, col: '#3a2a3a' });
  panel(185, 80, 605, 405);
  if (!tabOpen(tab)) drawTabLock(tab); else ({ farm: hubFarm, raids: hubRaids, char: hubChar, bag: hubBag, ench: hubEnchant, weapons: hubWeapons, fuse: hubFuse, anvil: hubAnvil, profile: hubProfile, rewards: () => { profileTabs(); hubRewards(); }, ach: () => { profileTabs(); hubAch(); }, pets: hubPets, guild: hubGuild, rank: hubRank })[tab]();
}
let presAsk = -1;
function drawPresAsk() {   // confirmacao do prestigio
  if (state !== 'hub' || tab !== 'farm' || presAsk < 0 || !save) return;
  const i = presAsk, m = MISSIONS[i], P = save.pres[i] | 0, x = 170, y = 130, w = 460, h = 240;
  ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { presAsk = -1; } });
  panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  txt(`★ ${T2('Prestígio', 'Prestige')} ${P + 1}/${PRES_MAX} · ${m.name}`, x + w / 2, y + 34, 18, '#ffd34a', 'center', 'bold');
  wrap(T2(`O teu progresso de ondas desta zona volta a 0 e ganhas uma estrela. Os monstros ficam mais fortes (Nv recomendado ${farmRec(i, P)} → ${farmRec(i, P + 1)}) e dão mais ouro e XP; os itens que largam são de nível mais alto.`, `Your wave progress in this zone resets to 0 and you earn a star. Monsters get stronger (recommended level ${farmRec(i, P)} → ${farmRec(i, P + 1)}) and give more gold and XP; dropped items have a higher level.`), x + 24, y + 66, w - 48, 17, 13, '#cdd6f0');
  btn(x + 40, y + 170, 180, 40, T2('Confirmar', 'Confirm'), () => { save.pres[i] = P + 1; save.presW[i] = 0; presAsk = -1; hubToast = { t: 3.2, s: T2(`${m.name}: prestígio ${P + 1}!`, `${m.name}: prestige ${P + 1}!`), col: '#ffd34a' }; SFX.unlock(); persist(); checkAch(); }, { size: 15, col: '#2f7a4a', hot: '#3fa061' });
  btn(x + 240, y + 170, 180, 40, T2('Cancelar', 'Cancel'), () => { presAsk = -1; }, { size: 15, col: '#2a2a48' });
}
function hubFarm() {
  txt('Ondas infinitas · boss a cada 10, semi-boss a cada 5 · prestígio na onda 30', 420, 106, 13, '#aab', 'center');
  btn(684, 90, 96, 22, `Velocidade: x${gameSpeed}`, toggleSpeed, { size: 11, col: gameSpeed === 2 ? '#a06a20' : '#2a2a48' });
  MISSIONS.forEach((m, i) => {
    const x = 195, y = 118 + i * 60, w = 585, h = 54, open = i === 0 || (save.farmBest[i - 1] || 0) >= FARM_UNLOCK[i - 1], best = save.farmBest[i] || 0, P = save.pres[i] | 0, rec = farmRec(i, P), pw = save.presW[i] | 0, canP = open && P < PRES_MAX && pw >= PRES_WAVE;
    panel(x, y, w, h, open ? '#232342' : '#1a1a22', open ? (P >= PRES_MAX ? '#a8821f' : '#4a4a7a') : '#2a2a3a');
    ctx.fillStyle = THEMES[m.theme].bg; ctx.fillRect(x + 6, y + 6, 42, 42); drawSprBig(m.boss.pal, x + 27, y + 27, .52); if (!open) drawIcon('lock', x + 27, y + 27, 2);
    txt(m.name, x + 58, y + 22, 18, open ? '#fff' : '#667', 'left', 'bold');
    if (open) for (let q = 0; q < PRES_MAX; q++) { ctx.globalAlpha = q < P ? 1 : .2; drawIcon('star', x + 58 + txtW(m.name, 18, 'bold') + 14 + q * 12, y + 15, 1.2); ctx.globalAlpha = 1; }
    { const sub = open ? `Melhor onda: ${best} · Nv rec. ${rec}` : `Chega à onda ${FARM_UNLOCK[i - 1]} na zona anterior`; txt(sub, x + 58, y + 42, 12, open ? '#9cf' : '#a77'); const xk = xpK(save.pl.lv, rec); if (open && xk < 1) txt(`· XP ${Math.round(xk * 100)}%`, x + 58 + txtW(sub, 12) + 8, y + 42, 12, '#f88', 'left', 'bold'); }
    if (open && P < PRES_MAX) { const px = x + w - 266; btn(px, y + 9, 112, 36, '', () => { if (canP) presAsk = i; else { SFX.error(); hubToast = { t: 2.8, s: T2(`Chega à onda ${PRES_WAVE} neste prestígio para subir (agora: ${pw})`, `Reach wave ${PRES_WAVE} in this prestige to rank up (now: ${pw})`), col: '#f88' }; } }, { col: canP ? '#a06a20' : '#2d2d3a', hot: canP ? '#c98a30' : '#3a3a4a' }); txt('★ ' + T2('Prestígio', 'Prestige'), px + 56, y + 25, 12, canP ? '#fff' : '#889', 'center', 'bold'); txt(canP ? T2('Disponível!', 'Available!') : `${Math.min(pw, PRES_WAVE)} / ${PRES_WAVE}`, px + 56, y + 39, 10, canP ? '#ffd34a' : '#778', 'center', 'bold'); }
    { const hv = mouse.x - UIOX >= x + w - 148 && mouse.x - UIOX <= x + w - 120 && mouse.y >= y + 9 && mouse.y <= y + 45; btn(x + w - 148, y + 9, 28, 36, '', () => { farmInfo = i; SFX.click(); }, { col: hv ? '#3a5a9a' : '#2a3a6a', hot: '#4a6aba' }); txt('i', x + w - 134, y + 33, 18, '#fff', 'center', 'bold'); }
    btn(x + w - 112, y + 9, 100, 36, open ? T2('Entrar', 'Enter') : 'Bloqueada', () => open ? startMission(i, undefined, true) : lockClick('f' + i), { col: open ? '#2f7a4a' : '#26262f', hot: open ? '#3fa061' : '#33333f', size: 15 });
  });
}

/* ----- Informacao de cada mapa do Farm: monstros, ouro, XP, drops e bosses ----- */
let farmInfo = -1;
const MOB_ENN = { sq: 'Raging Squirrel', bee: 'Giant Bee', gob: 'Goblin Archer', boar: 'Boar', acorn: 'Exploding Acorn', ent: 'Young Ent', cbat: 'Crystal Bat', spider: 'Rock Spider', miner: 'Skeleton Miner', scarab: 'Golden Scarab', rockb: 'Unstable Rock', troll: 'Cave Troll', vamp: 'Vampire Bat', witch: 'Witch', sknight: 'Skeleton Knight', garg: 'Gargoyle', pump: 'Cursed Pumpkin', armor: 'Haunted Armour', toad: 'Poison Toad', leech: 'Leech', wisp: 'Will-o-the-Wisp', croc: 'Crocodile', zombie: 'Mud Zombie', spore: 'Toxic Mushroom', scorp: 'Scorpion', mummy: 'Mummy', snake: 'Sand Serpent', vulture: 'Vulture', djinn: 'Desert Mage', cactus: 'Exploding Cactus', voidimp: 'Void Imp', hellhound: 'Hellhound', eye: 'Eye of the Abyss', shgolem: 'Shadow Golem', voidk: 'Void Knight', crystal: 'Dark Crystal' };
const mobName = id => lang === 'en' ? MOB_ENN[id] : MOB_DEF[id].n;
const MOB_ROLE = { chase: ['persegue-te', 'chases you'], fast: ['muito rápido', 'very fast'], fly: ['voo errático', 'erratic flight'], shootA: ['dispara setas', 'shoots arrows'], shootO: ['dispara orbes', 'shoots orbs'], tank: ['lento e resistente', 'slow and tough'], charge: ['investe em linha reta', 'charges in a line'], boom: ['explode ao morrer', 'explodes on death'] };
const PAT_N = { ring: ['anel de projéteis', 'projectile ring'], charge: ['investida', 'charge'], spread: ['leque de tiros', 'shot fan'], slam: ['pancada em área', 'area slam'], cone: ['sopro em cone', 'cone breath'], meteors: ['chuva de meteoros', 'meteor rain'], summon: ['invoca lacaios', 'summons minions'], spiral: ['espiral de tiros', 'shot spiral'], blink: ['teletransporte', 'teleport'], leap: ['salto', 'leap'], spin: ['giro', 'spin'] };
function rarLine(boost, x, y) {
  const w = rarityWeights(boost), t = w.reduce((a, b) => a + b, 0); let cx = x;
  w.forEach((v, r) => { const pc = 100 * v / t, s2 = `${L(RAR[r][0])} ${pc >= 10 ? pc.toFixed(0) : pc.toFixed(1)}%`; txtR(s2, cx, y, 10, RAR[r][1], 'left', 'bold'); cx += txtW(s2, 10, 'bold') + 8; });
}
function drawFarmInfo() {
  if (state !== 'hub' || tab !== 'farm' || farmInfo < 0 || !save) return;
  const i = farmInfo, m = MISSIONS[i], lv = save.pl.lv, rec = farmRec(i), fk = farmK(rec), x = 40, y = 30, w = 720, h = 456, mx = mouse.x - UIOX, my = mouse.y;
  ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { farmInfo = -1; } });
  panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  btn(x + w - 40, y + 8, 28, 26, 'X', () => { farmInfo = -1; }, { size: 14, col: '#6a2a2a', hot: '#8a3a3a' });
  ctx.fillStyle = THEMES[m.theme].bg; ctx.fillRect(x + 14, y + 10, 42, 42); drawSprBig(m.boss.pal, x + 35, y + 31, .52);
  txt(m.name, x + 66, y + 30, 20, '#ffd34a', 'left', 'bold');
  txt(`${T2('Nv recomendado', 'Recommended level')} ${rec} · ${T2('Prestígio', 'Prestige')} ${save.pres[i] | 0}/${PRES_MAX} · ${T2('Melhor onda', 'Best wave')} ${save.farmBest[i] | 0}` + (i ? ` · ${T2('Abre na onda', 'Opens at wave')} ${FARM_UNLOCK[i - 1]} ${T2('da zona anterior', 'of the previous zone')}` : ''), x + 66, y + 48, 12, '#9cf');
  const hpM = wv => 1 + TUNE.wHP * (wv - 1) + TUNE.wHP2 * (wv - 1) * (wv - 1), bossHP = (wv, mk) => Math.round(TUNE.boss[i] * hpM(wv) * fk.hp * .9 * 1.2 * (1 + TUNE.lHP * (rec - 1)) * mk * 10), coin = d => Math.max(1, Math.round(d.gold * COIN_RATE * FARM_RATE * (1 + .02 * (rec - 1))));
  const lx = x + 16, lw = 330, rx = x + 366, rw = 330, ids = MOB_BY_MAP[i], all = i === 5, tl = all ? [].concat(...MOB_BY_MAP) : ids;
  const sec = (t, sx, sy, sw) => { txt(t, sx, sy, 13, '#f0c060', 'left', 'bold'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(sx, sy + 5, sw, 1); };
  // ---- coluna da esquerda: monstros
  sec(all ? T2('Monstros (aparecem todos os 36)', 'Monsters (all 36 appear)') : T2('Monstros (6)', 'Monsters (6)'), lx, y + 76, lw);
  let hov = null;
  if (all) {
    tl.forEach((id, k) => { const cx = lx + (k % 9) * 36 + 17, cy = y + 104 + Math.floor(k / 9) * 34; ctx.fillStyle = '#0c0c18'; ctx.fillRect(cx - 16, cy - 15, 32, 31); drawSprBig(id, cx, cy, Math.min(1.8, 28 / Math.max(SPR[id].n.width, SPR[id].n.height))); if (mx >= cx - 16 && mx <= cx + 16 && my >= cy - 15 && my <= cy + 16) hov = id; });
    if (hov) { const d = EN[hov], md = MOB_DEF[hov]; txt(`${mobName(hov)} · ${T2(...MOB_ROLE[md.a])} · ¢${coin(d)}`, lx, y + 240, 11, '#ffd34a', 'left', 'bold'); } else txt(T2('Passa o rato por cima de um monstro para veres os detalhes.', 'Hover a monster to see its details.'), lx, y + 240, 11, '#778');
  } else {
    ids.forEach((id, k) => {
      const d = EN[id], md = MOB_DEF[id], cx = lx + (k % 2) * 166, cy = y + 88 + Math.floor(k / 2) * 52, tr = d.gold / 8;
      bevel(cx, cy, 160, 48, '#12121f', '#33334a', '#05050a'); ctx.fillStyle = '#0c0c18'; ctx.fillRect(cx + 4, cy + 4, 40, 40); drawSprBig(id, cx + 24, cy + 24, Math.min(1.8, 34 / Math.max(SPR[id].n.width, SPR[id].n.height)));
      { const nn = mobName(id); let fs = 12; while (fs > 8 && txtW(nn, fs, 'bold') > 106) fs--; txt(nn, cx + 50, cy + 16, fs, '#fff', 'left', 'bold'); } txt(T2(...MOB_ROLE[md.a]), cx + 50, cy + 29, 10, '#9ab'); txt(`¢${coin(d)} · ${T2('equip.', 'gear')} ${((.012 + .001) * (.5 + .5 * tr) * 100).toFixed(1)}%`, cx + 50, cy + 42, 10, '#fd5');
    });
  }
  const gy = y + 258; sec(T2('Por monstro', 'Per monster'), lx, gy, lw);
  const cs = tl.map(id => coin(EN[id])); const xpk = (4 + (rec - 1) / 3) * FARM_RATE;
  txt(`${T2('Ouro (onda 1)', 'Gold (wave 1)')}: ¢${Math.min(...cs)}–${Math.max(...cs)} · ${T2('+12% por onda', '+12% per wave')}`, lx, gy + 22, 12, '#fd5');
  { const xk = xpK(lv, rec); txt(`XP: ${(xpk * xk).toFixed(1)}` + (xk < 1 ? ` (${Math.round(xk * 100)}% · ${T2('acima do nível recomendado', 'above the recommended level')})` : ` · ${T2('o teu bónus de XP aplica-se', 'your XP bonus applies')}`), lx, gy + 40, 12, xk < 1 ? '#f99' : '#7fe8ff'); }
  txt(`${T2('Monstros por onda', 'Monsters per wave')}: ${Math.round(Math.min(50, 6 + 1.6))} ${T2('na onda 1', 'on wave 1')} → ${Math.round(Math.min(50, 6 + 1.6 * 20))} ${T2('na onda 20 (máx. 50)', 'on wave 20 (max 50)')}`, lx, gy + 58, 12, '#cdd6f0');
  txt(`${T2('Vida e dano seguem o nível do mapa e sobem por onda', 'Health and damage follow the map level and rise per wave')}`, lx, gy + 76, 11, '#9ab');
  sec(T2('Regras da Campanha', 'Campaign rules'), lx, gy + 100, lw);
  wrap(T2(`Esc a meio: 30%. Morrer: 40% do XP e 10% do ouro (itens perdem-se). Acima do nível recomendado (+3) o XP desce 8% por nível. Chega à onda ${PRES_WAVE} para dar prestígio: +1 estrela, +${PRES_STEP} níveis, monstros mais fortes e mais recompensas (máx. ${PRES_MAX}).`, `Esc mid-run: 30%. Dying: 40% of XP and 10% of gold (items are lost). Above the recommended level (+3) XP drops 8% per level. Reach wave ${PRES_WAVE} to prestige: +1 star, +${PRES_STEP} levels, tougher monsters and better rewards (max ${PRES_MAX}).`), lx, gy + 118, lw, 12, 10, '#f99');
  // ---- coluna da direita: drops e bosses
  const t1 = tl.map(id => (.012 + .001) * (.5 + .5 * EN[id].gold / 8) * 100), t30 = tl.map(id => (.012 + .001 * 30) * (.5 + .5 * EN[id].gold / 8) * 100);
  sec(T2('Drops dos monstros', 'Monster drops'), rx, y + 76, rw);
  txt(`${T2('Equipamento', 'Gear')}: ${Math.min(...t1).toFixed(1)}–${Math.max(...t1).toFixed(1)}% (${T2('onda 1', 'wave 1')}) → ${Math.min(...t30).toFixed(1)}–${Math.max(...t30).toFixed(1)}% (${T2('onda 30', 'wave 30')})`, rx, y + 96, 11, '#cdd6f0');
  txt(`${T2('Cópia de arma', 'Weapon copy')}: 1,2% · ${T2('Coração de vida', 'Health heart')}: 12%`, rx, y + 112, 11, '#cdd6f0');
  txt(`${T2('Nível do item', 'Item level')}: ${Math.min(120, rec + Math.floor(lv * .5))} (${T2('onda 1', 'wave 1')}) → ${Math.min(120, rec + Math.floor(30 * .9) + Math.floor(lv * .5))} (${T2('onda 30', 'wave 30')})`, rx, y + 128, 11, '#cdd6f0');
  txt(T2('Raridade (onda 1):', 'Rarity (wave 1):'), rx, y + 145, 10, '#9ab'); rarLine(0, rx, y + 158); txt(T2('Raridade (onda 24+):', 'Rarity (wave 24+):'), rx, y + 173, 10, '#9ab'); rarLine(6, rx, y + 186);
  const bossBlock = (by, pal, name, pattern, hpTxt, drop, lbl, col) => {
    sec(lbl, rx, by, rw); ctx.fillStyle = THEMES[m.theme].bg; ctx.fillRect(rx, by + 12, 52, 52); drawSprBig(pal, rx + 26, by + 38, .62);
    txt(name, rx + 60, by + 28, 14, col, 'left', 'bold'); txt(hpTxt, rx + 60, by + 44, 11, '#cdd6f0'); wrap([...new Set(pattern)].map(q => T2(...PAT_N[q])).join(', '), rx + 60, by + 58, rw - 62, 12, 10, '#9ab');
    wrap(drop, rx, by + 82, rw, 12, 10, '#7cf');
  };
  bossBlock(y + 204, m.semi.pal, m.semi.name, m.semi.pattern, `${T2('Vida na onda 5', 'Health on wave 5')}: ${gfmt(bossHP(5, .3))}`, T2('Onda 5, 15, 25… Larga 1 equipamento e 40% de uma cópia de arma.' + (i === 0 && !(save.pres[0] | 0) ? ' Aqui também podes sair (checkpoint).' : ''), 'Wave 5, 15, 25… Drops 1 gear piece and a 40% chance of a weapon copy.' + (i === 0 && !(save.pres[0] | 0) ? ' You can also leave here (checkpoint).' : '')), 'Semi-boss', '#ffd34a');
  bossBlock(y + 304, m.boss.pal, m.boss.name, m.boss.pattern, `${T2('Vida na onda 10', 'Health on wave 10')}: ${gfmt(bossHP(10, 1))}`, T2('Onda 10, 20… Larga equipamento (no mínimo Raro), 1 cópia de arma e 8 moedas grandes; depois há checkpoint e horda.', 'Wave 10, 20… Drops gear (at least Rare), 1 weapon copy and 8 big coins; then a checkpoint and a horde.'), 'Boss', '#ff9a6a');
  txt(T2('Guardião Dourado: ondas 41, 81, 121…', 'Gold Guardian: waves 41, 81, 121…'), rx, y + 428, 11, '#f5c542', 'left', 'bold');
}

