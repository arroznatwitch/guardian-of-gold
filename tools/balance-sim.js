// Simulador de equilibrio (uso para quem quiser reafinar o jogo).
// Como usar: abre o jogo num servidor local, abre a consola do browser e cola este ficheiro (ou carrega-o com fetch + eval).
// Depois corre, por exemplo: spkRow("knight") para ver os segundos por morte em cada ponto da progressao,
// deep("mage", 25, 4) para ver ate que onda um bot aguenta no nivel 25 da zona 5, ou matrix2("archer", [6,12,20,28]) para comparar as 5 armas.
// Os parametros de equilibrio estao no objeto TUNE do index.html.
// Simulador de equilibrio: um bot joga o Farm; mede ondas atingidas e segundos por morte.
window.__e = []; addEventListener('error', e => __e.push(e.message)); localStorage.clear();
window.REQ = [1, 6, 12, 30, 50];
window.avg = a => a.reduce((x, y) => x + y, 0) / a.length;
window.setDmg = function (table) { for (const c in CLASSES) CLASSES[c].weapons.forEach(w => { if (table[w.id] !== undefined) w.dmg = table[w.id]; }); };
window.PTS = [[1, 0], [7, 1], [10, 1], [13, 2], [19, 3], [25, 4], [31, 5]];
window.simRun2 = function (cls, wi, L, m, opt = {}) {
  const stopWave = opt.stopWave || 8, tmax = opt.tmax || 300;
  save = newSave(cls); save.pl.lv = L; markUnl(save); save.cheat = {}; save.pts = 0; const pts = 3 * (L - 1);
  save.attr = { str: Math.round(pts * .45), vit: Math.round(pts * .25), per: Math.round(pts * .2), agi: Math.round(pts * .1) };
  const w0 = CLASSES[cls].weapons[wi]; save.own[cls][wi] = 1; save.eq[cls] = wi; save.wl[w0.id] = Math.min(12, Math.floor(L / 5));
  const stars = L >= 60 ? 2 : L >= 40 ? 1 : 0; save.wst[w0.id] = [0, 0, 0, 0, 0, 0, 0]; save.wst[w0.id][stars] = 1;
  const r = Math.min(4, Math.floor(L / 12)), il = 7 + m * 6 + Math.floor(L * .5); for (const sl of SLOTS) save.gear[sl] = genItem(sl, r, Math.min(120, il));
  startMission(m, undefined, true); const dt = 1 / 60; let t = 0, lost = 0;
  while (state === 'play' && t < tmax && R.wave <= stopWave) {
    const p = R.p, tg = targets(); let best = null, bd = 1e9; for (const e of tg) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
    keys[binds.up] = keys[binds.down] = keys[binds.left] = keys[binds.right] = false; mdown = false;
    if (best) {
      const w = curW(); mouse.x = best.x; mouse.y = best.y; const ang = Math.atan2(best.y - p.y, best.x - p.x); let mx = 0, my = 0;
      if (w.t === 'melee') {
        const rg = best.type && EN[best.type] && EN[best.type].ai === 'shoot', hit = rg || (t % 1.5) < .95, reach = w.range * .8;
        if (hit) { mdown = bd < w.range + 20; if (bd > reach) { mx = Math.cos(ang); my = Math.sin(ang); } } else { mx = -Math.cos(ang); my = -Math.sin(ang); mdown = bd < w.range + 10; }
        let near = 0; for (const e of tg) if (Math.hypot(e.x - p.x, e.y - p.y) < 70) near++; if (near >= 3) { mx = -Math.cos(ang); my = -Math.sin(ang); mdown = true; }
      } else { mdown = true; const pref = 200; if (bd < pref - 40) { mx = -Math.cos(ang); my = -Math.sin(ang); } else if (bd > pref + 80) { mx = Math.cos(ang); my = Math.sin(ang); } else { mx = -Math.sin(ang); my = Math.cos(ang); } }
      const cx = W / 2 - p.x, cy = H / 2 - p.y, ed = Math.min(p.x, W - p.x, p.y, H - p.y); if (ed < 110) { mx = cx / Math.hypot(cx, cy); my = cy / Math.hypot(cx, cy); }
      keys[binds.right] = mx > .3; keys[binds.left] = mx < -.3; keys[binds.down] = my > .3; keys[binds.up] = my < -.3;
      try { if (p.spR && bd < 140) special(); if (p.skR && bd < 260) skill(); if (p.dashCd <= 0 && p.hp < p.max * .55 && bd < 80) dash(); } catch (e) { }
    }
    const h = R.p.hp; update(dt); t += dt; if (R.p.hp < h) lost += h - R.p.hp;
  }
  const res = { wave: Math.min(R.wave, stopWave + 1), died: state === 'lose', t: Math.round(t), kills: R.kills, spk: +(t / Math.max(1, R.kills)).toFixed(2) }; state = 'hub'; return res;
};
window.bestWi = L => { let wi = 0; for (let i = 0; i < 5; i++) if (REQ[i] <= L) wi = i; return wi; };
window.spkRow = (cls, runs = 3) => cls.slice(0, 2) + ' ' + PTS.map(([L, z]) => avg(Array.from({ length: runs }, () => simRun2(cls, bestWi(L), L, z).spk)).toFixed(1).padStart(4)).join(' ');
window.deep = (cls, L, z, runs = 3, tmax = 2400) => { const rs = Array.from({ length: runs }, () => simRun2(cls, bestWi(L), L, z, { stopWave: 90, tmax })); return cls.slice(0, 2) + ' L' + L + ' z' + (z + 1) + ': onda ' + avg(rs.map(r => r.wave)).toFixed(0) + ' (' + rs.filter(r => r.died).length + '/' + runs + ' mortes, ' + Math.round(avg(rs.map(r => r.t))) + 's)'; };
window.matrix2 = (cls, Ls, runs = 3) => Ls.map(L => { const m = Math.min(5, Math.floor((L - 1) / 6)); return cls.slice(0, 2) + ' L' + String(L).padEnd(2) + ' z' + (m + 1) + ' | ' + [0, 1, 2, 3, 4].map(wi => REQ[wi] > L ? '  - ' : avg(Array.from({ length: runs }, () => simRun2(cls, wi, L, m, { stopWave: 40, tmax: 600 }).wave)).toFixed(0).padStart(3) + ' ').join(' '); }).join('\n');
window.applyCfg = function (c) {
  setDmg(c.dmg); Object.assign(TUNE, c.tune); TUNE.cls = Object.assign({}, c.cls); TUNE.dr = Object.assign({}, c.dr); TUNE.boss = c.boss.slice();
  for (const k in c.en) EN[k].hp = c.en[k]; if (c.z2) MISSIONS[1].types = c.z2;
};
'sim2 ok';
