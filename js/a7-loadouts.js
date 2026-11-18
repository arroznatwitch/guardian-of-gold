'use strict';
/* ----- Loadouts: 3 builds (a 2.a e gratis, a 3.a custa 200 diamantes). Cada build guarda atributos, arma, equipamento, pet e skin. ----- */
const LO_N = 3, LO_COST0 = 200;
const loState = () => { const l = save.lo = save.lo && typeof save.lo === 'object' ? save.lo : {}; if (!Array.isArray(l.own)) l.own = [1, 0, 0]; if (!Array.isArray(l.b)) l.b = [null, null, null]; l.own[0] = 1; l.cur = Math.max(0, Math.min(LO_N - 1, l.cur | 0)); return l; };
const attrSum = a => Object.values(a || {}).reduce((x, y) => x + (y | 0), 0);
function loSnapshot() {   // o que a build ativa tem agora (os objetos passam para a build: nao ficam duplicados)
  return { attr: Object.assign({}, save.attr), weapon: save.eq[save.cls] | 0, gear: save.gear, pet: save.pets ? save.pets.eq || null : null, skin: save.skE ? (save.skE[save.cls] | 0) : 0 };
}
function loApply(s) {
  const T = attrSum(save.attr) + (save.pts | 0);   // total de pontos de atributo ganhos: partilhado por todas as builds
  if (!s) s = { attr: { str: 0, vit: 0, per: 0, agi: 0 }, weapon: save.eq[save.cls] | 0, gear: {}, pet: save.pets ? save.pets.eq || null : null, skin: save.skE ? (save.skE[save.cls] | 0) : 0 };
  let a = Object.assign({ str: 0, vit: 0, per: 0, agi: 0 }, s.attr); if (attrSum(a) > T) a = { str: 0, vit: 0, per: 0, agi: 0 };   // (nao devia acontecer)
  save.attr = a; save.pts = T - attrSum(a);
  save.eq[save.cls] = s.weapon | 0; save.gear = s.gear || {};
  for (const sl of EQ_SLOTS) if (save.gear[sl] === undefined) save.gear[sl] = null;
  if (save.pets) save.pets.eq = s.pet && save.pets.own && save.pets.own[s.pet] ? s.pet : null;
  if (save.skE) save.skE[save.cls] = s.skin | 0;
}
function loSwitch(i) {
  const l = loState(); if (i === l.cur || i < 0 || i >= LO_N) return false;
  if (!l.own[i]) { if (i === 1) l.own[1] = 1; else return false; }   // a 2.a build e gratis; a 3.a compra-se
  l.b[l.cur] = loSnapshot(); const s = l.b[i]; l.b[i] = null; l.cur = i; loApply(s); persist(); return true;
}
function loBuy(i) {
  const l = loState(); if (l.own[i] || i !== 2 || save.gems < disc(LO_COST0)) return false;
  save.gems -= disc(LO_COST0); l.own[i] = 1; return loSwitch(i);
}
async function loBuyUI() {   // compra da 3.a build: o servidor desconta e regista
  if (buyBusy) return false; buyBusy = true; const sv = await shopServer('lo', 2); buyBusy = false;
  if (sv.ok === false) { hubToast = { t: 3, s: buyMsg(sv.error), col: '#f88' }; return false; }
  return loBuy(2);
}
let loAsk = false;
function drawLoadouts() {   // seletor de builds no painel direito do ecra Personagem (ao lado do XP)
  const l = loState();
  if (loAsk) {
    ctx.fillStyle = '#000c'; ctx.fillRect(195, 88, 590, 390); ui.push({ x: 195, y: 88, w: 590, h: 390, fn() {} }); bevel(300, 190, 380, 130, '#14142a', '#a8821f', '#05050a');
    txt(T2('Desbloquear a Build 3?', 'Unlock Build 3?'), 490, 222, 18, '#ffd34a', 'center', 'bold'); txt(T2(`Custa ${disc(LO_COST0)} diamantes (tens ${save.gems}).`, `Costs ${disc(LO_COST0)} diamonds (you have ${save.gems}).`), 490, 248, 13, save.gems >= disc(LO_COST0) ? '#cdd6f4' : '#f88', 'center');
    btn(320, 268, 160, 34, T2(`Comprar · ${disc(LO_COST0)} ◆`, `Buy · ${disc(LO_COST0)} ◆`), async () => { loAsk = false; if (await loBuyUI()) { SFX.buy(); hubToast = { t: 2.5, s: T2('Build 3 desbloqueada!', 'Build 3 unlocked!'), col: '#ffd34a' }; } else SFX.error(); }, { off: save.gems < disc(LO_COST0), size: 14, col: '#2f7a4a', hot: '#3fa061' });
    btn(500, 268, 160, 34, T2('Cancelar', 'Cancel'), () => { loAsk = false; }, { size: 14 });
    return;
  }
  for (let i = 0; i < LO_N; i++) {
    const x = 606 + i * 55, act = l.cur === i, own = !!l.own[i];
    btn(x, 134, 52, 20, !own && i === 2 ? '' : `Build ${i + 1}`, () => {
      if (act) return;
      if (!own && i === 2) { loAsk = true; SFX.click(); return; }
      if (loSwitch(i)) { SFX.buy(); hubToast = { t: 2, s: T2(`Build ${i + 1} ativa`, `Build ${i + 1} active`), col: '#9fe' }; }
    }, { size: 10, col: act ? '#a8821f' : own || i === 1 ? '#2a2a48' : '#26262f', hot: '#d2a73a' });
    if (!own && i === 2) { drawIcon('lock', x + 11, 144, .9); txt(`${disc(LO_COST0)} ◆`, x + 35, 148, 9, '#7fe8ff', 'center', 'bold'); }
  }
}
