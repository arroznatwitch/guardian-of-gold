'use strict';
// ----- Personagem (corpo inteiro) -----
function slotBtn(cx, cy, key, label, it, drawIconFn, fn) {
  const x = cx - 27, y = cy - 27, mx = mouse.x - UIOX, hov = mx >= x && mx <= x + 54 && mouse.y >= y && mouse.y <= y + 54; if (hov) slotHover = key;
  bevel(x, y, 54, 54, hov ? '#1a1a30' : '#0e0e1a', it ? RAR[it.r][1] : '#33334a', '#05050a');
  if (it) { itemIcon(it, cx, cy, 3.4); if (it.ench) txt('+' + it.ench, x + 50, y + 50, 11, '#fff', 'right', 'bold'); miniStars(it.st || 0, x + 8, y + 8); }
  else if (drawIconFn) drawIconFn(cx, cy);
  else { ctx.globalAlpha = .25; slotIcon(key, 0, cx, cy, 3.4); ctx.globalAlpha = 1; }
  ui.push({ x, y, w: 54, h: 54, fn });
}
function hubChar() {
  const c = CLASSES[save.cls], g = gearStats(), L = save.pl.lv, a = save.attr, w = curW(); slotHover = null;
  panel(195, 88, 285, 390, '#16162a', '#3a3a5a');
  const cx = 337, cy = 192; let top = -1; for (const sl of SLOTS) if (save.gear[sl]) top = Math.max(top, save.gear[sl].r);
  if (top >= 0) { ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, 100); gr.addColorStop(0, RAR[top][1] + '55'); gr.addColorStop(1, RAR[top][1] + '00'); ctx.fillStyle = gr; ctx.fillRect(cx - 100, cy - 100, 200, 200); ctx.globalCompositeOperation = 'source-over'; }
  ctx.fillStyle = '#0a0a14'; ctx.beginPath(); ctx.ellipse(cx, cy + 64, 58, 12, 0, 0, 7); ctx.fill();
  const k = 3.3; drawSprBig(heroSpr(), cx, cy + Math.sin(T * 2) * 1.5, k);
  const base = w.t === 'melee' ? -.9 : w.t === 'arrow' ? -.12 : -1.3, ang = base + Math.sin(T * 2) * .05, hh = HAND[save.cls], hx = cx + hh[0] * 3 * k, hy = cy + Math.sin(T * 2) * 1.5 + hh[1] * 3 * k; const whs = k * .6; drawWeapon(w.id, hx, hy, ang, k, whs);   // no ecra da personagem as armas novas ficam mais pequenas (.6)
  if (GLOWW[w.id]) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = GLOWW[w.id]; ctx.globalAlpha = .45 + .15 * Math.sin(T * 8); ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * wGlowD(w.id, whs, 27 * k / 3), hy + Math.sin(ang) * wGlowD(w.id, whs, 27 * k / 3), wGlowR(w.id, whs, 14), 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const go = (sl) => () => { if (keys.ShiftLeft || keys.ShiftRight) { equipBest(sl); return; } bagFilter = sl; bagSel = -1; tab = 'bag'; };
  slotBtn(237, 128, 'head', 'Capacete', save.gear.head, null, go('head'));
  slotBtn(237, 190, 'chest', 'Armadura', save.gear.chest, null, go('chest'));
  slotBtn(237, 252, 'boots', 'Botas', save.gear.boots, null, go('boots'));
  slotBtn(437, 128, 'weapon', 'Arma', null, (x, y) => weaponIcon(w.id, x, y, 1.8), () => tab = 'weapons');
  if (wlvl()) txt('+' + wlvl(), 460, 151, 11, '#fff', 'right', 'bold'); miniStars(wStar(w.id), 418, 109);
  slotBtn(437, 190, 'amulet', 'Amuleto', save.gear.amulet, null, go('amulet'));
  slotBtn(437, 252, 'ring', 'Anel', save.gear.ring, null, go('ring'));
  { const sb = setBonus(); if (sb) { const c2 = sb.on ? '#6f6' : '#778'; txt(`Conjunto +${sb.ring.main.v}%`, 437, 290, 10, c2, 'center', 'bold'); txt(AFF[sb.k].n, 437, 301, 10, c2, 'center'); } }
  // informacao do slot
  txt(`${c.name} · Nv ${L}`, cx, 284, 14, '#fff', 'center', 'bold');
  const hv = slotHover, itH = hv && EQ_SLOTS.includes(hv) ? save.gear[hv] : null;
  if (itH) itemCard(itH, 208, 296, 268); else if (hv === 'weapon') { txt(w.n + (wlvl() ? ` +${wlvl()}` : ''), 208, 318, 15, '#fff', 'left', 'bold'); txt(w.info, 208, 338, 12, '#bbb'); wrap(`[E] ${w.sk.n}: ${w.sk.d}`, 208, 356, 262, 14, 12, '#7cf'); const ws = wStar(w.id); txt(ws ? `Fusão: ${'★'.repeat(ws)} · Dano ×${STAR_MULT[ws].toFixed(2)} · Vel. +${ws * 3}%` : 'Fusão: sem estrelas', 208, 392, 12, '#ffd34a'); if (ws) txt(STAR_FX[w.id][ws - 1], 208, 428, 11, '#6f6'); txt(L < FUSE_LV ? `A Fusão desbloqueia no Nível ${FUSE_LV}` : 'Junta cópias no ecrã Fusão', 208, 410, 11, L < FUSE_LV ? '#f88' : '#889'); }
  else if (hv === 'ring') { txt('Anel', 208, 318, 15, '#fff', 'left', 'bold'); wrap('Com as 4 peças de armadura da mesma raridade, o anel dá um bónus ao stat da cor da gema: até +3% (Prata), +6,5% (Ouro), +9% (Diamante) ou +13% (Roxo), conforme o nível do anel.', 208, 340, 262, 14, 12, '#9ab'); }
  else if (hv) txt('Vazio', 208, 318, 14, '#889');
  else { drawSetInfo(208, 304); EQ_SLOTS.forEach((sl, i) => { const q = save.gear[sl]; txt(q ? itemName(q) : `${SLOT_LBL[sl]}: —`, 208, 354 + i * 18, 13, q ? RAR[q.r][1] : '#556', 'left', q ? 'bold' : 'normal'); }); }
  // tira da mochila para o slot sobre o qual estas
  const inLeft = mouse.x - UIOX >= 195 && mouse.x - UIOX <= 480 && mouse.y >= 88 && mouse.y <= 478;
  if (hv && EQ_SLOTS.includes(hv)) charStrip = hv; else if (!inLeft) charStrip = null;
  if (charStrip) {
    const cur = save.gear[charStrip], cand = save.bag.map((it, i) => ({ it, i })).filter(o => o.it.slot === charStrip).slice(0, 7);
    txt(`Mochila · ${SLOT_LBL[charStrip]}`, 208, 428, 12, '#9ab', 'left', 'bold');
    if (!cand.length) txt('Nenhum item para este slot', 208, 455, 12, '#667');
    cand.forEach((o, k) => {
      const x = 208 + k * 38, cm = cmpItems(o.it, cur), col = cm.verdict > 0 ? '#6f6' : cm.verdict < 0 ? '#f66' : '#fd5';
      btn(x, 436, 34, 34, '', () => equipFromBag(o.i), { col: '#10101c', hot: '#1c1c34' }); itemIcon(o.it, x + 17, 453, 1.9); arrowTri(x + 27, 443, cm.verdict >= 0, col);
    });
    if (cand.length) txt('Shift+clique: melhor', 478, 428, 10, '#778', 'right');
  }
  if (hubToast.t > 0) { ctx.globalAlpha = Math.min(1, hubToast.t); txt(hubToast.s, 337, 424, 13, hubToast.col, 'center', 'bold'); ctx.globalAlpha = 1; }
  // painel direito
  panel(490, 88, 295, 390, '#16162a', '#3a3a5a');
  const pn = on && on.nick ? on.nick : c.name;
  txt(pn, 504, 114, 20, '#fff', 'left', 'bold'); txt(`Nv ${L}`, 504 + txtW(pn, 20, 'bold') + 10, 113, 16, '#6cf', 'left', 'bold');
  bar(504, 122, 267, 8, L >= MAXLV ? 1 : save.pl.xp / xpNeed(L), '#6cf'); txt(L >= MAXLV ? 'MAX' : `${save.pl.xp}/${xpNeed(L)} XP`, 771, 144, 11, '#8ab', 'right');
  txt('Atributos', 504, 168, 15, '#f0c060', 'left', 'bold'); txt(`Pontos: ${save.pts}`, 771, 168, 15, save.pts ? '#ffd34a' : '#778', 'right', 'bold');
  ATTRS.forEach(([key, nm, hint], i) => {
    const y = 176 + i * 34;
    txt(nm, 504, y + 14, 14, '#fff', 'left', 'bold'); txt(hint, 504, y + 28, 10, '#7a8aa8'); txt(String(a[key]), 690, y + 20, 16, a[key] > attrCap() ? '#ff9a4a' : '#f0c060', 'right', 'bold'); if (a[key] > attrCap()) txt(`efetivo ${Math.round(attrEff(a[key]))}`, 690, y + 31, 9, '#c98a4a', 'right');
    const capped = key === 'per' && stats().cdm <= .3001;   // a velocidade de ataque tem limite de +70%: mais pontos seriam desperdicados
    if (capped) txt('MÁX', 655, y + 20, 11, '#6f6', 'right', 'bold');
    btn(710, y + 4, 60, 26, '+', () => { if (save.pts > 0 && !capped) { save.pts--; a[key]++; persist(); SFX.click(); } }, { off: save.pts <= 0 || capped, rep: true, size: 16, col: '#2f7a4a', hot: '#3fa061' });
  });
  const rc = 50 * L, used = Object.values(a).reduce((x, y) => x + y, 0);
  btn(504, 314, 130, 26, `Redistribuir (¢${rc})`, () => { if (used > 0 && save.gold >= rc) { spendG(rc); save.pts += used; for (const q in a) a[q] = 0; persist(); SFX.buy(); } else SFX.error(); }, { size: 12, off: used === 0, col: '#6a3a2a' });
  { const bc = attrBuyCost(save.buyN | 0); btn(641, 314, 130, 26, `+1 ponto ¢${gfmt(bc)}`, () => { if (save.gold >= bc) { spendG(bc); save.pts++; save.buyN = (save.buyN | 0) + 1; persist(); SFX.buy(); } else SFX.error(); }, { size: 12, off: save.gold < bc, col: '#2f6a8a', hot: '#3f8ab0' }); }   // compra um ponto de atributo; cada compra torna o proximo mais caro
  txt('Estatísticas', 504, 362, 15, '#f0c060', 'left', 'bold');
  const s = stats(), E = [['Vida', s.hp], ['Dano', '+' + Math.round((s.dm - 1) * 100) + '%'], ['Velocidade', Math.round(s.spd)], ['Vel. de ataque', '+' + Math.round((1 - s.cdm) * 100) + '%'], ['Crítico', g.crit.toFixed(1) + '%'], ['Roubo de vida', g.ls.toFixed(1) + '%'], ['Redução de dano', g.dr.toFixed(1) + '%'], ['Ouro extra', g.gf.toFixed(0) + '%'], ['XP extra', g.xpb.toFixed(0) + '%'], ['Queimar', g.burn.toFixed(0) + '%'], ['Abrandar', g.slow.toFixed(0) + '%']];
  const SC = ['#ff6a7a', '#ff9a3a', '#6adfff', '#ffe24a', '#ff7ae0', '#ff5a8a', '#6a9aff', '#ffd34a', '#7fe8ff', '#ff7a3a', '#a8e8ff'];   // uma cor por estatistica
  E.forEach(([n, v], i) => { const col = i % 2, row = Math.floor(i / 2), x = 504 + col * 136, y = 380 + row * 16; ctx.fillStyle = SC[i]; ctx.fillRect(x - 6, y - 8, 3, 9); txt(n, x, y, 11, '#aab'); txt(String(v), x + 126, y, 11, SC[i], 'right', 'bold'); });
}
// ----- Mochila -----
let bagPage = 0, bagMulti = false, bagPick = new Set(), bagBuy = 0;
function hubBag() {
  [['all', 'Todos']].concat(EQ_SLOTS.map(sl => [sl, SLOT_LBL[sl]]), [['mat', 'Materiais']]).forEach(([k, l], i) => btn(197 + i * 43, 88, 41, 24, l, () => { bagFilter = k; bagSel = -1; bagPage = 0; bagPick.clear(); }, { size: 9, col: bagFilter === k ? '#a8821f' : (k === 'mat' ? '#3a2f5a' : '#2a2a48') }));
  if (bagFilter === 'mat') { hubMaterials(); return; }
  // mochilas: cinco separadores numerados; os bloqueados mostram um cadeado e o proximo mostra o preco
  const slots = save.bagSlots || 1; if (bagPage >= slots) bagPage = 0;
  txt('Mochila', 197, 132, 12, '#8a9ab8', 'left', 'bold');
  for (let k = 0; k < 5; k++) {
    const x = 252 + k * 34, open = k < slots, next = k === slots;
    btn(x, 117, 30, 22, open ? String(k + 1) : '', () => { if (open) { bagPage = k; bagSel = -1; } else if (next) { bagBuy = k + 1; } else { SFX.error(); hubToast = { t: 2.4, s: 'Desbloqueia primeiro a Mochila anterior', col: '#f88' }; } }, { size: 13, col: open ? (bagPage === k ? '#a8821f' : '#2a2a48') : next ? '#4a3a1a' : '#1e1e2a', hot: open ? '#c9a030' : '#7a6a3a' });
    if (!open) drawIcon('lock', x + 15, 128, 1);
  }
  { const nk = slots < 5 ? BAG_COST[slots] : null; if (nk) { const gem = nk[0] === 'd', can = gem ? save.gems >= nk[1] : save.gold >= nk[1]; txt('Próxima: ' + (gem ? '◆' : '¢') + gfmt(nk[1]), 430, 132, 11, can ? (gem ? '#7fe8ff' : '#fd5') : '#a88', 'left', 'bold'); } }
  txt(`${save.bag.length}/${bagMax()}`, 495, 417, 13, save.bag.length >= bagMax() ? '#f66' : '#aab', 'right', 'bold');
  const list = save.bag.map((it, i) => ({ it, i })).filter(o => bagFilter === 'all' || o.it.slot === bagFilter), pageList = list.slice(bagPage * BAG_PAGE, bagPage * BAG_PAGE + BAG_PAGE);
  for (let n = 0; n < BAG_PAGE; n++) {
    const x = 197 + (n % 6) * 50, y = 146 + Math.floor(n / 6) * 45, o = pageList[n], picked = o && bagPick.has(o.it);
    bevel(x, y, 46, 41, picked ? '#16301c' : '#10101c', o ? RAR[o.it.r][1] : '#26263a', '#05050a');
    if (o) {
      itemIcon(o.it, x + 23, y + 20, 2.6); if (o.it.ench) txt('+' + o.it.ench, x + 43, y + 38, 9, '#fff', 'right', 'bold'); miniStars(o.it.st || 0, x + 6, y + 6);
      { const v = cmpItems(o.it, save.gear[o.it.slot]).verdict, c = v > 0 ? '#4cf06a' : v < 0 ? '#ff4a4a' : '#ffd34a'; ctx.fillStyle = c; ctx.fillRect(x + 4, y + 33, 5, 5); }
      if (!canWear(o.it)) drawIcon('lock', x + 36, y + 10, .9);
      if (o.it.lk) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(x + 33, y + 27, 11, 11); ctx.fillStyle = '#3a2a08'; ctx.fillRect(x + 35, y + 29, 7, 7); ctx.fillStyle = '#ffd34a'; ctx.fillRect(x + 37, y + 31, 3, 3); }
      if (picked) { ctx.strokeStyle = '#4cf06a'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, 48, 43); txt('✓', x + 38, y + 38, 12, '#4cf06a', 'center', 'bold'); }
      else if (!bagMulti && bagSel === o.i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, 48, 43); }
      const idx = o.i, it2 = o.it; ui.push({ x, y, w: 46, h: 41, fn: () => { if (bagMulti) { if (it2.lk) { SFX.error(); hubToast = { t: 2, s: T2('Item bloqueado: não pode ser vendido', 'Locked item: it cannot be sold'), col: '#f88' }; } else if (bagPick.has(it2)) bagPick.delete(it2); else bagPick.add(it2); } else bagSel = idx; } });
    }
  }
  btn(197, 376, 112, 26, 'Vender Comuns', () => { let n = 0; for (let i = save.bag.length - 1; i >= 0; i--) if (save.bag[i].r === 0 && !save.bag[i].lk) { save.gold += sellValue(save.bag[i]); if (enchItem === save.bag[i]) enchItem = null; bagPick.delete(save.bag[i]); save.bag.splice(i, 1); n++; } bagSel = -1; persist(); n ? SFX.coin() : SFX.error(); }, { size: 12, col: '#6a4a2a' });
  btn(313, 376, 100, 26, bagMulti ? 'Sair da seleção' : 'Selecionar', () => { bagMulti = !bagMulti; bagPick.clear(); bagSel = -1; }, { size: 12, col: bagMulti ? '#8a3a2a' : '#3a5a7a', hot: bagMulti ? '#b04a3a' : '#4a7aa0' });
  btn(417, 376, 78, 26, 'Ordenar', () => { save.bag.sort((p, q) => q.r - p.r || q.il - p.il); bagSel = -1; bagPick.clear(); persist(); }, { size: 12 });
  // legenda (cor do quadradinho = comparacao com o equipado)
  { let lx = 197; [['#4cf06a', lang === 'en' ? 'better' : 'melhor'], ['#ff4a4a', lang === 'en' ? 'worse' : 'pior'], ['#ffd34a', lang === 'en' ? 'same' : 'igual']].forEach(([c, t]) => { ctx.fillStyle = c; ctx.fillRect(lx, 410, 6, 6); txt(t, lx + 10, 417, 10, '#99a'); lx += 10 + txtW(t, 10) + 12; }); txt(lang === 'en' ? 'than equipped' : 'que o equipado', lx, 417, 10, '#667'); }
  { const ref = save.bag[bagSel] ? save.bag[bagSel].slot : bagFilter; txt('Equipado (não se vende)', 197, 434, 12, '#f0c060', 'left', 'bold');
    EQ_SLOTS.forEach((sl, k) => { const it = save.gear[sl], x = 197 + k * 50, y = 438, hl = ref === sl;
      bevel(x, y, 46, 40, hl ? '#2c2410' : '#10101c', it ? RAR[it.r][1] : '#26263a', '#05050a');
      if (it) { itemIcon(it, x + 23, y + 20, 2.6); if (it.ench) txt('+' + it.ench, x + 43, y + 36, 9, '#fff', 'right', 'bold'); miniStars(it.st || 0, x + 6, y + 6); } else { ctx.globalAlpha = .3; slotIcon(sl, 0, x + 23, y + 20, 2.6); ctx.globalAlpha = 1; }
      if (hl) { ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, 48, 42); }
      ui.push({ x, y, w: 46, h: 40, fn: () => { bagFilter = sl; bagSel = -1; bagPage = 0; } }); });
    if (ref !== 'all') txt(`← ${SLOT_LBL[ref]}`, 345, 434, 12, '#ffd34a', 'left', 'bold'); }
  panel(500, 90, 280, 388, '#16162a');
  if (bagMulti) {
    const picked = save.bag.filter(q => bagPick.has(q)), tot = picked.reduce((a, q) => a + sellValue(q), 0), vis = save.bag.filter(q => !q.lk && (bagFilter === 'all' || q.slot === bagFilter));
    txt('Modo de seleção', 640, 122, 18, '#ffd34a', 'center', 'bold'); wrap('Clica nos itens para os marcar e depois vende-os de uma vez.', 514, 146, 252, 15, 12, '#aab');
    txt(`${picked.length} selecionados`, 640, 214, 16, '#fff', 'center', 'bold'); txt('¢' + gfmt(tot), 640, 240, 22, '#fd5', 'center', 'bold');
    btn(512, 268, 256, 28, 'Selecionar todos (visíveis)', () => { vis.forEach(q => bagPick.add(q)); }, { size: 13, col: '#3a5a7a', hot: '#4a7aa0', off: !vis.length });
    btn(512, 302, 256, 28, 'Limpar seleção', () => bagPick.clear(), { size: 13, off: !picked.length });
    btn(512, 380, 256, 34, `Vender selecionados`, () => { if (picked.length) sellAsk = 'pick'; else SFX.error(); }, { size: 15, col: '#8a3a2a', hot: '#b04a3a', off: !picked.length });
    return;
  }
  const it = save.bag[bagSel];
  if (!it) { txt('Seleciona um item', 640, 270, 15, '#667', 'center'); return; }
  const yy = itemCard(it, 512, 98, 232), cur = save.gear[it.slot];
  { const lx = 744, ly = 98; btn(lx, ly, 26, 24, '', () => { it.lk = it.lk ? 0 : 1; if (it.lk) bagPick.delete(it); sellArm = null; persist(); SFX.click(); }, { col: it.lk ? '#a8821f' : '#2a2a48', hot: '#c9a030' }); ctx.fillStyle = it.lk ? '#fff' : '#9aa'; ctx.fillRect(lx + 8, ly + 11, 10, 8); ctx.fillRect(lx + 10, ly + 6, 2, 6); ctx.fillRect(lx + 14, ly + 6, 2, 6); ctx.fillRect(lx + 10, ly + 5, 6, 2); if (it.lk) { ctx.fillStyle = '#a8821f'; ctx.fillRect(lx + 12, ly + 13, 2, 4); } }
  txt(cur ? `Equipado: ${itemName(cur)}` : 'Equipado: —', 512, yy + 12, 12, cur ? RAR[cur.r][1] : '#667');
  { const cm = cmpItems(it, cur), vy = yy + 34, vt = cm.verdict > 0 ? [cur ? 'MELHOR' : 'Slot vazio', '#6f6'] : cm.verdict < 0 ? ['PIOR', '#f66'] : ['SIMILAR', '#fd5'];
    txt(vt[0], 512, vy, 15, vt[1], 'left', 'bold'); if (cur) arrowTri(512 + txtW(vt[0], 15, 'bold') + 12, vy - 5, cm.verdict >= 0, vt[1]);
    const room = Math.max(0, Math.min(5, Math.floor((374 - (vy + 14)) / 14)));
    cm.rows.slice(0, room).forEach((r, i) => txt(`${r.d > 0 ? '+' : ''}${ev(r.k, r.d, 1)}${AFF[r.k].u} ${AFF[r.k].n}`, 512, vy + 15 + i * 14, 12, r.d > 0 ? '#6f6' : '#f77')); }
  btn(512, 380, 256, 28, canWear(it) ? 'Equipar' : `Requer Nv ${itemReq(it)}`, () => { if (!canWear(it)) { SFX.error(); return; } const i = bagSel, old = save.gear[it.slot]; save.gear[it.slot] = it; if (old) save.bag[i] = old; else save.bag.splice(i, 1); bagSel = old ? i : -1; persist(); SFX.buy(); }, { size: 14, off: !canWear(it), col: '#2f7a4a', hot: '#3fa061' });
  { const risky = it.r >= 3 || cmpItems(it, cur).verdict > 0 || it.ench >= 3 || (it.st || 0) > 0, armed = sellArm === it;
    btn(512, 412, 256, 28, it.lk ? 'Bloqueado (não se vende)' : armed ? 'Confirmar venda?' : `Vender ¢${sellValue(it)}`, () => { if (it.lk) { SFX.error(); return; } if (risky && !armed) { sellArm = it; SFX.click(); return; } sellArm = null; save.gold += sellValue(it); save.bag.splice(bagSel, 1); if (enchItem === it) enchItem = null; bagSel = -1; persist(); SFX.coin(); }, { size: 14, off: !!it.lk, col: armed ? '#b03a2a' : '#a06a20', hot: armed ? '#d04a3a' : '#c98a30' });
    if (risky && !armed && !it.lk) txt(it.r >= 3 ? 'Item raro: pede confirmação' : 'Pode ser melhor que o equipado', 640, 476, 10, '#f99', 'center'); }
  btn(512, 444, 256, 28, 'Encantar', () => { if (!tabOpen('ench')) { lockClick('ench'); return; } enchItem = it; tab = 'ench'; }, { size: 14, off: it.slot === 'ring', col: tabOpen('ench') ? '#5a3a7a' : '#26262f', hot: tabOpen('ench') ? '#7a55a0' : '#33333f' });   // o anel nao se encanta
}

// materiais das raids: pedras de evolucao (nao se vendem)
function hubMaterials() {
  const tot = save.stones.reduce((a, b) => a + b, 0);
  for (let r = 0; r < 5; r++) {
    const x = 197, y = 124 + r * 52, n = save.stones[r] | 0, col = RAR[r][1];
    bevel(x, y, 296, 46, '#12121f', n ? col : '#26263a', '#05050a');
    ctx.fillStyle = '#0c0c18'; ctx.fillRect(x + 5, y + 5, 36, 36);
    ctx.save(); ctx.translate(x + 23, y + 23); ctx.rotate(Math.PI / 4); ctx.fillStyle = n ? col : '#3a3a4a'; ctx.fillRect(-9, -9, 18, 18); ctx.fillStyle = '#ffffff55'; ctx.fillRect(-9, -9, 18, 5); ctx.fillStyle = '#00000044'; ctx.fillRect(-9, 4, 18, 5); ctx.restore();
    txt(`${T2('Pedra de evolução', 'Evolution stone')} · ${L(RAR[r][0])}`, x + 52, y + 21, 13, n ? '#fff' : '#778', 'left', 'bold'); txt(T2('Bloqueada: não se vende', 'Locked: cannot be sold'), x + 52, y + 37, 10, '#9a8a5a');
    txt('×' + n, x + 284, y + 28, 18, n ? col : '#667', 'right', 'bold');
  }
  panel(500, 90, 280, 388, '#16162a');
  txt(T2('Materiais', 'Materials'), 640, 122, 18, '#ffd34a', 'center', 'bold');
  txt(`${tot} ${T2(tot === 1 ? 'pedra' : 'pedras', tot === 1 ? 'stone' : 'stones')}`, 640, 146, 14, '#fff', 'center', 'bold');
  wrap(T2('As pedras de evolução ganham-se ao vencer Raids (a raridade segue a dificuldade). Usa-as no separador Encantar para subir o nível de um item da mesma raridade.', 'Evolution stones are won by clearing Raids (rarity follows difficulty). Use them in the Enchant tab to raise the level of an item of the same rarity.'), 514, 178, 252, 15, 12, '#aab');
  wrap(T2('Os materiais ficam sempre bloqueados: não podem ser vendidos nem apagados.', 'Materials are always locked: they cannot be sold or deleted.'), 514, 276, 252, 15, 12, '#c9b46a');
  wrap(T2('Dica: nos itens da mochila, o cadeado no canto do painel bloqueia-os para não os venderes sem querer.', 'Tip: on backpack items, the padlock on the item panel locks them so you never sell them by accident.'), 514, 344, 252, 15, 11, '#7a8aa8');
}
let sellAsk = false, sellArm = null;
function sellList(list) { list = list.filter(it => !it.lk); let g = 0; for (const it of list) { g += sellValue(it); if (enchItem === it) enchItem = null; bagPick.delete(it); } save.gold = Math.min(GOLD_MAX, save.gold + g); save.bag = save.bag.filter(it => !list.includes(it)); bagSel = -1; sellAsk = false; persist(); SFX.coin(); }
const sellTargets = () => (sellAsk === 'pick' ? save.bag.filter(it => bagPick.has(it)) : save.bag).filter(it => !it.lk);
function drawBagBuy() {
  if (state !== 'hub' || tab !== 'bag' || !bagBuy) return; const k = bagBuy - 1, c = BAG_COST[k], gem = c[0] === 'd', can = gem ? save.gems >= c[1] : save.gold >= c[1];
  if (k < (save.bagSlots || 1)) { bagBuy = 0; return; }
  ctx.fillStyle = '#000b'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { bagBuy = 0; } });
  const x = 250, y = 170, w = 300, h = 160; panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  txt(`Desbloquear a Mochila ${k + 1}?`, x + w / 2, y + 34, 18, '#ffd34a', 'center', 'bold'); txt('+30 lugares para itens', x + w / 2, y + 58, 13, '#aab', 'center');
  txt((gem ? '◆' : '¢') + gfmt(c[1]), x + w / 2, y + 90, 24, gem ? '#7fe8ff' : '#fd5', 'center', 'bold');
  btn(x + 20, y + 106, 125, 38, 'Comprar', () => { if (!can) { SFX.error(); return; } if (gem) save.gems -= c[1]; else spendG(c[1]); save.bagSlots = k + 1; bagPage = k; bagBuy = 0; persist(); SFX.buy(); }, { size: 15, col: can ? '#2f7a4a' : '#4a3a3a', hot: '#3fa061', off: !can });
  btn(x + 155, y + 106, 125, 38, 'Cancelar', () => { bagBuy = 0; }, { size: 15, col: '#2a2a48' });
}
function drawSellAsk() {
  if (state !== 'hub' || tab !== 'bag' || !sellAsk) return;
  const L0 = sellTargets(); if (!L0.length) { sellAsk = false; return; }
  let g = 0; for (const it of L0) g += sellValue(it); const hi = L0.filter(it => it.r >= 3).length, up = L0.filter(it => cmpItems(it, save.gear[it.slot]).verdict > 0).length;
  ctx.fillStyle = '#000b'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => {} });
  const x = 250, y = 170, w = 300, h = 170; panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  txt(sellAsk === 'pick' ? 'Vender selecionados?' : 'Vender tudo?', x + w / 2, y + 34, 20, '#ffd34a', 'center', 'bold');
  txt(`${L0.length} itens da Mochila por ¢${gfmt(g)}`, x + w / 2, y + 62, 14, '#fff', 'center');
  txt(hi ? `Inclui ${hi} item(ns) Épico/Lendário/Mítico!` : 'Os itens equipados não são vendidos.', x + w / 2, y + 82, 12, hi ? '#f88' : '#9ab', 'center'); if (up) txt(`${up} parecem melhores que o equipado`, x + w / 2, y + 98, 11, '#fd5', 'center');
  btn(x + 20, y + 112, 125, 38, 'Sim, vender', () => sellList(L0), { size: 15, col: '#8a3a2a', hot: '#b04a3a' });
  btn(x + 155, y + 112, 125, 38, 'Cancelar', () => { sellAsk = false; }, { size: 15, col: '#2a2a48' });
}
// ----- Encantamentos -----
function doRefine() {
  const it = enchItem; if (!it || enc.t > 0 || it.ench >= ENC_MAX) return; if (it.ench >= refCap()) { SFX.error(); return; } const c = refCost(it); if (save.gold < c) { SFX.error(); return; }
  spendG(c); const ok = Math.random() * 100 < ENC_CH[it.ench], down = !ok && it.ench >= 6 && Math.random() < .3;
  enc = { t: .9, res: { kind: 'ref', ok, down, it }, msg: '', msgT: 0, col: '#fff', sparks: [] }; persist();
}
// pedras de evolucao: cada pedra da raridade da peca sobe +2 niveis de item (ate 120) e os bonus crescem com ele
const MAIN_BASE = { head: il => 30 + 8 * il, chest: il => 50 + 12 * il, boots: il => 3 + .25 * il, amulet: il => 3 + .35 * il };
const reforgeCost = it => Math.round(400 * (1 + it.il * .25) * (1 + it.r * .8) * (1 + (it.rf || 0) * .35) * lvMul());
function reforgeItem(it) {
  const c = reforgeCost(it); if (!it || enc.t > 0 || !it.aff.length || save.gold < c) { SFX.error(); return; }
  spendG(c); it.rf = (it.rf || 0) + 1; const pool = AFF_POOL.filter(k => k !== it.main.k); it.aff = [];
  for (let i = 0; i < it.r; i++) { const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; it.aff.push({ k, v: affVal(k, it.r, it.il) }); }
  enc.msg = 'REFORJADO!'; enc.col = '#ffb070'; enc.msgT = 2.5; SFX.special();
  for (let i = 0; i < 24; i++) enc.sparks.push({ x: 610, y: 232, vx: (Math.random() - .5) * 300, vy: -Math.random() * 240, l: .8, c: '#ffb070' }); persist();
}
function setItemLevel(it, il2) {
  const fx = (k, v, f) => k === 'hp' ? Math.round(v * f) : +(v * f).toFixed(1), fa = k => (AFF[k].b + AFF[k].p * il2) / (AFF[k].b + AFF[k].p * it.il);
  it.main.v = fx(it.main.k, it.main.v, MAIN_BASE[it.slot](il2) / MAIN_BASE[it.slot](it.il));
  for (const a of it.aff) a.v = fx(a.k, a.v, fa(a.k));
  if (it.spec) { const cap = (it.spec.k === 'burn' || it.spec.k === 'slow') ? 35 : it.spec.k === 'xpb' ? 20 : 45; it.spec.v = Math.min(cap, fx(it.spec.k, it.spec.v, fa(it.spec.k))); }
  it.il = il2;
}
function evolveItem(it) {
  if (!it || enc.t > 0 || it.il >= 120 || !(save.stones[it.r] > 0) || Math.ceil((it.il + 2) / 2) > save.pl.lv) { SFX.error(); return; }
  const il2 = Math.min(120, it.il + 2), fx = (k, v, f) => k === 'hp' ? Math.round(v * f) : +(v * f).toFixed(1), fa = k => (AFF[k].b + AFF[k].p * il2) / (AFF[k].b + AFF[k].p * it.il);
  it.main.v = fx(it.main.k, it.main.v, MAIN_BASE[it.slot](il2) / MAIN_BASE[it.slot](it.il));
  for (const a of it.aff) a.v = fx(a.k, a.v, fa(a.k));
  if (it.spec) { const cap = (it.spec.k === 'burn' || it.spec.k === 'slow') ? 35 : it.spec.k === 'xpb' ? 20 : 45; it.spec.v = Math.min(cap, fx(it.spec.k, it.spec.v, fa(it.spec.k))); }
  it.il = il2; save.stones[it.r]--; enc.msg = `EVOLUÍDO! Nível ${il2}`; enc.col = '#7fe8ff'; enc.msgT = 2.5; SFX.special();
  for (let i = 0; i < 24; i++) enc.sparks.push({ x: 610, y: 232, vx: (Math.random() - .5) * 300, vy: -Math.random() * 240, l: .8, c: '#7fe8ff' }); persist();
}
const specGems = it => 4 * (1 + it.r + Math.floor((it.rr || 0) / 2));   // encantar especial custa diamantes: sobem com a raridade e com cada repeticao
function doSpec() {
  const it = enchItem; if (!it || enc.t > 0) return; const c = specCost(it), gm = specGems(it); if (save.gold < c || save.gems < gm) { SFX.error(); return; }
  spendG(c); save.gems -= gm; enc = { t: .9, res: { kind: 'spec', it }, msg: '', msgT: 0, col: '#fff', sparks: [] }; persist();
}
function updateEnchant(dt) {
  for (const q of enc.sparks) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; q.l -= dt; } enc.sparks = enc.sparks.filter(q => q.l > 0);
  if (enc.msgT > 0) enc.msgT -= dt;
  if (enc.t > 0) {
    enc.t -= dt; if (Math.random() < .6) enc.sparks.push({ x: 610 + (Math.random() - .5) * 90, y: 232 + (Math.random() - .5) * 90, vx: 0, vy: -50, l: .5, c: RAR[enc.res.it.r][1] });
    if (enc.t <= 0) {
      enc.t = 0; const r = enc.res, it = r.it;
      if (r.kind === 'ref') {
        if (r.ok) { it.ench++; enc.msg = `REFINADO +${it.ench}!`; enc.col = '#6f6'; SFX.buy(); }
        else if (r.down) { it.ench--; enc.msg = `FALHOU! Desceu para +${it.ench}`; enc.col = '#f55'; SFX.error(); }
        else { enc.msg = 'FALHOU...'; enc.col = '#f96'; SFX.error(); }
      } else { it.spec = rollSpec(it, it.spec ? it.spec.k : null); it.rr = (it.rr || 0) + 1; enc.msg = 'ENCANTADO!'; enc.col = '#d9a6ff'; SFX.special(); }
      enc.msgT = 2.5; for (let i = 0; i < 30; i++) enc.sparks.push({ x: 610, y: 232, vx: (Math.random() - .5) * 320, vy: -Math.random() * 260, l: .8, c: r.kind === 'spec' || r.ok ? '#fff' : '#f96' }); persist();
    }
  }
}
function hubEnchant() {
  SLOTS.forEach((sl, i) => {
    const it = save.gear[sl], x = 197 + i * 146; btn(x, 90, 140, 46, '', () => enchItem = it, { off: !it || enc.t > 0, col: it && it === enchItem ? '#a06a20' : '#2a2a48' });
    if (it) { slotIcon(sl, it.r, x + 24, 113, 2.4); txt(SLOT_LBL[sl] + (it.ench ? ` +${it.ench}` : ''), x + 46, 117, 13, '#fff', 'left', 'bold'); } else txt(SLOT_LBL[sl], x + 70, 117, 13, '#667', 'center');
  });
  if (enchItem && !SLOTS.some(sl => save.gear[sl] === enchItem) && !save.bag.includes(enchItem)) enchItem = null;
  const it = enchItem;
  if (!it) { txt('Escolhe um item equipado acima, ou usa Encantar na Mochila.', 487, 270, 15, '#aab', 'center'); return; }
  const col = RAR[it.r][1];
  panel(197, 146, 240, 192, '#16162a', col); itemCard(it, 207, 152, 226);
  const sx = 610, sy = 232, spin = enc.t > 0 ? 3.2 : .5;
  ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(sx, sy, 5, sx, sy, 90); gr.addColorStop(0, col + (enc.t > 0 ? '88' : '33')); gr.addColorStop(1, col + '00'); ctx.fillStyle = gr; ctx.fillRect(sx - 90, sy - 90, 180, 180); ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(sx, sy); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(0, 0, 66, 0, 7); ctx.stroke();
  ctx.rotate(T * spin); for (let i = 0; i < 12; i++) { ctx.rotate(.5236); ctx.fillStyle = i % 3 ? col : '#fff'; ctx.fillRect(62, -2, i % 3 ? 5 : 8, 4); }
  ctx.rotate(-T * spin * 2.2); ctx.strokeRect(-40, -40, 80, 80); ctx.rotate(.785); ctx.strokeRect(-40, -40, 80, 80); ctx.restore(); ctx.globalAlpha = 1;
  itemIcon(it, sx, sy + Math.sin(T * 2) * 2, 6.4);
  for (const q of enc.sparks) { ctx.globalAlpha = Math.max(0, q.l * 2); ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 3, 3); } ctx.globalAlpha = 1;
  if (enc.msgT > 0) { ctx.globalAlpha = Math.min(1, enc.msgT); txt(enc.msg, sx, 328, 22, enc.col, 'center', 'bold'); ctx.globalAlpha = 1; }
  wrap('Refinar: +6% a todos os atributos por nível.', 205, 360, 225, 16, 12, '#9ab'); wrap('Encantar: sorteia um efeito especial (custa ouro e diamantes). Pedras de raid evoluem o nível do item.', 205, 392, 225, 15, 12, '#9ab');
  const max = it.ench >= ENC_MAX, rc = refCost(it), sc = specCost(it), ch = max ? 0 : ENC_CH[it.ench];
  if (max) txt('Nível máximo!', 600, 360, 16, '#ffd34a', 'center', 'bold');
  else { txt(`Chance: ${ch}%`, 444, 351, 14, ch >= 70 ? '#6f6' : ch >= 40 ? '#fd5' : '#f66', 'left', 'bold'); bar(444, 357, 328, 8, ch / 100, ch >= 70 ? '#4c4' : ch >= 40 ? '#ca3' : '#c44'); }
  const rlock = !max && it.ench >= refCap();
  btn(432, 392, 165, 56, '', doRefine, { off: max || rlock || enc.t > 0 || save.gold < rc, col: '#a06a20', hot: '#c98a30' });
  txt(max ? 'Nível máximo!' : `Refinar +${it.ench} > +${it.ench + 1}`, 514, 414, 14, '#fff', 'center', 'bold'); if (!max) { if (rlock) txt(`Requer Nv ${4 * (it.ench + 1)}`, 514, 435, 13, '#f88', 'center', 'bold'); else txt(`¢${rc}`, 514, 435, 14, '#fd5', 'center', 'bold'); }
  const sg = specGems(it);
  btn(607, 392, 165, 56, '', doSpec, { off: enc.t > 0 || save.gold < sc || save.gems < sg, col: '#5a3a7a', hot: '#7a55a0' });
  txt('Encantar especial', 689, 414, 14, '#fff', 'center', 'bold'); txt(`¢${sc}`, 658, 435, 13, '#fd5', 'center', 'bold'); txt(`◆${sg}`, 725, 435, 13, save.gems >= sg ? '#7fe8ff' : '#f88', 'center', 'bold');
  { const have = save.stones[it.r], capIl = it.il >= 120, needLv = Math.ceil((it.il + 2) / 2), lvLock = !capIl && needLv > save.pl.lv;
    btn(432, 452, 200, 24, capIl ? 'Nível de item máximo' : lvLock ? `Evoluir exige Nv ${needLv}` : `Evoluir ${it.il}>${Math.min(120, it.il + 2)} · Pedra (${have})`, () => evolveItem(it), { off: enc.t > 0 || capIl || lvLock || !have, size: 12, col: '#2a5a7a', hot: '#3a7aa0' });
    const rfc = reforgeCost(it); btn(638, 452, 134, 24, `Reforjar ¢${gfmt(rfc)}`, () => reforgeItem(it), { off: enc.t > 0 || !it.aff.length || save.gold < rfc, size: 12, col: '#7a4a2a', hot: '#a0643a' }); }
  if (save.gold < Math.min(max ? 1e9 : rc, sc)) txt('Ouro insuficiente', 600, 383, 13, '#f88', 'center', 'bold'); else if (save.gems < sg) txt('Diamantes insuficientes', 689, 383, 13, '#f88', 'center', 'bold');
}

const fr = v => v - Math.floor(v), rn = k => fr(Math.sin(k * 127.1 + 311.7) * 43758.5453);
function pxl(x, y, sz, col, a = 1) { ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = col; ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz); ctx.globalAlpha = 1; }
function starfx(x, y, r, col, a) { ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = col; ctx.fillRect(Math.round(x - r), Math.round(y), r * 2 + 1, 1); ctx.fillRect(Math.round(x), Math.round(y - r), 1, r * 2 + 1); ctx.globalAlpha = 1; }
function zig(x1, y1, x2, y2, n, amp, seed) { ctx.beginPath(); ctx.moveTo(x1, y1); for (let i = 1; i < n; i++) { const q = i / n; ctx.lineTo(x1 + (x2 - x1) * q + (rn(seed + i) - .5) * amp, y1 + (y2 - y1) * q + (rn(seed + i * 3.1) - .5) * amp); } ctx.lineTo(x2, y2); ctx.stroke(); }
// cada arma tem o seu proprio efeito animado no pedestal
const SHOP_FX = {
  k_sword(x, y, t) { // reflexo a varrer a lamina + estrela
    const p = (t * .6) % 1.7;
    if (p < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6 * Math.sin(p * Math.PI); ctx.fillStyle = '#fff'; const sx = x - 36 + p * 72; ctx.beginPath(); ctx.moveTo(sx, y - 30); ctx.lineTo(sx + 9, y - 30); ctx.lineTo(sx - 7, y + 30); ctx.lineTo(sx - 16, y + 30); ctx.fill(); ctx.restore(); }
    const tw = (t * 1.1) % 1; starfx(x + 16, y - 16, 2 + Math.round(3 * Math.sin(tw * Math.PI)), '#fff', Math.sin(tw * Math.PI));
  },
  k_axe(x, y, t) { // ondas de choque + estilhacos
    for (let i = 0; i < 2; i++) { const p = (t * .8 + i * .5) % 1; ctx.strokeStyle = '#ff8a4a'; ctx.globalAlpha = (1 - p) * .8; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 6 + p * 28, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { const p = (t * 1.2 + i * .25) % 1, a = i * 1.57 + .8; pxl(x + Math.cos(a) * (8 + p * 24), y + Math.sin(a) * (8 + p * 24), 3, '#ffb070', 1 - p); }
  },
  k_spear(x, y, t) { // linhas de velocidade
    ctx.fillStyle = '#dff';
    for (let i = 0; i < 5; i++) { const p = (t * 1.6 + rn(i)) % 1, yy = y - 24 + rn(i + 9) * 48; ctx.globalAlpha = Math.sin(p * Math.PI) * .7; ctx.fillRect(Math.round(x - 30 + p * 60), Math.round(yy), 10 + Math.round(rn(i + 3) * 8), 1); } ctx.globalAlpha = 1;
  },
  k_hammer(x, y, t) { // faiscas eletricas
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 1.5; const k = Math.floor(t * 8);
    for (let i = 0; i < 3; i++) { const a = rn(k + i * 7) * 6.283, r1 = 8 + rn(k + i) * 6; ctx.globalAlpha = .5 + .5 * rn(k * 3 + i); zig(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * 28, y + Math.sin(a) * 28, 4, 8, k + i); } ctx.restore();
  },
  k_blade(x, y, t) { // gotas de sangue + pulso vermelho
    for (let i = 0; i < 4; i++) { const p = (t * .9 + i * .27) % 1, bx = x - 18 + i * 12 + rn(i) * 4, by = y - 26 + p * 52; pxl(bx, by, 3, '#e0203a', 1 - p * .7); pxl(bx, by - 3, 2, '#e0203a', 1 - p * .7); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ff2040'; ctx.globalAlpha = .12 + .1 * Math.sin(t * 5); ctx.fillRect(x - 30, y - 30, 60, 60); ctx.restore();
  },
  a_bow(x, y, t) { // flechas a cruzar
    for (let i = 0; i < 2; i++) { const p = (t * .9 + i * .5) % 1, ax = x - 34 + p * 68, ay = y + 20 - p * 40 + i * 6; ctx.globalAlpha = Math.sin(p * Math.PI); ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 9, ay + 6); ctx.lineTo(ax, ay); ctx.stroke(); pxl(ax + 1, ay - 1, 3, '#fff'); } ctx.globalAlpha = 1;
  },
  a_triple(x, y, t) { // folhas em espiral
    for (let i = 0; i < 6; i++) { const p = (t * .5 + i / 6) % 1, a = i * 1.05 + t, r = 6 + p * 24; pxl(x + Math.cos(a) * r, y + 22 - p * 44 + Math.sin(a * 2) * 3, 3, i % 2 ? '#7cff8a' : '#2fbf4a', Math.sin(p * Math.PI)); }
  },
  a_cross(x, y, t) { // virote com rasto + impacto
    const p = (t * 1.1) % 1.3, bx = x - 34 + p * 80;
    if (p < 1) { ctx.fillStyle = '#e8e8ff'; ctx.fillRect(Math.round(bx), Math.round(y + 12), 10, 2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#99ccff'; ctx.globalAlpha = .4; ctx.fillRect(Math.round(bx - 22), Math.round(y + 12), 22, 2); ctx.restore(); }
    else { const q = (p - 1) / .3; starfx(x + 40, y + 12, 3 + Math.round(q * 5), '#fff', 1 - q); }
  },
  a_fire(x, y, t) { // chamas a subir
    for (let i = 0; i < 8; i++) { const p = (t * 1.1 + i / 8) % 1; pxl(x - 16 + i * 4.5 + Math.sin(t * 6 + i) * 2, y + 28 - p * 52, 5 * (1 - p) + 1, p < .5 ? '#ffd34a' : '#ff6a1a', 1 - p * .6); }
  },
  a_dark(x, y, t) { // sombras a rodar + onda escura
    for (let i = 0; i < 6; i++) { const a = -t * 1.8 + i * 1.047, r = 22 - ((t * .6 + i / 6) % 1) * 12; pxl(x + Math.cos(a) * r, y + Math.sin(a) * r * .8, 3, i % 2 ? '#c030ff' : '#3a0a5a', .9); }
    const b = (t * .5) % 1; ctx.strokeStyle = '#8a2ad0'; ctx.globalAlpha = (1 - b) * .6; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 4 + b * 26, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  },
  m_fire(x, y, t) { // espiral de brasas + chama pulsante
    for (let i = 0; i < 10; i++) { const a = t * 3 + i * .63, p = (t * .8 + i / 10) % 1, r = 6 + p * 22; pxl(x + Math.cos(a) * r, y + Math.sin(a) * r * .9 - p * 8, 4 * (1 - p) + 1, i % 3 ? '#ff9a2a' : '#ffe066', 1 - p); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ff5a10'; ctx.globalAlpha = .2 + .1 * Math.sin(t * 9); ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(t * 7) * 3, 0, 7); ctx.fill(); ctx.restore();
  },
  m_ice(x, y, t) { // neve a cair + estrelas de gelo
    for (let i = 0; i < 9; i++) { const p = (t * .35 + i / 9) % 1; pxl(x - 28 + rn(i) * 56 + Math.sin(t * 2 + i) * 4, y - 30 + p * 60, i % 3 ? 2 : 3, '#e8ffff', Math.sin(p * Math.PI)); }
    const tw = (t * .9) % 1; starfx(x + 12, y - 10, 2 + Math.round(4 * Math.sin(tw * Math.PI)), '#99eeff', Math.sin(tw * Math.PI));
    const tw2 = (t * .9 + .5) % 1; starfx(x - 14, y + 8, 2 + Math.round(3 * Math.sin(tw2 * Math.PI)), '#fff', Math.sin(tw2 * Math.PI));
  },
  m_bolt(x, y, t) { // relampagos a cair
    const k = Math.floor(t * 5), on = rn(k) > .35, ph = (t * 5) % 1;
    if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; ctx.globalAlpha = .9 * (1 - ph); zig(x - 18 + rn(k + 5) * 36, y - 30, x + (rn(k + 2) - .5) * 16, y + 4, 6, 14, k * 3); ctx.fillStyle = '#fff6a0'; ctx.globalAlpha = .12 * (1 - ph); ctx.fillRect(x - 30, y - 30, 60, 60); ctx.restore(); }
    for (let i = 0; i < 3; i++) pxl(x + (rn(k + i) - .5) * 40, y + (rn(k + i + 4) - .5) * 40, 2, '#fff', .8 * rn(k + i + 9));
  },
  m_arcane(x, y, t) { // circulo toxico com bolhas a subir
    ctx.save(); ctx.globalAlpha = .2; ctx.fillStyle = '#7acb1f'; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); ctx.globalAlpha = .85; ctx.strokeStyle = '#b6f23a'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.stroke(); ctx.restore();
    for (let i = 0; i < 8; i++) { const p = (t * .5 + i / 8) % 1, a = i * 2.39, r = 8 + (i * 5) % 14; pxl(x + Math.cos(a) * r, y + Math.sin(a) * r * .9 - p * 14, 3, i % 2 ? '#e8ffb0' : '#9be32f', 1 - p); }
  },
  m_dark(x, y, t) { // dreno de vida: pontos vermelhos a ser sugados para o centro
    for (let i = 0; i < 12; i++) { const p = (t * .6 + i / 12) % 1, a = i * .9 + t * .8, r = 30 * (1 - p); pxl(x + Math.cos(a) * r, y + Math.sin(a) * r * .85, 3, i % 2 ? '#ff4a6a' : '#8a0f2a', Math.min(1, p * 3)); }
    pxl(x, y, 6, '#ff4a6a', 1); pxl(x - 1, y - 1, 2, '#ff9aa8', 1);
  },
};
const TIERS = [['Comum', '#9aa4b8'], ['Raro', '#5aa8ff'], ['Épico', '#b06aff'], ['Lendário', '#ff9a2a'], ['Mítico', '#ff4a6a']];
const WCOL = Object.assign({ k_sword: '#cfe0ff', k_axe: '#ffb070', k_spear: '#bfe8ff', k_hammer: '#ffe14a', k_blade: '#ff4060', a_bow: '#ffcf80', a_triple: '#7cff8a', a_cross: '#c0c8ff', a_fire: '#ff7a1a', a_dark: '#c030ff' }, GLOWW);
function weaponReq(i) {
  const r = WEAPON_REQ[i], needRaid = r.raid !== undefined && !(((save.raids[r.raid] || [])[r.d || 0] | 0) > 0), ok = save.pl.lv >= r.lv && !needRaid;
  return { ok, text: i === 0 ? '' : `Requer Nv ${r.lv}` + (r.raid !== undefined ? ` · Raid ${RAID_D[r.d || 0].n}: ${MISSIONS[r.raid].name}` : '') };
}
function hubWeapons() {
  const c = CLASSES[save.cls];
  c.weapons.forEach((w, i) => {
    const x = 195, y = 88 + i * 79, wd = 585, h = 72, own = save.own[save.cls][i], eq = save.eq[save.cls] === i, lv = save.wl[w.id] || 0;
    const [tn, tc] = TIERS[i], wc = WCOL[w.id], ac = auraCol(lv), rq = weaponReq(i), locked = !own && !rq.ok;
    if (locked) ui.push({ x, y, w: wd, h, fn: () => lockClick(w.id) });
    panel(x, y, wd, h, '#232342', own ? tc : shade(tc, -.6));
    // brilho que passa pelo cartao
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, wd - 4, h - 4); ctx.clip();
    const sx = x + ((T * 90 + i * 140) % (wd + 200)) - 100; ctx.globalAlpha = own ? .1 : .04; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 36, y); ctx.lineTo(sx + 16, y + h); ctx.lineTo(sx - 20, y + h); ctx.fill(); ctx.globalAlpha = 1; ctx.restore();
    // pedestal animado
    const ix = x + 40, iy = y + 36;
    ctx.fillStyle = '#12121f'; ctx.fillRect(ix - 30, iy - 30, 60, 60); ctx.fillStyle = shade(tc, -.6); ctx.fillRect(ix - 30, iy + 27, 60, 3);
    ctx.save(); ctx.beginPath(); ctx.rect(ix - 30, iy - 30, 60, 60); ctx.clip();
    ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(ix, iy, 2, ix, iy, 36); gr.addColorStop(0, wc + (own ? 'bb' : '33')); gr.addColorStop(1, wc + '00');
    ctx.fillStyle = gr; ctx.globalAlpha = .7 + .3 * Math.sin(T * 3 + i); ctx.fillRect(ix - 30, iy - 30, 60, 60);
    if (ac) { ctx.fillStyle = ac; ctx.globalAlpha = .18 + .08 * Math.sin(T * 6); ctx.beginPath(); ctx.arc(ix, iy, 26, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const bob = Math.sin(T * 2.4 + i) * 2.5, sway = Math.sin(T * 1.6 + i) * .12;
    if (locked) drawLockBig(ix + lkOff(w.id), iy + 2, 1.05, 0); else { ctx.globalAlpha = own ? 1 : .45; weaponIcon(w.id, ix, iy + bob, 2.6, -.785 + sway); ctx.globalAlpha = 1; }
    if (own) {
      SHOP_FX[w.id](ix, iy, T);
      if (ac) for (let q = 0; q < 4; q++) { const a2 = T * 1.4 + q * 1.5708, r = 24 + 2 * Math.sin(T * 3 + q); pxl(ix + Math.cos(a2) * r, iy + Math.sin(a2) * r * .8, 2, ac, .9); }
    }
    ctx.restore();
    const nm = locked ? 'Arma bloqueada' : w.n + (lv ? `  +${lv}` : '');
    txt(nm, x + 80, y + 22, 17, own ? '#fff' : '#889', 'left', 'bold'); txt(tn, x + 80 + txtW(nm, 17, 'bold') + 10, y + 21, 12, tc, 'left', 'bold');
    const sst = wStar(w.id); if (own && sst) { if (sst >= STAR_MAX) { drawIcon('star', x + wd - 226, y + 17, 1.6); txt('MAX', x + wd - 214, y + 22, 13, '#ffd34a', 'left', 'bold'); } else for (let q = 0; q < sst; q++) drawIcon('star', x + wd - 228 + q * 12, y + 17, 1.4); }
    txt(own || rq.ok ? w.info : rq.text, x + 80, y + 40, 12, own || rq.ok ? '#bbc' : '#f88'); if (!locked) txt(`Dano ${Math.round(w.dmg * 10 * wlm(lv) * STAR_MULT[wStar(w.id)] * TUNE.cls[save.cls])} · ${(1 / w.cd).toFixed(1)}/s`, x + wd - 74, y + 66, 11, '#9cf', 'center');
    if (!eq && !locked) { const pc = Math.round((wpnDps(w) / wpnDps(c.weapons[save.eq[save.cls]]) - 1) * 100); txt(pc === 0 ? 'igual à equipada' : `${pc > 0 ? '+' : ''}${pc}% vs equipada`, x + wd - 74, y + 55, 11, pc > 0 ? '#6f6' : pc < 0 ? '#f77' : '#fd5', 'center', 'bold'); }
    if (!locked) txt(`[E] ${w.sk.n} (${w.sk.cd}s): ${w.sk.d}`, x + 80, y + 58, 12, '#7cf');
    if (!own) btn(x + wd - 135, y + 8, 122, 36, rq.ok ? `Comprar ¢${w.price}` : 'Bloqueada', () => { if (rq.ok && save.gold >= w.price) { spendG(w.price); save.own[save.cls][i] = 1; save.wst[w.id][0] = Math.max(1, save.wst[w.id][0]); save.eq[save.cls] = i; persist(); SFX.buy(); } else if (!rq.ok) lockClick(w.id); else SFX.error(); }, { col: !rq.ok ? '#26262f' : save.gold >= w.price ? '#a06a20' : '#4a3a3a', hot: !rq.ok ? '#33333f' : '#c98a30', size: 14 });
    else if (!eq) btn(x + wd - 135, y + 8, 122, 36, 'Equipar', () => { save.eq[save.cls] = i; persist(); }, { size: 15 });
    else txt('✓ Equipada', x + wd - 74, y + 32, 14, '#f0c060', 'center', 'bold');
  });
}
function drawAnvil(ax, ay, id, lv) {
  ctx.fillStyle = '#4a4f5c'; ctx.beginPath(); [[-80,-40],[70,-40],[115,-28],[70,-14],[36,-14],[30,20],[60,20],[60,42],[-60,42],[-60,20],[-30,20],[-36,-14],[-80,-14]].forEach((p, i) => i ? ctx.lineTo(ax + p[0], ay + p[1]) : ctx.moveTo(ax + p[0], ay + p[1])); ctx.fill();
  ctx.fillStyle = '#8a90a0'; ctx.fillRect(ax - 80, ay - 40, 150, 6);
  const sh = anv.t > 0 ? (Math.random() - .5) * 4 : 0, ac = auraCol(lv);
  if (ac) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = ac; ctx.globalAlpha = .25 + .1 * Math.sin(T * 5); ctx.beginPath(); ctx.arc(ax - 5, ay - 58, 38, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  weaponIcon(id, ax - 5 + sh, ay - 56 + sh, 5, 0);
  ctx.save(); ctx.translate(ax + 95, ay - 150);
  ctx.rotate(anv.t > 0 ? -.5 + 1.25 * Math.max(0, Math.sin(anv.t * 14)) : -.45);
  ctx.fillStyle = '#7a5230'; ctx.fillRect(-4, 0, 8, 130); ctx.fillStyle = '#9aa0b0'; ctx.fillRect(-28, 118, 56, 24); ctx.fillStyle = '#c0c6d6'; ctx.fillRect(-28, 118, 56, 6); ctx.restore();
  for (const s of anv.sparks) { ctx.globalAlpha = Math.max(0, s.l * 2); ctx.fillStyle = s.c || '#fd6'; ctx.fillRect(s.x, s.y, 3, 3); } ctx.globalAlpha = 1;
}
function hubAnvil() {
  const c = CLASSES[save.cls];
  c.weapons.forEach((w, i) => { const own = save.own[save.cls][i], x = 197 + i * 117, lv = save.wl[w.id] || 0; btn(x, 90, 110, 46, '', () => anvSel = i, { off: !own || anv.t > 0, col: anvSel === i ? '#a06a20' : '#2a2a48' }); if (own) { weaponIcon(w.id, x + 32, 113, 1.8); txt('+' + lv, x + 62, 119, 16, '#fff', 'left', 'bold'); } else drawIcon('lock', x + 55, 113, 2); });
  const w = c.weapons[anvSel], lv = save.wl[w.id] || 0, max = lv >= ANV_MAX, lcap = !max && lv >= anvCap();
  weaponIcon(w.id, 220, 158, 1.5); txt(w.n, 244, 165, 19, '#fff', 'left', 'bold');
  txt(`Nível +${lv}${max ? '  (MÁXIMO)' : ` > +${lv + 1}`}`, 205, 188, 16, '#f0c060', 'left', 'bold');
  const d0 = Math.round(w.dmg * 10 * wlm(lv)), d1 = Math.round(w.dmg * 10 * wlm(lv + 1));
  txt(max ? `Dano ${d0}` : `Dano ${d0} > ${d1}`, 205, 208, 14, '#9cf'); txt(T2(`Máx. +${ANV_MAX} · agora até +${anvCap()} (nível ÷ 3)`, `Max +${ANV_MAX} · now up to +${anvCap()} (level ÷ 3)`), 205, 224, 11, '#778');
  if (max) txt('Nível máximo!', 205, 250, 18, '#ffd34a', 'left', 'bold');
  else if (lcap) { txt(T2(`Requer nível ${3 * (lv + 1)} para +${lv + 1}`, `Requires level ${3 * (lv + 1)} for +${lv + 1}`), 205, 252, 16, '#f88', 'left', 'bold'); wrap('A Bigorna só melhora a arma até ao nível do jogador ÷ 3. Sobe de nível para continuar.', 205, 278, 215, 15, 12, '#9ab'); }
  else {
    if (anvLucky && !luckOk(lv, w.id)) anvLucky = false;
    const base = ANV_CH[lv], pity = Math.min(25, 5 * (save.pity[w.id] || 0)), lucky = anvLucky ? LUCKY_BONUS : 0, ch = Math.min(100, base + pity + lucky);
    const lc = luckyCost(lv), pc = protCost(lv), useP = anvProt && lv >= 5, total = anvCost(lv) + (anvLucky ? lc : 0) + (useP ? pc : 0);
    txt(`Chance total: ${ch}%`, 205, 241, 17, ch >= 70 ? '#6f6' : ch >= 40 ? '#fd5' : '#f66', 'left', 'bold');
    const bw = 196; ctx.fillStyle = '#05050a'; ctx.fillRect(204, 247, bw + 2, 12); ctx.fillStyle = '#1a1a28'; ctx.fillRect(205, 248, bw, 10);
    let px = 205; for (const [v, col] of [[base, ch >= 70 ? '#4c4' : ch >= 40 ? '#ca3' : '#c44'], [pity, '#ffd34a'], [lucky, '#6cf']]) { const ww = Math.min(bw * v / 100, 205 + bw - px); ctx.fillStyle = col; ctx.fillRect(px, 248, ww, 10); px += ww; }
    txt(`Chance base: ${base}% · Bónus de azar: +${pity}%`, 205, 272, 11, '#9ab');
    wrap(lv >= 5 ? 'Se falhar: perdes o ouro e há 35% de a arma descer 1 nível (evitável com Proteção).' : 'Se falhar: perdes só o ouro.', 205, 288, 205, 13, 11, lv >= 5 ? '#f99' : '#9ab');
    const lOk = luckOk(lv, w.id);
    btn(205, 316, 200, 28, lOk ? `${anvLucky ? '✓' : '·'} Amuleto da Sorte (+15%) ¢${lc}` : 'Sorte indisponível (85%+)', () => { if (lOk) anvLucky = !anvLucky; else lockClick('lucky'); }, { size: 11, off: anv.t > 0, col: !lOk ? '#26262f' : anvLucky ? '#2f6a8a' : '#2a2a48' });
    if (lv >= 5) btn(205, 348, 200, 28, `${anvProt ? '✓' : '·'} Pergaminho de Proteção ¢${pc}`, () => anvProt = !anvProt, { size: 11, off: anv.t > 0, col: anvProt ? '#2f7a4a' : '#2a2a48' });
    txt(`Custo total: ¢${total}`, 205, 400, 15, '#fd5');
    btn(205, 410, 200, 44, anv.t > 0 ? 'A forjar…' : 'MARTELAR!', () => hammer(anvSel), { off: anv.t > 0 || save.gold < total, col: '#a06a20', hot: '#c98a30', size: 19 });
    if (save.gold < total) txt('Ouro insuficiente', 305, 470, 12, '#f88', 'center');
  }
  const pf = save.pity[w.id] || 0;
  txt(`Falhas seguidas: ${pf}`, 600, 160, 13, pf ? '#ffd34a' : '#778', 'center');
  drawAnvil(615, 335, w.id, lv);
  txt('Histórico:', 470, 409, 12, '#aab');
  anvHist.slice(-7).forEach((h, i) => ctx.drawImage(ICN[h.ok ? 'check' : h.down ? 'cross_down' : 'cross'], 530 + i * 28, 392, 24, 24));   // icones 16x16 desenhados a mao, a 1.5x
  if (anv.msgT > 0) { ctx.globalAlpha = Math.min(1, anv.msgT); txt(anv.msg, 615, 440, 24, anv.col, 'center', 'bold'); if (anv.msg2) txt(anv.msg2, 615, 460, 14, '#ffd34a', 'center', 'bold'); ctx.globalAlpha = 1; }
  txt('Marcos: +5 brilho · +10 faíscas · +12 aura lendária · +16 aura mítica', 615, 478, 11, '#aab', 'center');
}
function hammer(i) {
  const w = CLASSES[save.cls].weapons[i], lv = save.wl[w.id] || 0;
  if (anv.t > 0 || lv >= ANV_MAX) return;
  if (lv >= anvCap()) { SFX.error(); return; }
  if (anvLucky && !luckOk(lv, w.id)) anvLucky = false;
  const useP = anvProt && lv >= 5, total = anvCost(lv) + (anvLucky ? luckyCost(lv) : 0) + (useP ? protCost(lv) : 0);
  if (save.gold < total) { SFX.error(); return; }
  spendG(total);
  const chance = Math.min(100, ANV_CH[lv] + Math.min(25, 5 * (save.pity[w.id] || 0)) + (anvLucky ? LUCKY_BONUS : 0));
  const ok = Math.random() * 100 < chance, wouldDown = !ok && lv >= 5 && Math.random() < .35, down = wouldDown && !useP;
  save.pity[w.id] = ok ? 0 : (save.pity[w.id] || 0) + 1;
  anv = { t: 1, res: { ok, down, saved: wouldDown && !down, id: w.id, lv }, msg: '', msg2: '', msgT: 0, sparks: [], hit: 0 };
  anvLucky = false; anvProt = false; persist();
}
function updateAnvil(dt) {
  for (const s of anv.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; s.l -= dt; } anv.sparks = anv.sparks.filter(s => s.l > 0);
  if (anv.msgT > 0) anv.msgT -= dt;
  if (anv.t > 0) {
    const before = Math.floor(anv.t * 14 / 3.14159); anv.t -= dt; const after = Math.floor(anv.t * 14 / 3.14159);
    if (before !== after && anv.t > 0.05) { SFX.clang(); for (let i = 0; i < 6; i++) anv.sparks.push({ x: 605, y: 295, vx: (Math.random() - .5) * 200, vy: -Math.random() * 200, l: .5 }); }
    if (anv.t <= 0) {
      const r = anv.res; anv.t = 0; anv.msg2 = '';
      if (r.ok) { save.wl[r.id] = r.lv + 1; anv.msg = `SUCESSO! +${r.lv + 1}`; anv.col = '#6f6'; if ([5, 10, 12, 16, 20].includes(r.lv + 1)) anv.msg2 = 'NOVO MARCO!'; SFX.buy(); }
      else if (r.down) { save.wl[r.id] = r.lv - 1; anv.msg = `FALHOU! Desceu para +${r.lv - 1}`; anv.col = '#f55'; SFX.error(); }
      else { anv.msg = r.saved ? 'FALHOU... (protegida)' : 'FALHOU...'; anv.col = '#f96'; SFX.error(); }
      anvHist.push({ ok: r.ok, down: r.down }); if (anvHist.length > 12) anvHist.shift();
      anv.msgT = 2.8; persist();
      const cols = r.ok ? ['#fd6', '#fff', '#6f6'] : ['#f96', '#888'];
      for (let i = 0; i < (r.ok ? 46 : 22); i++) anv.sparks.push({ x: 605, y: 295, vx: (Math.random() - .5) * 360, vy: -Math.random() * 300, l: .8, c: cols[i % cols.length] });
      if (r.ok) SFX.clang();
    }
  }
}
/* ----- Fusão (armas e equipamento) ----- */
let fuseSel = 0, fuseMode = 'w', fz = { t: 0, msg: '', msgT: 0, col: '#fff', sparks: [] };
const copyPrice = i => Math.max(300, CLASSES[save.cls].weapons[i].price);   // cada copia custa o preco da arma
const gSt = it => it.st || 0;
function starIcons(n, cx, cy, k) { for (let q = 0; q < n; q++) drawIcon('star', cx + (q - (n - 1) / 2) * 9 * k, cy, k); }
function fxBurst(msg, col) {
  fz.t = .7; fz.msg = msg; fz.msgT = 2.4; fz.col = col;
  for (let i = 0; i < 40; i++) fz.sparks.push({ x: 487 + (Math.random() - .5) * 240, y: 215 + (Math.random() - .5) * 60, vx: (Math.random() - .5) * 300, vy: -Math.random() * 260, l: .9, c: i % 2 ? '#ffd34a' : '#fff' });
  SFX.special(); SFX.buy(); persist();
}
const wFuseFee = (id, t) => { const w = CLASSES[save.cls].weapons.find(q => q.id === id); return Math.round((200 + (w ? w.price : 0) * .08) * (1 + t) * lvMul() * 2.5); };   // cada fusao custa ouro: sobe com a estrela, o preco da arma e o nivel
const gFuseFee = it => Math.round(150 * (1 + it.il * .12) * (1 + it.r) * (1 + gSt(it)) * lvMul() * 2.5);
function doFuse(id, t, all) {
  if (save.pl.lv < FUSE_LV) { SFX.error(); return; }
  const a = save.wst[id]; let n = 0;
  const step = tt => { const fee = wFuseFee(id, tt); if (tt < STAR_MAX && a[tt] >= FUSE_N && save.gold >= fee) { spendG(fee); a[tt] -= FUSE_N; a[tt + 1]++; n++; return true; } return false; };
  if (all) { for (let tt = 0; tt < STAR_MAX; tt++) while (step(tt)); } else step(t);
  if (!n) { SFX.error(); return; }
  const st = wStar(id); fxBurst(st >= STAR_MAX ? 'MAX!' : `FUSÃO! ${st}★`, st >= STAR_MAX ? '#ffd34a' : '#9fe');
}
const itemBand = it => Math.floor((Math.max(1, it.il) - 1) / 10), bandName = b => `${b * 10 + 1}–${b * 10 + 10}`;   // faixas de nivel de item
const fuseKeyOf = it => it.slot + '|' + it.r + '|' + gSt(it) + '|' + itemBand(it);
const fuseNewIl = pick => Math.round(pick.reduce((a, q) => a + q.il, 0) / Math.max(1, pick.length));   // o nivel final e a media dos itens usados
function gearGroups() {
  const m = {}; save.bag.forEach(it => { if (it.slot === 'ring' || gSt(it) >= STAR_MAX || it.lk) return;   // o anel nao se funde
    (m[fuseKeyOf(it)] = m[fuseKeyOf(it)] || []).push(it); });
  return Object.values(m).filter(g => g.length >= 2).sort((p, q) => q.length - p.length || q[0].r - p[0].r);
}
let fuseGrp = null, fusePick = null, fuseKeep = null;
function fuseGear(pick, keep) {
  if (save.pl.lv < FUSE_LV || !pick || pick.length < FUSE_N || !keep || !pick.includes(keep)) { SFX.error(); return; }
  const gone = pick.filter(it => it !== keep), fee = gFuseFee(keep); if (save.gold < fee) { SFX.error(); return; } spendG(fee); statUp('fuses');
  const il2 = Math.max(1, Math.min(120, fuseNewIl(pick))); save.bag = save.bag.filter(it => !gone.includes(it)); if (il2 !== keep.il) setItemLevel(keep, il2); keep.st = gSt(keep) + 1; if (gone.includes(enchItem)) enchItem = null; bagSel = -1; fusePick = null; fuseKeep = null;
  fxBurst(keep.st >= STAR_MAX ? 'MAX!' : `FUSÃO! ${keep.st}★`, keep.st >= STAR_MAX ? '#ffd34a' : '#9fe');
}
function updateFuse(dt) { for (const q of fz.sparks) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.l -= dt; } fz.sparks = fz.sparks.filter(q => q.l > 0); if (fz.msgT > 0) fz.msgT -= dt; if (fz.t > 0) fz.t -= dt; }
function hubFuse() {
  const lock = save.pl.lv < FUSE_LV;
  [['w', 'Armas'], ['g', 'Equipamento']].forEach(([k, l], i) => btn(197 + i * 128, 88, 122, 24, l, () => fuseMode = k, { size: 13, col: fuseMode === k ? '#a8821f' : '#2a2a48' }));
  if (lock) { drawIcon('lock', 520, 100, 1.6); txt(`Desbloqueia no Nível ${FUSE_LV} (nível atual: ${save.pl.lv})`, 780, 105, 13, '#f88', 'right', 'bold'); }
  if (fuseMode === 'w') {
    const c = CLASSES[save.cls];
    c.weapons.forEach((w, i) => {
      const x = 197 + i * 117, tot = wTotal(w.id), st = wStar(w.id);
      btn(x, 116, 110, 40, '', () => { if (!save.own[save.cls][i] && !weaponReq(i).ok) lockClick(w.id); else fuseSel = i; }, { col: fuseSel === i ? '#a8821f' : '#2a2a48' });
      if (!save.own[save.cls][i] && !weaponReq(i).ok) drawIcon('lock', x + 55, 136, 1.8); else { weaponIcon(w.id, x + 28, 136, 1.6); txt(tot ? 'x' + tot : '—', x + 54, 142, 15, tot ? '#fff' : '#667', 'left', 'bold'); }
      if (st) drawIcon('star', x + 98, 126, 1.3);
    });
    const w = c.weapons[fuseSel], a = save.wst[w.id], st = wStar(w.id), rq = weaponReq(fuseSel), cp = copyPrice(fuseSel);
    for (let t = 0; t <= STAR_MAX; t++) {
      const x = 197 + t * 148, y = 164, cur = st === t && wTotal(w.id) > 0;
      bevel(x, y, 140, 86, cur ? '#2c2410' : '#12121f', cur ? '#ffd34a' : '#33334a', '#05050a');
      if (t === 0) txt('Base', x + 70, y + 16, 13, '#889', 'center'); else starIcons(t, x + (t === STAR_MAX ? 52 : 70), y + 11, 1.2);
      if (t === STAR_MAX) txt('MAX', x + 108, y + 16, 12, '#ffd34a', 'center', 'bold');
      ctx.globalAlpha = a[t] > 0 ? 1 : .3; STAR_OV = t; weaponIcon(w.id, x + 70, y + 46, 1.9, -.785); STAR_OV = -1; ctx.globalAlpha = 1;
      txt('x' + a[t], x + 70, y + 80, 16, a[t] > 0 ? '#fff' : '#556', 'center', 'bold');
      if (t < STAR_MAX) btn(x, y + 90, 140, 22, `${FUSE_N} > 1 · ¢${gfmt(wFuseFee(w.id, t))}`, () => doFuse(w.id, t, false), { size: 12, off: lock || a[t] < FUSE_N || save.gold < wFuseFee(w.id, t), col: '#2f7a4a', hot: '#3fa061' });
    }
    panel(197, 284, 585, 192, '#16162a');
    txt(st ? `Estrela atual: ${st}★` + (st >= STAR_MAX ? ' (MAX)' : '') : 'Estrela atual: nenhuma', 212, 310, 17, '#f0c060', 'left', 'bold');
    txt(`Dano ×${STAR_MULT[st].toFixed(2)} · Vel. de ataque +${st * 3}%`, 212, 332, 14, '#9cf');
    if (st < STAR_MAX) txt(`Próximo (${st + 1}★): Dano ×${STAR_MULT[st + 1].toFixed(2)} · Vel. de ataque +${(st + 1) * 3}%`, 212, 352, 14, '#6f6');
    txt('Efeito da habilidade (E):', 212, 378, 13, '#f0c060', 'left', 'bold');
    for (let q = 1; q <= STAR_MAX; q++) txt(`${q}★ ${STAR_FX[w.id][q - 1]}`, 212, 380 + q * 17, 13, st >= q ? '#6f6' : '#778');
    txt(`Cópias de ${w.n}: ${wTotal(w.id)}`, 212, 458, 14, '#fff');
    btn(560, 360, 210, 34, 'Juntar tudo', () => doFuse(w.id, 0, true), { size: 15, off: lock, col: '#2f7a4a', hot: '#3fa061' });
    if (!rq.ok) txt(rq.text, 665, 418, 12, '#f88', 'center');
  } else {
    const gs = gearGroups(), key = g => fuseKeyOf(g[0]);
    if (!gs.length) { txt('Ainda não tens itens repetidos na Mochila.', 487, 250, 15, '#778', 'center'); txt('Os itens equipados não contam.', 487, 272, 13, '#667', 'center'); }
    else {
      if (!fuseGrp || !gs.some(g => key(g) === fuseGrp)) { fuseGrp = key(gs[0]); fusePick = null; }
      const grp = gs.find(g => key(g) === fuseGrp), items = grp.slice().sort((p, q) => (q.ench || 0) - (p.ench || 0) || q.il - p.il).slice(0, 12);
      if (!fusePick || fusePick.some(it => !save.bag.includes(it))) { fusePick = items.slice(0, FUSE_N); fuseKeep = fusePick[0] || null; }
      if (!fusePick.includes(fuseKeep)) fuseKeep = fusePick[0] || null;
      txt('1. Escolhe o grupo (mesma peça, raridade, estrelas e faixa de nível)   2. Marca 5 itens   3. Clica num marcado para o manter', 487, 134, 10, '#aab', 'center');
      gs.slice(0, 5).forEach((g, i) => {
        const y = 142 + i * 28, it = g[0], st = gSt(it), nm = ITEM_NAMES[it.slot][it.r], sel = key(g) === fuseGrp;
        btn(197, y, 585, 26, '', () => { fuseGrp = key(g); fusePick = null; }, { col: sel ? '#2c2410' : '#12121f', hot: '#2a2a48' }); ctx.fillStyle = RAR[it.r][1]; ctx.fillRect(197, y, 3, 26);
        itemIcon(it, 222, y + 13, 1.8); txt(nm, 246, y + 18, 13, RAR[it.r][1], 'left', 'bold'); for (let q = 0; q < st; q++) drawIcon('star', 246 + txtW(nm, 13, 'bold') + 12 + q * 10, y + 13, 1.1); txt('Nv ' + bandName(itemBand(it)), 520, y + 18, 12, '#9cf', 'left', 'bold');
        txt(`${Math.min(g.length, 99)} ${lang === 'en' ? 'items' : 'itens'}`, 640, y + 18, 13, g.length >= FUSE_N ? '#6f6' : '#fff', 'right', 'bold'); txt(g.length >= FUSE_N ? (lang === 'en' ? 'ready to merge' : 'pode juntar') : (lang === 'en' ? 'missing ' : 'faltam ') + (FUSE_N - g.length), 770, y + 18, 11, g.length >= FUSE_N ? '#6f6' : '#a88', 'right');
      });
      const cy0 = 142 + Math.min(gs.length, 5) * 28 + 20; if (gs.length > 5) txt(`+${gs.length - 5} ${lang === 'en' ? 'groups' : 'grupos'}`, 487, cy0 - 12, 11, '#889', 'center');
      // candidatos (marca os que queres usar; o com estrela e o que fica)
      txt('Itens do grupo', 197, cy0, 13, '#f0c060', 'left', 'bold'); txt(`${fusePick.length}/${FUSE_N} ${lang === 'en' ? 'marked' : 'marcados'}`, 487, cy0, 12, fusePick.length === FUSE_N ? '#6f6' : '#fd5', 'right', 'bold');
      items.forEach((it, i) => {
        const x = 197 + (i % 6) * 50, y = cy0 + 8 + Math.floor(i / 6) * 46, pk = fusePick.includes(it), kp = it === fuseKeep;
        bevel(x, y, 46, 41, pk ? '#16301c' : '#10101c', kp ? '#ffd34a' : pk ? '#4cf06a' : RAR[it.r][1], '#05050a'); itemIcon(it, x + 23, y + 18, 2.4);
        txt('+' + (it.ench | 0), x + 43, y + 38, 10, '#fff', 'right', 'bold'); txt('Nv' + it.il, x + 4, y + 38, 8, '#99a');
        if (kp) drawIcon('star', x + 38, y + 8, 1.2); else if (pk) txt('✓', x + 38, y + 12, 11, '#4cf06a', 'center', 'bold');
        ui.push({ x, y, w: 46, h: 41, fn: () => {
          if (pk && kp) { fusePick = fusePick.filter(q => q !== it); fuseKeep = fusePick[0] || null; }
          else if (pk) fuseKeep = it;
          else if (fusePick.length < FUSE_N) { fusePick = fusePick.concat([it]); if (!fuseKeep) fuseKeep = it; }
          else { SFX.error(); hubToast = { t: 2, s: 'Só podes marcar 5 itens: desmarca um primeiro', col: '#f88' }; }
        } });
      });
      // resultado: o item que fica e como
      const rx = 500, ry = cy0 - 10, rw = 282, rh = 172; panel(rx, ry, rw, rh, '#16162a', '#3a3a5a'); txt(lang === 'en' ? 'Result' : 'Resultado', rx + 12, ry + 20, 13, '#f0c060', 'left', 'bold');
      if (fuseKeep) {
        const k = fuseKeep, m0 = (1 + ENC_K * (k.ench | 0)) * GEAR_STAR[gSt(k)], m1 = (1 + ENC_K * (k.ench | 0)) * GEAR_STAR[Math.min(STAR_MAX, gSt(k) + 1)], col = RAR[k.r][1];
        itemIcon(k, rx + 26, ry + 48, 2.2); txt(ITEM_NAMES[k.slot][k.r] + (k.ench ? ' +' + k.ench : ''), rx + 50, ry + 44, 12, col, 'left', 'bold'); txt(`Fica este · ${gSt(k)}★ > ${gSt(k) + 1}★ · ${lang === 'en' ? 'bonus' : 'bónus'} ×${m0.toFixed(2)} > ×${m1.toFixed(2)}`, rx + 50, ry + 60, 10, '#9cf'); txt(`${lang === 'en' ? 'Item level' : 'Nível do item'}: ${k.il} > ${fuseNewIl(fusePick)} (${lang === 'en' ? 'average of the 5' : 'média dos 5'})`, rx + 50, ry + 73, 10, '#fd5');
        const lines = [[k.main.k, k.main.v]].concat(k.aff.map(a => [a.k, a.v])); lines.slice(0, 4).forEach(([kk, v], i) => txt(`${statLine(kk, ev(kk, v, m0))}  >  ${statLine(kk, ev(kk, v, m1))}`, rx + 14, ry + 84 + i * 15, 11, i ? '#7cf' : '#fff'));
        txt(`Os outros ${Math.max(0, fusePick.length - 1)} itens desaparecem.`, rx + 14, ry + 150, 10, '#f99');
      } else txt('Marca itens para ver o resultado.', rx + rw / 2, ry + 90, 12, '#667', 'center');
      const fee = fuseKeep ? gFuseFee(fuseKeep) : 0, ok = !lock && fusePick.length === FUSE_N && fuseKeep && save.gold >= fee;
      btn(197, cy0 + 106, 290, 34, fusePick.length === FUSE_N ? `Juntar ${FUSE_N} > 1 · ¢${gfmt(fee)}` : `Marca ${FUSE_N} itens`, () => fuseGear(fusePick, fuseKeep), { size: 14, off: !ok, col: '#2f7a4a', hot: '#3fa061' });
      txt(`Estrelas dão ×${GEAR_STAR[1].toFixed(2)} / ×${GEAR_STAR[2].toFixed(2)} / ×${GEAR_STAR[3].toFixed(2)} aos bónus da peça.`, 342, 462, 10, '#9cf', 'center');
    }
  }
  for (const q of fz.sparks) { ctx.globalAlpha = Math.max(0, q.l * 2); ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 3, 3); } ctx.globalAlpha = 1;
  if (fz.msgT > 0) { ctx.globalAlpha = Math.min(1, fz.msgT); txt(fz.msg, 487, 232, 24, fz.col, 'center', 'bold'); ctx.globalAlpha = 1; }
}

