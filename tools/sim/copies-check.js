(function () {
  const o = []; on = { token: 'a'.repeat(64) };
  for (const c of ['knight', 'archer', 'mage']) {
    save = newSave(c); save.pl.lv = 60; startMission(0, undefined, true);
    // 1) as copias que caem so podem ser de armas que ja tens (e nao desbloqueiam outras)
    const own0 = JSON.stringify(save.own[c]); for (let i = 0; i < 200; i++) giveWeaponCopy(100, 100);
    const owned = CLASSES[c].weapons.filter((w, i) => save.own[c][i]).map(w => w.id); if (R.wloot.some(id => !owned.includes(id))) o.push(c + ' caiu copia de arma que nao tens');
    const ids = R.wloot.slice(); for (const id of ids) save.wst[id][0]++; if (JSON.stringify(save.own[c]) !== own0) o.push(c + ' uma copia desbloqueou uma arma');
    // 2) recompensa por nivel com copia: nao desbloqueia
    save.chestDone = 0; save.pl.lv = 120; claimRewards(1e9); if (JSON.stringify(save.own[c]) !== own0) o.push(c + ' recompensa por nivel desbloqueou uma arma');
    // 3) vender copias: mantem sempre 1
    const id0 = CLASSES[c].weapons[0].id; save.wst[id0][0] = 6; const g0 = save.gold; sellCopies(id0, 0, 0, 3); if (save.wst[id0][0] !== 3 || save.gold <= g0) o.push(c + ' vender 3 copias: ' + save.wst[id0][0]);
    sellCopies(id0, 0, 0, 999); if (wTotal(id0) !== 1) o.push(c + ' devia ficar com 1 copia, ficou ' + wTotal(id0));
    const g1 = save.gold; sellCopies(id0, 0, 0, 1); if (save.gold !== g1 || wTotal(id0) !== 1) o.push(c + ' vendeu a ultima copia');
    state = 'hub'; tab = 'fuse'; fuseSel = 0; ui = []; try { drawHub(); } catch (e) { o.push(c + ' desenho: ' + e.message); }
  }
  return o.length ? o.join(' | ') : 'tudo ok';
})()
