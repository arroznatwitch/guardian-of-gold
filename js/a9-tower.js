'use strict';
/* =====================================================================
   TORRE (a partir do nivel 50)
   Uma subida por dia: cada andar e uma onda de monstros (boss a cada 5 andares).
   Andares disponiveis: 10 gratis por dia + 2 por cada hora (acumulam ate 20).
   Se morreres, a Torre fecha ate ao dia seguinte; no dia seguinte volta ao andar 1.
   ===================================================================== */
const TW = { lv: 50, free: 10, per: 2, cap: 20, hr: 3600e3, buyN: 10, buyCost: 500, max: 99 };   // na Shop: +10 andares por 500 diamantes (podem passar dos 20)
const isTowerDay = () => evDay() === 2, twX = () => isTowerDay() ? 3 : 1;   // tercas: andares x3 (gratis, por hora e limite)
const twFree = () => TW.free * twX(), twPer = () => TW.per * twX(), twCap = () => TW.cap * twX();
const towerMap = f => Math.floor((f - 1) / 5) % MISSIONS.length;            // o cenario muda a cada 5 andares
const towerRec = f => Math.min(130, Math.round(40 + 1.5 * f));             // nivel dos monstros (forca e itens)
const towerTw = f => 3 + Math.floor(f * .4);                                // "onda" equivalente (vida, dano e quantidade)
const towerNeed = f => Math.min(30, 10 + Math.floor(f / 3));                // monstros por andar
const towerBoss = f => f % 5 === 0;
const towerGold = f => Math.round((300 + 60 * f) * (1 + ((save && save.pl.lv) || 50) / 50));
const towerXp = f => Math.max(1, Math.round(xpNeed(save.pl.lv) * (.015 + .0005 * f)));
const towerGems = f => towerBoss(f) ? 3 + Math.floor(f / 5) : 0;           // bau a cada 5 andares: diamantes + 1 pedra de evolucao
const towerStone = f => Math.min(4, Math.floor(f / 15));
function twState() {
  let t = save.tw; const now = Date.now(), k = todayKey();
  if (!t || typeof t !== 'object') t = save.tw = { d: '', f: 1, dead: 0, tk: twFree(), at: now, best: 0 };
  t.f = Math.max(1, t.f | 0); t.tk = Math.max(0, Math.min(TW.max, t.tk | 0)); t.best = Math.max(0, t.best | 0); if (!(t.at <= now)) t.at = now;
  t.dead = 0;   // morrer ja nao fecha a Torre: podes voltar a tentar quando quiseres
  if (t.d !== k) { t.d = k; t.f = 1; t.tk = Math.max(t.tk, twFree()); }   // novo dia: volta ao andar 1 e recebe os 10 gratis
  if (t.tk >= twCap()) t.at = now;   // cheio: o relogio so conta quando ha espaco
  else { const n = Math.floor((now - t.at) / TW.hr); if (n > 0) { t.tk = Math.min(twCap(), t.tk + n * twPer()); t.at += n * TW.hr; if (t.tk >= twCap()) t.at = now; } }
  return t;
}
const towerOpen = () => save && save.pl.lv >= TW.lv;
function startTower() {
  const t = twState(); if (!towerOpen() || t.dead || t.tk <= 0) { SFX.error(); return; }
  startMission(towerMap(t.f), undefined, true);
  R.tower = { g: 0, xp: 0, gems: 0, st: [0, 0, 0, 0, 0], n: 0, f0: t.f, lv0: save.pl.lv, pts0: save.pts, gem0: save.gems };
  towerSetup(t.f);
}
function towerSetup(f) {   // prepara o andar f (cenario, forca dos monstros e quantidade)
  const m = towerMap(f);
  if (R.m !== m) { R.m = m; R.bg = makeBG(MISSIONS[m].theme); R.deco = mkDeco(); setMusic('m' + m); }
  R.rec = towerRec(f); R.wave = towerTw(f); applyWave(); R.need = towerNeed(f);
  R.bossM *= 100 / TUNE.boss[R.m];   // todos os bosses da Torre com a mesma forca base, seja qual for o cenario
  R.phase = 'hunt'; R.enemies = []; R.projs = R.projs.filter(p => p.from === 'p'); R.tels = []; R.spawnT = 1;
  R.toast = towerBoss(f) ? T2(`ANDAR ${f} · BOSS!`, `FLOOR ${f} · BOSS!`) : T2(`ANDAR ${f}`, `FLOOR ${f}`); R.toastT = 2.5;
}
function towerClear() {   // andar concluido: recompensas logo guardadas, gasta 1 andar e sobe
  const t = twState(), f = t.f, T = R.tower, g = towerGold(f), xp = towerXp(f), gm = towerGems(f);
  save.gold = Math.min(GOLD_MAX, save.gold + g); addXP(xp); T.g += g; T.xp += xp; T.n++;
  if (gm) { save.gems += gm; T.gems += gm; const r = towerStone(f); save.stones[r]++; T.st[r]++; }
  t.f = f + 1; if (t.tk >= twCap()) t.at = Date.now(); t.tk = Math.max(0, t.tk - 1); if (f > t.best) t.best = f;   // estava cheio: o relogio das horas arranca agora
  R.texts.push({ x: R.p.x, y: R.p.y - 40, s: `+¢${gfmt(g)} · +${gfmt(xp)} XP` + (gm ? ` · +${gm} ◆` : ''), t: 2, col: '#ffd34a', sz: 14 });
  persist(); SFX.win();
  if (t.tk <= 0) { R.tower.out = true; R.endT = 1.6; R.endWin = true; R.phase = 'done'; R.enemies = []; return; }   // acabaram os andares: sai e guarda tudo
  heal(R.p.max * .25); towerSetup(t.f); R.shake = 6;
}
let twAsk = 0;   // confirmacao da compra de andares (segundos que o botao fica em "Confirmar")
function towerBuy() {
  const t = twState(), c = disc(TW.buyCost);
  if (!towerOpen() || t.dead || save.gems < c || t.tk + TW.buyN > TW.max) { SFX.error(); return; }
  if (!(twAsk > T)) { twAsk = T + 3; SFX.click(); return; }   // 1.o clique pede confirmacao
  twAsk = 0; save.gems -= c; t.tk += TW.buyN; persist(); SFX.buy();
  hubToast = { t: 3, s: T2(`+${TW.buyN} andares da Torre!`, `+${TW.buyN} Tower floors!`), col: '#ffd34a' };
}
function shopTowerCard(X, Y, WD) {   // cartao na Shop
  const t = save ? twState() : null, c = disc(TW.buyCost), open = towerOpen(), ask = twAsk > T;
  bevel(X, Y, WD, 54, '#14142a', '#6a4aa8', '#05050a');
  txt(T2(`Torre · +${TW.buyN} andares`, `Tower · +${TW.buyN} floors`), X + 16, Y + 22, 16, '#d0a0ff', 'left', 'bold');
  txt(!open ? T2(`Abre no nível ${TW.lv}.`, `Unlocks at level ${TW.lv}.`) : t.dead ? T2('Morreste hoje: a Torre só abre amanhã.', 'You died today: the Tower only opens tomorrow.') : T2(`Tens ${t.tk} andares disponíveis. Os comprados podem passar dos ${twCap()}.`, `You have ${t.tk} floors available. Bought floors can go past ${twCap()}.`), X + 16, Y + 42, 11, open && !t.dead ? '#9ab' : '#f88');
  const ok = open && !t.dead && save.gems >= c && t.tk + TW.buyN <= TW.max;
  btn(X + WD - 216, Y + 11, 200, 32, ask ? T2(`Confirmar · ${c} ◆`, `Confirm · ${c} ◆`) : `${T2('Comprar', 'Buy')} · ${c} ◆`, towerBuy, { size: 14, off: !ok, col: ask ? '#a06a20' : '#2f7a4a', hot: ask ? '#c98a30' : '#3fa061' });
}
function towerEnd(win) {}   // morrer ja nao fecha a Torre: ficas no mesmo andar e podes tentar outra vez
const twResetLeft = () => { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); return m - n; };   // o andar volta a 1 a meia-noite (novo dia)
function hubTower() {
  const t = twState(), X = 197, WD = 583, now = Date.now(), f = t.f;
  txt(T2('Torre', 'Tower'), X, 114, 22, '#ffd34a', 'left', 'bold');
  txt(T2('Sobe andar a andar. Boss a cada 5 andares. Se morreres, tenta outra vez. Todos os dias volta ao andar 1.', 'Climb floor by floor. Boss every 5 floors. If you die, just try again. Every day it resets to floor 1.'), X + 80, 112, 11, '#9ab');
  // torre desenhada: os proximos andares de baixo para cima
  const tx = X, ty = 132, tw = 150, th = 300, rows = 8;
  bevel(tx, ty, tw, th + 14, '#0f0f1e', '#3a3a5a', '#05050a');
  for (let i = 0; i < rows; i++) {
    const fl = f + i, y = ty + th - (i + 1) * (th / rows) + 7, h = th / rows - 4, cur = i === 0, boss = towerBoss(fl);
    ctx.fillStyle = t.dead ? '#2a1414' : cur ? '#3a2a08' : '#1a1a30'; ctx.fillRect(tx + 10, y, tw - 20, h);
    ctx.strokeStyle = cur ? '#ffd34a' : boss ? '#c040ff' : '#33334a'; ctx.lineWidth = cur ? 2 : 1; ctx.strokeRect(tx + 10.5, y + .5, tw - 21, h - 1);
    txt(`${T2('Andar', 'Floor')} ${fl}`, tx + 20, y + h / 2 + 5, 13, cur ? '#ffd34a' : '#cdd6f4', 'left', 'bold');
    if (boss) txt('BOSS', tx + tw - 20, y + h / 2 + 5, 11, '#d080ff', 'right', 'bold');
  }
  // estado do dia
  const px = X + tw + 14, pw = WD - tw - 14;
  bevel(px, 132, pw, 120, '#14142a', t.dead ? '#8a3030' : '#a8821f', '#05050a');
  txt(t.dead ? T2('Morreste hoje', 'You died today') : `${T2('Próximo andar', 'Next floor')}: ${f}`, px + 16, 160, 20, t.dead ? '#f88' : '#fff', 'left', 'bold');
  txt(`${T2('Melhor andar', 'Best floor')}: ${t.best}`, px + pw - 16, 160, 13, '#9cf', 'right', 'bold');
  if (isTowerDay()) txt(T2('Terça: andares x3!', 'Tuesday: floors x3!'), px + pw - 16, 186, 13, '#ff8a5a', 'right', 'bold');
  txt(`${T2('Andares disponíveis', 'Floors available')}: ${t.tk}/${twCap()}`, px + 16, 186, 15, t.tk ? '#6f6' : '#f88', 'left', 'bold');
  bar(px + 16, 194, pw - 32, 8, t.tk / twCap(), '#6f6');
  { const ms = twResetLeft(), hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60; txt(T2(`Volta ao andar 1 em ${hh}h ${String(mm).padStart(2, '0')}m`, `Resets to floor 1 in ${hh}h ${String(mm).padStart(2, '0')}m`), px + pw - 16, 222, 12, hh < 3 ? '#ff6a5a' : '#ff9a5a', 'right', 'bold'); }   // aviso: o progresso do dia reinicia
  if (t.tk < twCap()) { const left = Math.max(0, TW.hr - (now - t.at)), mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60; txt(`+${twPer()} ${T2('andares em', 'floors in')} ${mm}:${String(ss).padStart(2, '0')}`, px + 16, 222, 12, '#cdd6f4'); }
  else txt(T2('Cheio: joga para voltares a ganhar andares.', 'Full: play to start earning floors again.'), px + 16, 222, 12, '#ffd34a');
  txt(t.dead ? T2('A Torre volta a abrir amanhã, no andar 1.', 'The Tower reopens tomorrow, on floor 1.') : T2(`${twFree()} grátis por dia · +${twPer()} por hora (até ${twCap()})`, `${twFree()} free per day · +${twPer()} per hour (up to ${twCap()})`), px + 16, 242, 11, t.dead ? '#f99' : '#889');
  // recompensas
  bevel(px, 262, pw, 120, '#14142a', '#3a3a5a', '#05050a');
  txt(T2('Recompensas por andar', 'Rewards per floor'), px + 16, 286, 15, '#f0c060', 'left', 'bold');
  txt(`${T2('Andar', 'Floor')} ${f}: ¢${gfmt(towerGold(f))} · ${gfmt(towerXp(f))} XP`, px + 16, 308, 13, '#fd5', 'left', 'bold');
  txt(`${T2('Nível dos monstros', 'Monster level')}: ${towerRec(f)}`, px + pw - 16, 286, 12, save.pl.lv >= towerRec(f) ? '#9cf' : '#f88', 'right', 'bold');
  const nb = Math.ceil(f / 5) * 5;
  txt(`${T2('Baú a cada 5 andares', 'Chest every 5 floors')} (${T2('próximo', 'next')}: ${nb}): +${towerGems(nb)} ◆ · ${T2('pedra', 'stone')} ${RAR[towerStone(nb)][0]}`, px + 16, 328, 12, '#7fe8ff');
  txt(T2(`Bosses largam itens; a cada 10 andares um item ${RAR[2][0]} ou melhor garantido.`, `Bosses drop items; every 10 floors a guaranteed ${L(RAR[2][0])} or better item.`), px + 16, 348, 11, '#c9a0ff');
  txt(T2('As recompensas de cada andar ficam guardadas logo. Sair a meio não perde nada.', 'Each floor\'s rewards are saved right away. Leaving mid-run loses nothing.'), px + 16, 368, 11, '#889');
  const can = !t.dead && t.tk > 0;
  btn(px, 396, pw, 40, t.dead ? T2('Fechada até amanhã', 'Closed until tomorrow') : t.tk ? `${T2('Subir', 'Climb')} · ${T2('andar', 'floor')} ${f}` : T2('Sem andares', 'No floors'), startTower, { off: !can, size: 15, col: '#2f7a4a', hot: '#3fa061' });
}
