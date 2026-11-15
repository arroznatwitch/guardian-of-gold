(function () {
  const o = []; on = { token: 'a'.repeat(64) };
  for (const c of ['knight', 'archer', 'mage']) {
    save = newSave(c); save.pl.lv = 49; save.own[c] = [1, 1, 1, 1, 1]; for (const sl of SLOTS) save.gear[sl] = genItem(sl, 3, 40);
    const d = dailyEnsure(); if (d.m.length !== 3 || new Set(d.m.map(m => m.k)).size !== 3) o.push(c + ' missoes diarias invalidas');
    const d2 = JSON.stringify(dailyEnsure().m); if (d2 !== JSON.stringify(d.m)) o.push('missoes mudaram no mesmo dia');
    // progresso e resgate
    startMission(0, undefined, true); R.kills = 500; R.bossK = 5; R.lootN = 20; R.skillN = 100; R.wave = 30; dailyAll(true, 5000, 29);
    const before = save.gold, gems = save.gems; let claimed = 0; for (let i = 0; i < 3; i++) { if (dailyEnsure().m[i].p >= dailyEnsure().m[i].n) { dailyClaim(i); claimed++; } }
    if (claimed && (save.gold <= before || save.gems <= gems)) o.push(c + ' resgate nao deu recompensa'); if ((save.daily.n | 0) !== claimed) o.push(c + ' contador de missoes ' + save.daily.n + ' != ' + claimed);
    dailyClaim(0); if ((save.daily.n | 0) !== claimed) o.push('resgatou duas vezes');
    const ach = ACH.find(a => a.id === 'daily1'); if (!ach) o.push('falta a conquista daily1'); else if (claimed && ach.prog()[0] < 1) o.push('conquista daily1 sem progresso');
    // evento
    save.daily.ev.t = 0; startEvent(EVENTS[0]); if (!R.event || !R.boss || !R.boss.statue) { o.push(c + ' evento nao arrancou'); continue; }
    R.p.face = -Math.PI / 2; for (let i = 0; i < 30 * 60 + 60 && state === 'play'; i++) { attack(); if (i % 120 === 30) skill(); update(1 / 60); ui = []; drawPlayScreens(); }
    if (state !== 'win' || !R.eventRes) o.push(c + ' evento nao terminou (' + state + ')'); else if (R.eventRes.dmg <= 0) o.push(c + ' sem dano no evento'); else if (R.earned <= 0) o.push(c + ' sem ouro no evento');
    ui = []; try { drawPlayScreens(); } catch (e) { o.push('resultados: ' + e.message); }
    if (save.daily.ev.t !== 1) o.push('tentativa nao contada');
    startEvent(EVENTS[0]); const t2 = save.daily.ev.t; state = 'hub'; startEvent(EVENTS[0]); if (save.daily.ev.t !== 2 || t2 !== 2) o.push('contagem de tentativas ' + t2 + '/' + save.daily.ev.t);
    state = 'hub'; startEvent(EVENTS[0]); if (save.daily.ev.t !== 2) o.push('deixou jogar a 3.a vez');
    state = 'hub'; tab = 'events'; ui = []; try { drawHub(); } catch (e) { o.push('hub eventos: ' + e.message); }
  }
  return o.length ? o.join('\n') : 'tudo ok';
})()
