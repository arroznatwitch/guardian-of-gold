(async function () {
  const o = []; on = { token: 'a'.repeat(64) };
  // servidor falso: mesmas formulas do SQL (gog_claim_rewards)
  const srv = { cd: 0, rev: 5 };
  const sqlClaim = (cd, tgt) => {
    let g = 0, gm = 0, pt = 0, st = [0, 0, 0, 0, 0], items = [], wp = [];
    for (let l = cd + 1; l <= tgt; l++) {
      g += Math.round(100 + 45 * l + 0.4 * l * l); pt += l % 10 === 0 ? 4 : l % 5 === 0 ? 2 : l % 2 === 0 ? 1 : 0; gm += l % 10 === 0 ? 15 : l % 5 === 0 ? 5 : 0;
      if (l % 4 === 0) st[Math.min(4, Math.floor(l / 25))] += l % 20 === 0 ? 2 : 1;
      if (l % 5 === 0) items.push({ l, slot: ['head', 'chest', 'boots', 'amulet'][(l / 5 - 1) % 4], r: Math.min(4, Math.floor(l / 20) + (l % 10 === 0 ? 1 : 0)), il: Math.min(120, l) });
      if (l % 10 === 5) wp.push({ l, tier: Math.min(4, Math.floor(l / 15)) });
    }
    return { g, gm, pt, st, items, wp };
  };
  // as formulas do SQL tem de dar o mesmo que levelReward() do jogo
  for (let L = 1; L <= 120; L++) {
    const d = levelReward(L), x = sqlClaim(L - 1, L);
    const stoneOk = d.stone ? x.st[d.stone.r] === d.stone.n : !x.st.some(v => v);
    const itemOk = d.item ? x.items.length === 1 && x.items[0].il === d.item.il && x.items[0].r === d.item.r && x.items[0].slot === d.item.slot : x.items.length === 0;
    const wpnOk = d.wpn >= 0 ? x.wp.length === 1 && x.wp[0].tier === d.wpn : x.wp.length === 0;
    if (x.g !== d.gold || x.pt !== d.pts || x.gm !== d.gems || !stoneOk || !itemOk || !wpnOk) { o.push('formula do servidor difere de levelReward no nivel ' + L); break; }
  }
  let mode = 'ok';
  rpc = async (fn, args) => {
    if (fn !== 'gog_claim_rewards' || mode === 'missing') return { ok: false, error: 'server' };
    const tgt = Math.min(args.p_up_to, 120), n = tgt - srv.cd; if (n <= 0) return { ok: true, n: 0, rev: srv.rev, chestDone: srv.cd };
    const x = sqlClaim(srv.cd, tgt), from = srv.cd + 1; srv.cd = tgt; srv.rev++;
    return { ok: true, n, from, rev: srv.rev, chestDone: tgt, gold: x.g, gems: x.gm, pts: x.pt, stones: x.st, items: x.items, wpn: x.wp };
  };
  save = newSave('archer'); save.pl.lv = 60; save.chestDone = 0; state = 'hub'; cloud.ready = true; cloud.dirty = false; cloud.rev = 5;
  const g0 = save.gold, gm0 = save.gems, p0 = save.pts;
  await claimRewardsServer(30);
  if (save.chestDone !== 30) o.push('chestDone depois do resgate no servidor: ' + save.chestDone);
  if (save.gold <= g0 || save.gems <= gm0 || save.pts <= p0) o.push('sem recompensas aplicadas');
  if (cloud.rev !== srv.rev) o.push('rev nao atualizado: ' + cloud.rev + ' vs ' + srv.rev);
  if (!lastRw || lastRw.n !== 30) o.push('resumo em falta');
  const x = sqlClaim(0, 30); if (save.gold - g0 < x.g) o.push('ouro aplicado ' + (save.gold - g0) + ' < ' + x.g);
  // sem a funcao no servidor: usa o resgate local
  mode = 'missing'; await claimRewardsServer(40); if (save.chestDone !== 40) o.push('fallback local nao funcionou: ' + save.chestDone);
  // o botao usa claimRewards(): com a ligacao pronta tem de chamar o servidor (nao fica preso)
  if (rwBusy) o.push('rwBusy ficou ligado');
  return o.length ? o.join(' | ') : 'tudo ok';
})()
