(function () {
  const o = []; on = { token: 'a'.repeat(64) };
  for (const c of ['knight', 'archer', 'mage']) {
    save = newSave(c); save.pl.lv = 30; save.own[c] = [1, 1, 1, 1, 1]; save.gems = 150; save.attr = { str: 20, vit: 10, per: 5, agi: 4 }; save.pts = 7;
    for (const sl of SLOTS) save.gear[sl] = genItem(sl, 2, 20);
    const g1 = save.gear.head, total = attrSum(save.attr) + save.pts; save.eq[c] = 1;
    // 2.a build: gratis, vazia, mesmos pontos totais
    if (!loSwitch(1)) o.push(c + ' nao abriu a build 2 (devia ser gratis)');
    if (save.gear.head) o.push(c + ' build 2 devia comecar sem equipamento'); if (attrSum(save.attr) !== 0 || save.pts !== total) o.push(c + ' pontos da build 2: ' + save.pts + ' != ' + total);
    save.gear.head = genItem('head', 3, 25); const g2 = save.gear.head; save.attr.str = 12; save.pts -= 12; save.eq[c] = 3;
    // 3.a build: precisa de 200 diamantes
    if (loBuy(2)) o.push(c + ' comprou a build 3 sem diamantes');
    save.gems = 500; if (!loBuy(2)) o.push(c + ' nao comprou a build 3 com 500 diamantes'); if (save.gems !== 300) o.push(c + ' gastou ' + (500 - save.gems) + ' diamantes');
    if (save.lo.cur !== 2) o.push('build 3 nao ficou ativa');
    // voltar atras: tudo igual ao que era
    loSwitch(0); if (save.gear.head !== g1) o.push(c + ' build 1 perdeu o capacete'); if (save.attr.str !== 20 || save.attr.vit !== 10 || save.pts !== 7) o.push(c + ' build 1 perdeu atributos'); if (save.eq[c] !== 1) o.push(c + ' build 1 perdeu a arma');
    loSwitch(1); if (save.gear.head !== g2 || save.attr.str !== 12 || save.eq[c] !== 3) o.push(c + ' build 2 nao foi restaurada');
    if (attrSum(save.attr) + save.pts !== total) o.push(c + ' total de pontos mudou');
    // subir de nivel enquanto outra build esta ativa: os pontos novos ficam disponiveis em qualquer build
    save.pts += 3; const t2 = attrSum(save.attr) + save.pts; loSwitch(0); if (attrSum(save.attr) + save.pts !== t2) o.push(c + ' pontos novos perdidos ao trocar');
    // nenhum item duplicado entre builds
    const seen = new Set(); let dup = 0; const all = [].concat(Object.values(save.gear), ...save.lo.b.filter(Boolean).map(b => Object.values(b.gear)), save.bag); for (const it of all) if (it) { if (seen.has(it)) dup++; seen.add(it); } if (dup) o.push(c + ' itens duplicados: ' + dup);
    // guardar e recarregar
    const re = normalize(JSON.parse(JSON.stringify(save))); if (!re.lo || re.lo.own[2] !== 1) o.push(c + ' loadouts nao sobrevivem ao guardar');
    state = 'hub'; tab = 'char'; ui = []; try { drawHub(); loAsk = true; ui = []; drawHub(); loAsk = false; } catch (e) { o.push(c + ' desenho: ' + e.message); }
  }
  return o.length ? o.join(' | ') : 'tudo ok';
})()
