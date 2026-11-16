(function () {
  const o = []; on = { token: 'a'.repeat(64) };
  for (const c of ['knight', 'archer', 'mage']) {
    save = newSave(c); save.pl.lv = 60; save.own[c] = [1, 1, 1, 1, 1]; save.eq[c] = 2; for (const w of CLASSES[c].weapons) save.wst[w.id][0] = 1; save.attr = { str: 60, vit: 40, per: 30, agi: 20 };
    for (const sl of SLOTS) save.gear[sl] = genItem(sl, 3, 40);
    save.raids[0] = [3, 0, 0, 0, 0]; save.gems = 1500; state = 'hub'; tab = 'shop';
    const before = JSON.stringify({ gold: save.gold, gems: save.gems, raids: save.raids, stats: save.stats, bag: save.bag.length, xp: save.pl.xp, lv: save.pl.lv, wp: save.wp, daily: save.daily });
    localStorage.setItem('sentinela', 'x'); const ls0 = JSON.stringify(Object.keys(localStorage));
    const t0 = Date.now(); const r = arSimulate(0, 0); const ms = Date.now() - t0;
    if (!r || r.error) { o.push(c + ' erro na simulacao: ' + (r && r.error)); continue; }
    if (state !== 'hub' || R !== null && R !== undefined && false) o.push(c + ' estado nao foi restaurado: ' + state);
    const after = JSON.stringify({ gold: save.gold, gems: save.gems, raids: save.raids, stats: save.stats, bag: save.bag.length, xp: save.pl.xp, lv: save.pl.lv, wp: save.wp, daily: save.daily });
    if (before !== after) o.push(c + ' a simulacao mexeu no save real');
    if (autoSim) o.push(c + ' autoSim ficou ligado');
    if (!r.win) { o.push(c + ' o robo nao ganhou a raid facil (t=' + r.t + ', timeout=' + r.timeout + ')'); continue; }
    if (r.gold <= 0 || r.xp <= 0) o.push(c + ' simulacao sem recompensas');
    const n = arRuns(r); if (n < 1) o.push(c + ' sem corridas');
    shopSel = { i: 0, d: 0 }; shopSim = Object.assign(r, { key: arKey(), i: 0, d: 0 });
    const g0 = save.gold, gm0 = save.gems, bag0 = save.bag.length, raids0 = JSON.stringify(save.raids), kills0 = save.stats.kills | 0, st0 = save.stones.slice();
    arBuy();
    if (save.gems !== gm0 - AR.cost + (1 + 0) * n) o.push(c + ' diamantes: ' + gm0 + ' -> ' + save.gems + ' (esperado ' + (gm0 - AR.cost + n) + ')');
    if (save.gold <= g0) o.push(c + ' sem ouro depois de comprar'); if (JSON.stringify(save.raids) !== raids0) o.push(c + ' as raids contaram para o ranking'); if ((save.stats.kills | 0) !== kills0) o.push(c + ' os abates contaram');
    if (!shopLast || shopLast.n !== n) o.push(c + ' resumo da compra em falta'); if (save.ar.n !== 1 || save.ar.gold <= 0) o.push(c + ' contador de auto-raid');
    if (save.stones.reduce((a, b) => a + b, 0) <= st0.reduce((a, b) => a + b, 0)) o.push(c + ' sem pedras');
    // sem diamantes ou com a simulacao antiga nao compra
    save.gems = 10; shopSim = Object.assign({}, r, { key: arKey() }); const gb = save.gold; arBuy(); if (save.gold !== gb) o.push(c + ' comprou sem diamantes');
    save.gems = 5000; shopSim = Object.assign({}, r, { key: 'outro' }); arBuy(); if (save.gold !== gb) o.push(c + ' comprou com simulacao de outro personagem');
    ui = []; try { drawHub(); shopSim = Object.assign({}, r, { key: arKey() }); ui = []; drawHub(); } catch (e) { o.push(c + ' desenho: ' + e.message); }
    o.push('info ' + c + ': ' + r.t + 's, ' + n + ' corridas, ouro/raid ' + r.gold + ', ' + ms + 'ms');
  }
  return o.filter(x => !x.startsWith('info')).length ? o.join(' | ') : 'tudo ok | ' + o.join(' | ');
})()
