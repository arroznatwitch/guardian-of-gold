(function () {
  const o = []; on = { token: 'a'.repeat(64) };
  save = newSave('mage'); save.pl.lv = 50; save.gold = 1e9; state = 'hub';
  const mk = (st, lk) => { const it = genItem('chest', 2, 45); it.st = st; if (lk) it.lk = 1; return it; };
  // 5 peitorais de 1 estrela, todos com cadeado, mais um de 0 estrelas
  for (let i = 0; i < 5; i++) save.bag.push(mk(1, true)); save.bag.push(mk(0, false));
  const gs = gearGroups(); const g = gs.find(x => x[0].st === 1);
  if (!g || g.length !== 5) o.push('grupo de 5 peitorais com 1 estrela (bloqueados) nao aparece: ' + (g ? g.length : 'nenhum'));
  else { fuseGear(g, g[0]); if (gSt(g[0]) !== 2) o.push('nao subiu a 2 estrelas: ' + gSt(g[0])); if (save.bag.filter(it => it.slot === 'chest' && it.st === 1).length !== 0) o.push('sobraram itens de 1 estrela'); if (g[0].il < 45) o.push('nivel do item nao subiu (+2): ' + g[0].il); }
  // 3 estrelas ja e o maximo
  const mx = []; for (let i = 0; i < 5; i++) { const it = mk(3, false); save.bag.push(it); mx.push(it); } if (gearGroups().some(x => x[0].st === 3)) o.push('itens de 3 estrelas nao deviam fundir');
  tab = 'fuse'; fuseMode = 'g'; ui = []; try { drawHub(); } catch (e) { o.push('desenho: ' + e.message); }
  return o.length ? o.join(' | ') : 'tudo ok';
})()
