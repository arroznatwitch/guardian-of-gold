(async function () {
  const o = []; on = { token: 'a'.repeat(64) }; let calls = [], mode = 'ok', rev = 10;
  rpc = async (fn, args) => {
    calls.push(fn + ':' + (args.p_what || ''));
    if (fn === 'gog_buy') {
      if (mode === 'missing') return { ok: false, error: 'server' };
      if (mode === 'funds') return { ok: false, error: 'funds' };
      rev++; return { ok: true, rev, gold: 0, gems: 0, paid: (args.p_what === 'ar' ? 3 : 0) };
    }
    if (fn === 'gog_guild_found') { if (mode === 'missing') return { ok: false, error: 'server' }; rev++; return { ok: true, rev, guild: { name: 'X' } }; }
    if (fn === 'gog_guild_create') return { ok: true, guild: { name: 'X' } };
    return { ok: false, error: 'server' };
  };
  const fresh = () => { save = newSave('knight'); save.pl.lv = 60; save.gold = 100000; save.gems = 5000; state = 'hub'; cloud.ready = true; cloud.dirty = false; cloud.rev = 5; calls = []; mode = 'ok'; buyBusy = false; };
  // mochila
  fresh(); await buyBag(1);
  if (save.bagSlots !== 2 || save.gold !== 90000) o.push('mochila: ' + save.bagSlots + ' / ouro ' + save.gold);
  if (cloud.rev !== 11) o.push('mochila: revisao nao adotada ' + cloud.rev);
  if (!calls.includes('gog_buy:bag')) o.push('mochila: nao chamou o servidor');
  fresh(); mode = 'funds'; await buyBag(1);
  if (save.bagSlots > 1 || save.gold !== 100000) o.push('mochila: comprou apesar de o servidor recusar');
  fresh(); mode = 'missing'; await buyBag(1);
  if (save.bagSlots !== 2) o.push('mochila: sem a funcao no servidor devia comprar localmente');
  fresh(); on.token = ''; await buyBag(1);
  if (save.bagSlots !== 2 || calls.length) o.push('mochila: sem sessao devia comprar localmente sem chamar o servidor'); on.token = 'a'.repeat(64);
  // 3.a build
  fresh(); const okLo = await loBuyUI();
  if (!okLo || save.gems !== 4800 || !save.lo.own[2]) o.push('build 3: ' + okLo + ' diamantes ' + save.gems);
  fresh(); mode = 'funds'; if (await loBuyUI() || save.gems !== 5000) o.push('build 3 comprada apesar da recusa do servidor');
  // Auto-Raid: o servidor devolve paid e o jogo regista-o
  fresh(); save.attr = { str: 60, vit: 40, per: 30, agi: 20 }; save.raids[0] = [3, 0, 0, 0, 0];
  for (const sl of SLOTS) save.gear[sl] = genItem(sl, 3, 40); save.own.knight = [1, 1, 1, 1, 1]; save.eq.knight = 2; for (const w of CLASSES.knight.weapons) save.wst[w.id][0] = 1;
  const r = arSimulate(0, 0); shopSel = { i: 0, d: 0 }; shopSim = Object.assign(r, { key: arKey(), i: 0, d: 0 });
  if (r.win) { await arBuyUI(); if (save.gems !== 4000) o.push('auto-raid: diamantes ' + save.gems); if (!save.ar || save.ar.paid !== 3 || save.ar.n !== 1) o.push('auto-raid: ar ' + JSON.stringify(save.ar)); if (!calls.includes('gog_buy:ar')) o.push('auto-raid: nao chamou o servidor'); }
  else o.push('auto-raid: a simulacao nao ganhou');
  // armas da loja
  fresh(); save.cls = 'knight'; const wp = CLASSES.knight.weapons[1]; await buyWeapon(1, wp);
  if (!save.own.knight[1] || save.gold !== 100000 - wp.price || save.eq.knight !== 1 || !calls.includes('gog_buy:wpn')) o.push('arma: ' + JSON.stringify(save.own.knight) + ' ouro ' + save.gold + ' ' + calls.join(','));
  fresh(); save.cls = 'knight'; mode = 'funds'; await buyWeapon(1, wp); if (save.own.knight[1] || save.gold !== 100000) o.push('arma comprada apesar da recusa do servidor');
  fresh(); save.cls = 'knight'; mode = 'missing'; await buyWeapon(1, wp); if (!save.own.knight[1]) o.push('arma: sem a funcao no servidor devia comprar localmente');
  // pets
  fresh(); ensurePets(); await buyPet('chicken', PETS.chicken.price);
  if (!save.pets.own.chicken || save.gold !== 100000 - PETS.chicken.price || !calls.includes('gog_buy:pet')) o.push('pet: ' + JSON.stringify(save.pets.own) + ' ouro ' + save.gold);
  fresh(); ensurePets(); mode = 'funds'; await buyPet('chicken', PETS.chicken.price); if (save.pets.own.chicken) o.push('pet comprado apesar da recusa do servidor');
  fresh(); ensurePets(); save.pets.own.dog = 1; petRename = 'dog'; rk.pname = 'Rex'; await confirmPetRename();
  if (save.pets.names.dog !== 'Rex' || save.gems !== 5000 - PET_RENAME || !calls.includes('gog_buy:petname')) o.push('nome do pet: ' + JSON.stringify(save.pets.names) + ' diamantes ' + save.gems);
  fresh(); ensurePets(); save.pets.own.dog = 1; petRename = 'dog'; rk.pname = 'Rex'; mode = 'funds'; await confirmPetRename(); if (save.pets.names.dog === 'Rex') o.push('nome mudado apesar da recusa do servidor');
  // guilda
  fresh(); save.pl.lv = 45; save.gold = 20000; save.gems = 150; rk.gname = 'Teste'; rk.gtag = 'TST'; await createGuild();
  if (save.gold !== 5000 || save.gems !== 50) o.push('guilda: ouro ' + save.gold + ' diamantes ' + save.gems);
  if (!calls.includes('gog_guild_found:')) o.push('guilda: nao usou gog_guild_found'); if (cloud.rev !== rev) o.push('guilda: revisao ' + cloud.rev + ' vs ' + rev);
  fresh(); save.pl.lv = 45; save.gold = 20000; save.gems = 150; rk.gname = 'Teste'; rk.gtag = 'TST'; mode = 'missing'; await createGuild();
  if (!calls.includes('gog_guild_create:') || save.gold !== 5000) o.push('guilda: sem a funcao nova devia usar a antiga (' + calls.join(',') + ')');
  return o.length ? o.join(' | ') : 'tudo ok';
})()
