'use strict';
/* =====================================================================
   TUTORIAL: passos guiados no campo + lista "Primeiros passos" com pequenas recompensas em ouro
   O estado vive em save.tut = { on, skip, done, claim }. Saves antigos com nivel alto comecam com o tutorial desligado.
   ===================================================================== */
const TUT_TASKS = [
  { id: 'kill',   pt: 'Mata 10 monstros',                          en: 'Kill 10 monsters',                     ok: () => (save.stats.kills | 0) >= 10, gold: 150 },
  { id: 'attr',   pt: 'Gasta um ponto de atributo (Personagem)',   en: 'Spend an attribute point (Character)', ok: () => Object.values(save.attr).some(v => v > 0), gold: 250 },
  { id: 'gear',   pt: 'Equipa uma peça de equipamento',            en: 'Equip a piece of gear',                ok: () => EQ_SLOTS.some(sl => save.gear[sl]), gold: 300 },
  { id: 'weapon', pt: 'Compra a tua 2.ª arma (separador Armas)',   en: 'Buy your 2nd weapon (Weapons tab)',    ok: () => save.own[save.cls].filter(Boolean).length >= 2, gold: 400 },
  { id: 'lv10',   pt: 'Chega ao nível 10 (abre as Raids)',         en: 'Reach level 10 (unlocks Raids)',       ok: () => save.pl.lv >= 10, gold: 600 },
  { id: 'raid',   pt: 'Vence a tua primeira Raid',                 en: 'Win your first Raid',                  ok: () => Object.values(save.raids).some(a => a && a.some(n => n > 0)), gold: 1500 },
];
let tutOpen = false;
const tutOn = () => !!(save && save.tut && save.tut.on);
const tutDoneN = () => TUT_TASKS.filter(t => t.ok()).length;
const tutReadyN = () => TUT_TASKS.filter(t => t.ok() && !save.tut.claim[t.id]).length;
function tutClaim(t) {
  if (!t.ok() || save.tut.claim[t.id]) return;
  save.tut.claim[t.id] = 1; save.gold = Math.min(GOLD_MAX, save.gold + t.gold); SFX.coin(); persist();
  if (TUT_TASKS.every(q => save.tut.claim[q.id])) { save.tut.on = false; tutOpen = false; hubToast = { t: 3.5, s: T2('Primeiros passos concluídos!', 'First steps complete!'), col: '#6f6' }; persist(); }
}

// passo guiado atual do campo: { r: retangulo a destacar, bx, by: posicao da caixa, text }
function tutHint() {
  const T0 = save.tut; if (!T0 || !T0.on || T0.skip || state !== 'hub' || tutOpen) return null;
  const tabY = i => 76 + i * 29, attrSum = Object.values(save.attr).reduce((a, b) => a + b, 0), hasGear = EQ_SLOTS.some(sl => save.gear[sl]);
  if (save.pts > 0 && attrSum === 0) {
    if (tab !== 'char') return { r: { x: 20, y: tabY(2), w: 150, h: 26 }, bx: 180, by: tabY(2) - 14, text: T2('Subiste de nível! Abre Personagem para gastares o ponto.', 'You levelled up! Open Character to spend your point.') };
    return { r: { x: 710, y: 180, w: 60, h: 26 }, bx: 200, by: 392, text: T2('Clica no + para gastar o ponto de atributo (a Força aumenta o dano).', 'Click + to spend the attribute point (Strength raises damage).') };
  }
  if (save.bag.length > 0 && !hasGear) {
    if (tab !== 'bag') return { r: { x: 20, y: tabY(3), w: 150, h: 26 }, bx: 180, by: tabY(3) - 14, text: T2('Tens equipamento novo! Abre a Mochila.', 'You have new gear! Open the Backpack.') };
    if (bagSel >= 0) return { r: { x: 512, y: 380, w: 256, h: 28 }, bx: 510, by: 312, text: T2('Carrega em Equipar para vestires o item.', 'Press Equip to wear the item.') };
    return { r: null, bx: 510, by: 300, text: T2('Clica num item para o veres e depois em Equipar.', 'Click an item to inspect it, then press Equip.') };
  }
  if ((save.stats.kills | 0) < 10) return { r: { x: 20, y: tabY(0), w: 150, h: 26 }, bx: 180, by: tabY(0) - 14, text: T2('Bem-vindo! Escolhe um mapa na Campanha e luta contra os monstros.', 'Welcome! Pick a map in Campaign and fight the monsters.') };
  return null;
}
function tutBubble(x, y, text, arrowLeft) {
  const w = 290, lines = Math.max(1, Math.ceil(txtW(text, 12) / (w - 24))), h = 22 + lines * 15 + 22;
  ctx.fillStyle = '#05050acc'; ctx.fillRect(x + 3, y + 3, w, h); bevel(x, y, w, h, '#1c1c36', '#ffd34a', '#05050a');
  if (arrowLeft) { ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.moveTo(x - 9, y + 20); ctx.lineTo(x, y + 13); ctx.lineTo(x, y + 27); ctx.fill(); }
  wrap(text, x + 12, y + 20, w - 24, 15, 12, '#fff');
  btn(x + w - 66, y + h - 21, 58, 16, T2('Saltar', 'Skip'), () => { save.tut.skip = true; persist(); }, { size: 10, col: '#3a2a3a' });
}
function drawTutHub() {
  if (!save || !save.tut) return;
  const h = tutHint();
  if (h) {
    if (h.r) { const k = 2 + Math.sin(T * 6) * 2; ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 3; ctx.strokeRect(h.r.x - k, h.r.y - k, h.r.w + 2 * k, h.r.h + 2 * k); }
    tutBubble(h.bx, h.by, h.text, h.bx < 200);
  }
  // lista "Primeiros passos"
  if (tutOn()) {
    const rdy = tutReadyN(), n = tutDoneN();
    btn(20, 424, 150, 20, T2(`Primeiros passos ${n}/${TUT_TASKS.length}`, `First steps ${n}/${TUT_TASKS.length}`), () => { tutOpen = true; }, { size: 11, col: rdy ? '#2f7a4a' : '#2f6a8a', hot: '#3f8ab0' });
    if (rdy) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(158, 428, 10, 12); txt('!', 163, 438, 10, '#000', 'center', 'bold'); }
  }
  if (tutOpen) drawTutList();
}
function drawTutList() {
  const x = 170, y = 90, w = 460, h = 70 + TUT_TASKS.length * 40 + 60;
  ctx.fillStyle = '#000b'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { tutOpen = false; } });
  panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  txt(T2('Primeiros passos', 'First steps'), x + w / 2, y + 34, 24, '#ffd34a', 'center', 'bold');
  bar(x + 30, y + 46, w - 60, 8, tutDoneN() / TUT_TASKS.length, '#6f6');
  TUT_TASKS.forEach((t, i) => {
    const ty = y + 70 + i * 40, done = t.ok(), got = !!save.tut.claim[t.id];
    bevel(x + 20, ty, w - 40, 34, done ? '#14261a' : '#12121f', done ? '#3f7a4a' : '#26263a', '#05050a');
    ctx.fillStyle = '#05050a'; ctx.fillRect(x + 30, ty + 9, 16, 16); if (done) ctx.drawImage(ICN.check, x + 30, ty + 8, 16, 16);
    txt(T2(t.pt, t.en), x + 56, ty + 22, 13, done ? '#cdd6f0' : '#99a', 'left', done ? 'bold' : 'normal');
    if (got) txt(T2('Recebido', 'Claimed'), x + w - 36, ty + 22, 12, '#6f6', 'right', 'bold');
    else if (done) btn(x + w - 128, ty + 5, 100, 24, `+¢${t.gold}`, () => tutClaim(t), { size: 12, col: '#2f7a4a', hot: '#3fa061' });
    else txt(`¢${t.gold}`, x + w - 36, ty + 22, 12, '#887', 'right');
  });
  const by = y + h - 44;
  btn(x + 20, by, 140, 30, T2('Fechar', 'Close'), () => { tutOpen = false; }, { size: 13 });
  btn(x + w - 190, by, 170, 30, T2('Ocultar lista', 'Hide list'), () => { save.tut.on = false; tutOpen = false; persist(); }, { size: 12, col: '#3a2a3a' });
}
// durante as primeiras missoes: lembrete dos controlos
function drawTutPlay() {
  if (!save || !save.tut || !save.tut.on || save.tut.skip || !R || R.endT !== undefined || (save.stats.kills | 0) >= 10 || R.time > 40) return;
  const k = n => keyName(binds[n]), a = Math.min(1, (40 - R.time) / 3);
  const lines = [T2(`Mover: ${k('up')}${k('left')}${k('down')}${k('right')}   ·   Mirar e atacar: rato   ·   Esquivar: ${k('dash')}`, `Move: ${k('up')}${k('left')}${k('down')}${k('right')}   ·   Aim and attack: mouse   ·   Dodge: ${k('dash')}`),
    T2(`${k('special')} e ${k('skill')}: habilidades   ·   ${k('auto')}: auto-ataque`, `${k('special')} and ${k('skill')}: abilities   ·   ${k('auto')}: auto-attack`)];
  const w = 470, x = W / 2 - w / 2, y = H - 118;
  ctx.globalAlpha = .85 * a; rr(x, y, w, 42, 8); ctx.fillStyle = '#000a'; ctx.fill();
  lines.forEach((l, i) => txt(l, W / 2, y + 17 + i * 17, 13, i ? '#ffd34a' : '#fff', 'center', 'bold')); ctx.globalAlpha = 1;
}
