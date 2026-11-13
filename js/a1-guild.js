'use strict';
/* ----- Guildas: sem chat; sobem sozinhas com o progresso dos membros e o lider escolhe as melhorias ----- */
const E2 = (en, pt) => lang === 'en' ? en : pt;   // ingles primeiro
const GUILD = { minLv: 40, joinLv: 10, gold: 15000, gems: 100, max: 10, maxLv: 40 };
const GPERK = [['xp', ['XP bonus', 'Bónus de XP'], .01, 'XP'], ['gold', ['Gold bonus', 'Bónus de ouro'], .015, ''], ['drop', ['Drop chance', 'Chance de drop'], .0025, ''], ['attr', ['Attributes', 'Atributos'], .005, '']];
const GCOL = ['#ffd34a', '#ff6a6a', '#ff9a3a', '#c8e04a', '#4adf7a', '#4adfd0', '#4a9aff', '#c06aff'];
const gcol = c => GCOL[c | 0] || GCOL[0];
const GEMB = [
  ['.######.', '########', '########', '########', '.######.', '.######.', '..####..', '...##...'],
  ['.......#', '......##', '.....##.', '#...##..', '##.##...', '.###....', '.##.....', '#..#....'],
  ['#.#..#.#', '########', '########', '########', '########', '########', '........', '........'],
  ['.######.', '########', '##.##.##', '##.##.##', '########', '.######.', '..#.#.#.', '..#.#.#.'],
  ['...##...', '...##...', '########', '.######.', '..####..', '..####..', '.##..##.', '.#....#.'],
  ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
  ['.....##.', '....##..', '...##...', '..#####.', '....##..', '...##...', '..##....', '..#.....'],
  ['...#....', '..##....', '..###...', '.####.#.', '.#####.#', '########', '.######.', '..####..'],
  ['..####..', '.###....', '###.....', '###.....', '###.....', '.###....', '..####..', '........'],
  ['...##...', '..####..', '.######.', '########', '.######.', '...##...', '...##...', '...##...'],
  ['.#....#.', '###..###', '.#....#.', '..####..', '.######.', '########', '.######.', '..#..#..'],
  ['..####..', '.######.', '########', '########', '.######.', '..####..', '...##...', '........']];
function drawGEmb(i, x, y, k, col) {   // emblema 8x8 com sombra, tingido com a cor da guilda
  const m = GEMB[(i | 0) % 12] || GEMB[0];
  for (let pass = 0; pass < 2; pass++) { ctx.fillStyle = pass ? col : '#000a'; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (m[r][c] === '#') ctx.fillRect(x + c * k + (pass ? 0 : k * .4), y + r * k + (pass ? 0 : k * .4), k, k); }
}
const gPct = (per, lv) => (lv * per * 100).toFixed(per < .01 ? 2 : 1).replace(/\.?0+$/, '');
// botoes de confirmacao: se ninguem fizer nada durante 4 s, voltam ao normal
let cfKey = '', cfT = 0;
function confirmTick(dt) {
  const armed = !!(gld.ask || menuConfirm || sellArm || (cloud && cloud.confirmOut)), k = armed ? [gld.ask, menuConfirm, !!sellArm, cloud && cloud.confirmOut].join('|') : '';
  if (k !== cfKey) { cfKey = k; cfT = Date.now(); return; }
  if (armed && Date.now() - cfT > 4000) { gld.ask = ''; menuConfirm = false; sellArm = null; if (cloud) cloud.confirmOut = false; cfKey = ''; cfT = 0; }
}
async function openGuild(id) {
  if (!id) return; rk.gp = { id, d: null, err: '' }; const r = await rpc('gog_guild_public', { p_id: id });
  if (rk.gp && rk.gp.id === id) { if (r.ok) rk.gp.d = r.guild; else rk.gp.err = r.error || 'server'; }
}
async function gbLoad(force) {
  if (!ONLINE_URL || rk.gbBusy) return; const c = rk.gb; if (!force && c && Date.now() - c.t < 15000) return;
  rk.gbBusy = true; const r = await rpc('gog_guild_board', { p_token: on.token, p_offset: 0 }); rk.gbBusy = false;
  if (r.ok) rk.gb = { rows: r.rows || [], mine: r.mine || null, t: Date.now() }; else rkSay(r.error);
}
function saveGStyle() { guildCall('gog_guild_style', { p_color: gld.dc | 0, p_emblem: gld.de | 0, p_motto: (rk.gmotto || '').trim() }, E2('Saved!', 'Guardado!')).then(r => { if (r && r.ok) rk.gb = null; }); }
let gld = { cust: false, dc: 0, de: 0, info: null, list: [], loaded: false, busy: false, msg: '', col: '#f88', cd: 0, page: 0, at: 0, ask: '' };
const gb = () => { const p = gld.info && gld.info.perks; return p ? { xp: p.xp * .01, gold: p.gold * .015, drop: p.drop * .0025, attr: p.attr * .005 } : { xp: 0, gold: 0, drop: 0, attr: 0 }; };
const GMSG = {
  need_level: ['You need level 40 to create a guild.', 'Precisas de nível 40 para criar uma guilda.'], need_gold: ['You need ¢15,000 saved in your account.', 'Precisas de ¢15 000 guardados na conta.'], need_gems: ['You need ◆100 saved in your account.', 'Precisas de ◆100 guardados na conta.'],
  bad_name: ['Name: 3-16 letters, numbers or spaces. Tag: 2-4 letters or numbers.', 'Nome: 3 a 16 letras, números ou espaços. Tag: 2 a 4 letras ou números.'], bad_word: ['That name is not allowed.', 'Esse nome não é permitido.'], name_taken: ['That name or tag is already taken.', 'Esse nome ou tag já existe.'],
  in_guild: ['You are already in a guild.', 'Já estás numa guilda.'], cooldown: ['You left or were removed recently: wait 24 hours.', 'Saíste ou foste expulso há pouco: espera 24 horas.'], need_level_join: ['You need level 10 to join a guild.', 'Precisas de nível 10 para entrar numa guilda.'],
  full: ['That guild is full (10 members).', 'Essa guilda está cheia (10 membros).'], not_found: ['Not found.', 'Não encontrado.'], not_leader: ['Only the leader can do that.', 'Só o líder pode fazer isto.'], no_points: ['No guild points to spend.', 'Sem pontos de guilda para gastar.'],
  maxed: ['That upgrade is already maxed.', 'Essa melhoria já está no máximo.'], slow: ['Slow down a moment.', 'Mais devagar um momento.'], no_guild: ['You are not in a guild.', 'Não estás numa guilda.'], bad_request: ['Invalid request.', 'Pedido inválido.'], network: ['No connection to the server.', 'Sem ligação ao servidor.'],
};
const gmsg = e => { const m = GMSG[e]; return m ? E2(m[0], m[1]) : (e || 'error'); };
async function loadGuild(force) {
  if (!on.token || gld.busy) return; if (!force && Date.now() - gld.at < 60000) return; gld.busy = true; gld.at = Date.now();
  const r = await rpc('gog_guild_get', { p_token: on.token }); gld.busy = false;
  if (r.ok) { gld.info = r.guild || null; gld.cd = r.cooldown | 0; gld.loaded = true; if (!gld.info) loadGuildList(); }
}
async function loadGuildList() { if (!on.token) return; const r = await rpc('gog_guild_list', { p_token: on.token, p_offset: gld.page * 12 }); if (r.ok) gld.list = r.rows || []; }
async function guildCall(fn, args, doneMsg) {
  if (gld.busy) return null; gld.busy = true; gld.msg = ''; const r = await rpc(fn, Object.assign({ p_token: on.token }, args)); gld.busy = false; gld.ask = '';
  if (r.ok) { if ('guild' in r) gld.info = r.guild || null; gld.at = Date.now(); gld.col = '#6f6'; gld.msg = doneMsg || ''; if (!gld.info) { gld.cd = fn === 'gog_guild_leave' ? 86400 : gld.cd; loadGuildList(); } SFX.buy(); }
  else { gld.col = '#f88'; gld.msg = gmsg(r.error); SFX.error(); if (r.error === 'auth') dropSession(false); }
  return r;
}
async function createGuild() {
  if (gld.busy) return; const nm = (rk.gname || '').trim(), tg = (rk.gtag || '').trim();
  if (save.pl.lv < GUILD.minLv || save.gold < GUILD.gold || save.gems < GUILD.gems) { gld.col = '#f88'; gld.msg = E2('You do not meet the requirements yet.', 'Ainda não cumpres os requisitos.'); SFX.error(); return; }
  gld.busy = true; gld.col = '#9ab'; gld.msg = E2('Checking...', 'A verificar...'); await cloudFlush();   // o servidor confere o ouro e os diamantes no save guardado
  const r = await rpc('gog_guild_create', { p_token: on.token, p_name: nm, p_tag: tg }); gld.busy = false;
  if (r.ok) { spendG(GUILD.gold); save.gems -= GUILD.gems; persist(); gld.info = r.guild; gld.at = Date.now(); rk.gname = rk.gtag = ''; rk.focus = ''; gld.col = '#6f6'; gld.msg = ''; hubToast = { t: 3, s: E2('Guild created!', 'Guilda criada!'), col: '#ffd34a' }; SFX.unlock(); }
  else { gld.col = '#f88'; gld.msg = gmsg(r.error); SFX.error(); }
}
function drawGCust(I, x0) {
  panel(x0, 164, 300, 314, '#16162a'); txt(E2('Customize', 'Personalizar'), x0 + 14, 190, 16, '#f0c060', 'left', 'bold');
  txt(E2('Color', 'Cor'), x0 + 14, 216, 12, '#9ab');
  GCOL.forEach((c, i) => { const sx = x0 + 14 + i * 34; bevel(sx, 224, 28, 28, c, gld.dc === i ? '#fff' : '#05050a', '#05050a'); ui.push({ x: sx, y: 224, w: 28, h: 28, fn: () => { gld.dc = i; } }); });
  txt(E2('Emblem', 'Emblema'), x0 + 14, 278, 12, '#9ab');
  for (let i = 0; i < 12; i++) { const ex = x0 + 14 + (i % 6) * 46, ey = 286 + Math.floor(i / 6) * 46; bevel(ex, ey, 40, 40, gld.de === i ? '#26264a' : '#12121f', gld.de === i ? '#ffd34a' : '#26263a', '#05050a'); drawGEmb(i, ex + 8, ey + 8, 3, gcol(gld.dc)); ui.push({ x: ex, y: ey, w: 40, h: 40, fn: () => { gld.de = i; } }); }
  txt(E2('Motto (max 40)', 'Lema (máx. 40)'), x0 + 14, 386, 12, '#9ab');
  const foc = rk.focus === 'gmotto'; btn(x0 + 14, 392, 272, 26, '', () => { rk.focus = 'gmotto'; }, { col: foc ? '#26264a' : '#12121f', hot: '#1c1c34', sel: false });
  txt((rk.gmotto || '') + (foc && Math.floor(T * 2) % 2 ? '_' : ''), x0 + 20, 410, 12, '#fff', 'left', 'bold');
  btn(x0 + 14, 428, 272, 32, E2('Save', 'Guardar'), saveGStyle, { size: 14, col: '#2f7a4a', hot: '#3fa061', off: gld.busy });
  if (gld.msg) txt(gld.msg, x0 + 150, 472, 11, gld.col, 'center');
}
function hubGuild() {
  if (!on.token) { txt(E2('Log in to use guilds.', 'Entra numa conta para usar guildas.'), 487, 270, 15, '#778', 'center'); return; }
  loadGuild(false);
  if (!gld.loaded) { txt(E2('Loading...', 'A carregar...'), 487, 270, 15, '#778', 'center'); return; }
  const I = gld.info, x0 = 197;
  if (!I) {
    // ---- criar ----
    panel(x0, 94, 262, 384, '#16162a'); txt(E2('Create a guild', 'Criar uma guilda'), x0 + 131, 120, 17, '#f0c060', 'center', 'bold');
    const reqs = [[save.pl.lv >= GUILD.minLv, E2(`Level ${GUILD.minLv} (you: ${save.pl.lv})`, `Nível ${GUILD.minLv} (tens ${save.pl.lv})`)], [save.gold >= GUILD.gold, `¢${gfmt(GUILD.gold)}`], [save.gems >= GUILD.gems, `◆${GUILD.gems}`]];
    reqs.forEach(([okk, t], i) => { txt(okk ? '✓' : '✗', x0 + 20, 148 + i * 20, 14, okk ? '#6f6' : '#f66', 'center', 'bold'); txt(t, x0 + 36, 148 + i * 20, 13, okk ? '#cdd6f0' : '#f99'); });
    rkField(x0 + 14, 228, 234, E2('Guild name', 'Nome da guilda'), 'gname', false); rkField(x0 + 14, 282, 110, E2('Tag (2-4)', 'Tag (2-4)'), 'gtag', false);
    const can = reqs.every(q => q[0]) && !gld.busy;
    btn(x0 + 14, 330, 234, 34, E2('Create guild', 'Criar guilda'), createGuild, { size: 15, col: can ? '#2f7a4a' : '#33333f', hot: '#3fa061', off: !can });
    if (gld.msg) wrap(gld.msg, x0 + 14, 386, 234, 14, 11, gld.col);
    wrap(E2('A guild levels up by itself with its members\' kills, bosses and raids. Up to 10 members.', 'Uma guilda sobe sozinha com os mobs, bosses e raids dos membros. Até 10 membros.'), x0 + 14, 440, 234, 13, 10, '#778');
    // ---- entrar ----
    panel(470, 94, 310, 384, '#16162a'); txt(E2('Join a guild', 'Entrar numa guilda'), 625, 120, 17, '#f0c060', 'center', 'bold');
    if (gld.cd > 0) txt(E2(`Wait ${Math.ceil(gld.cd / 3600)}h before joining or creating`, `Espera ${Math.ceil(gld.cd / 3600)}h para entrar ou criar`), 625, 140, 11, '#f88', 'center');
    if (!gld.list.length) txt(E2('No guilds yet. Create the first one!', 'Ainda não há guildas. Cria a primeira!'), 625, 280, 13, '#778', 'center');
    gld.list.forEach((g, i) => { const y = 152 + i * 25; ctx.fillStyle = i % 2 ? '#13132a' : '#18183a'; ctx.fillRect(478, y - 12, 294, 24);
      drawGEmb(g.emblem, 484, y - 7, 1.6, gcol(g.color)); txt(`[${g.tag}] ${g.name}`, 502, y + 4, 12, gcol(g.color), 'left', 'bold'); txt(`Lv ${g.level} · ${g.members}/${GUILD.max}`, 690, y + 4, 10, '#9ab', 'right'); ui.push({ x: 478, y: y - 12, w: 214, h: 24, fn: () => openGuild(g.id) });
      btn(698, y - 10, 70, 20, E2('Join', 'Entrar'), () => guildCall('gog_guild_join', { p_guild: g.id }, ''), { size: 11, col: '#2f7a4a', hot: '#3fa061', off: gld.busy || g.members >= GUILD.max || save.pl.lv < GUILD.joinLv || gld.cd > 0 }); });
    btn(478, 452, 40, 20, '<', () => { gld.page = Math.max(0, gld.page - 1); loadGuildList(); }, { size: 12, off: gld.page === 0 }); btn(732, 452, 40, 20, '>', () => { if (gld.list.length >= 12) { gld.page++; loadGuildList(); } }, { size: 12, off: gld.list.length < 12 });
    txt(`${gld.page + 1}`, 625, 467, 11, '#9ab', 'center');
    return;
  }
  // ---- a minha guilda ----
  const lead = I.leader, B = gb(), gc = gcol(I.color);
  panel(x0, 94, 583, 62, '#16162a'); drawGEmb(I.emblem, x0 + 14, 113, 3, gc);   // emblema 24x24 centrado na vertical do painel
  txt(`[${I.tag}] ${I.name}`, x0 + 54, 119, 22, gc, 'left', 'bold');
  if (I.motto) txt(I.motto, x0 + 54 + txtW(`[${I.tag}] ${I.name}`, 22, 'bold') + 12, 118, 11, '#9ab');
  txt(E2(`Level ${I.level} / ${GUILD.maxLv}`, `Nível ${I.level} / ${GUILD.maxLv}`), x0 + 54, 142, 12, '#9cf', 'left', 'bold'); bar(x0 + 142, 134, 110, 9, I.level >= GUILD.maxLv ? 1 : I.xp / I.need, '#a8821f'); txt(I.level >= GUILD.maxLv ? 'MAX' : `${gfmt(I.xp)} / ${gfmt(I.need)}`, x0 + 260, 142, 11, '#9ab');
  if (lead) btn(x0 + 329, 110, 100, 30, gld.cust ? E2('Upgrades', 'Melhorias') : E2('Customize', 'Personalizar'), () => { gld.cust = !gld.cust; rk.focus = ''; if (gld.cust) { gld.dc = I.color | 0; gld.de = I.emblem | 0; rk.gmotto = I.motto || ''; gld.msg = ''; } }, { size: 12, col: gld.cust ? '#a8821f' : '#2a3a5a' });
  btn(x0 + 583 - 144, 110, 130, 30, gld.ask === 'leave' ? E2('Confirm leave?', 'Confirmar saída?') : E2('Leave guild', 'Sair da guilda'), () => { if (gld.ask === 'leave') guildCall('gog_guild_leave', {}, ''); else gld.ask = 'leave'; }, { size: 12, col: gld.ask === 'leave' ? '#a03a3a' : '#3a2a3a', off: gld.busy });
  // melhorias
  if (lead && gld.cust) drawGCust(I, x0); else {
  panel(x0, 164, 300, 314, '#16162a'); txt(E2('Upgrades', 'Melhorias'), x0 + 14, 190, 16, '#f0c060', 'left', 'bold');
  txt(E2(`Points to spend: ${I.free}`, `Pontos por gastar: ${I.free}`), x0 + 286, 190, 12, I.free > 0 && lead ? '#ffd34a' : '#778', 'right', 'bold');
  GPERK.forEach(([k, nm, per, unit], i) => { const y = 204 + i * 66, lv = I.perks[k] | 0, cur = lv * per * 100;
    bevel(x0 + 8, y, 284, 58, '#12121f', lv ? '#4a4a7a' : '#26263a', '#05050a'); txt(E2(nm[0], nm[1]), x0 + 18, y + 22, 14, '#fff', 'left', 'bold');
    txt(`+${cur.toFixed(per < .01 ? 2 : 1).replace(/\.?0+$/, '')}%`, x0 + 230, y + 22, 14, lv ? '#6f6' : '#667', 'right', 'bold');
    for (let q = 0; q < 10; q++) { ctx.fillStyle = q < lv ? '#ffd34a' : '#26263a'; ctx.fillRect(x0 + 18 + q * 15, y + 34, 12, 12); }
    const mx = (10 * per * 100).toFixed(per < .01 ? 1 : 0).replace(/\.0$/, ''); txt(E2(`max +${mx}%`, `máx. +${mx}%`), x0 + 230, y + 44, 10, '#778', 'right');
    if (lead) btn(x0 + 246, y + 10, 38, 38, '+', () => guildCall('gog_guild_upgrade', { p_perk: k }, ''), { size: 16, col: '#2f7a4a', hot: '#3fa061', off: gld.busy || I.free < 1 || lv >= 10 }); });
  }
  // membros
  panel(505, 164, 275, 314, '#16162a'); txt(E2(`Members ${I.members.length}/${GUILD.max}`, `Membros ${I.members.length}/${GUILD.max}`), 519, 190, 16, '#f0c060', 'left', 'bold'); txt(E2('Points', 'Pontos'), 766, 190, 11, '#778', 'right');
  I.members.forEach((m, i) => { const y = 214 + i * 25; ctx.fillStyle = i % 2 ? '#13132a' : '#18183a'; ctx.fillRect(512, y - 11, 261, 24);
    { const cw = (lead && !m.leader ? 676 : 690) - 512, mx = mouse.x - UIOX; if (mx >= 512 && mx <= 512 + cw && mouse.y >= y - 11 && mouse.y <= y + 13) { ctx.fillStyle = '#ffffff14'; ctx.fillRect(512, y - 11, 261, 24); } ui.push({ x: 512, y: y - 11, w: cw, h: 24, fn: () => openProfile(m.nick) }); }
    if (m.leader) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(517, y + 1, 10, 6); ctx.fillRect(517, y - 3, 2, 5); ctx.fillRect(521, y - 5, 2, 7); ctx.fillRect(525, y - 3, 2, 5); }
    txt(m.nick, 534, y + 4, 12, m.leader ? '#ffd34a' : '#e8ecff', 'left', 'bold'); txt(`Lv ${m.level | 0}`, lead && !m.leader ? 640 : 690, y + 4, 10, '#8a9ab8', lead && !m.leader ? 'left' : 'right');
    if (lead && !m.leader) { const kk = 'kick:' + m.nick, ll = 'lead:' + m.nick;
      btn(678, y - 9, 24, 20, gld.ask === ll ? '?' : '', () => { if (gld.ask === ll) guildCall('gog_guild_transfer', { p_nick: m.nick }, ''); else gld.ask = ll; }, { size: 12, col: gld.ask === ll ? '#a8821f' : '#2a2a48', off: gld.busy }); if (gld.ask !== ll) drawIcon('star', 690, y + 1, 1.6);
      btn(706, y - 9, 24, 20, gld.ask === kk ? '?' : '', () => { if (gld.ask === kk) guildCall('gog_guild_kick', { p_nick: m.nick }, ''); else gld.ask = kk; }, { size: 12, col: gld.ask === kk ? '#a03a3a' : '#4a2a2a', off: gld.busy }); if (gld.ask !== kk) ctx.drawImage(ICN.cross_down, 710, y - 5, 16, 16); }
    txt(gfmt(m.contrib | 0), 768, y + 4, 11, '#fd5', 'right', 'bold'); });
  if (!lead) txt(E2('Click a member to see their profile', 'Clica num membro para ver o perfil'), 642, 466, 9, '#667', 'center');
  if (lead) txt(E2('★ make leader · ✕ remove (click twice)', '★ passar a liderança · ✕ expulsar (clica duas vezes)'), 642, 466, 9, '#667', 'center');
  if (gld.msg) txt(gld.msg, x0 + 150, 472, 11, gld.col, 'center');
  else txt(E2('Guild points: 1 per kill, 10 per boss, 60 per raid clear.', 'Pontos de guilda: 1 por mob, 10 por boss, 60 por raid.'), x0 + 150, 472, 10, '#667', 'center');
}
function hubRaids() {
  const d = RAID_D[raidD];
  RAID_D.forEach((r, i) => { btn(197 + i * 117, 90, 110, 38, r.n, () => { if (diffOpen(i)) raidD = i; else lockClick('d' + i); }, { size: 15, col: raidD === i ? r.col : '#2a2a48', hot: r.col }); if (!diffOpen(i)) drawIcon('lock', 197 + i * 117 + 99, 99, 1.2); });
  txt(`Vida ×${Math.min(raidHP(0, raidD), raidHP(5, raidD)).toFixed(0)}–${Math.max(raidHP(0, raidD), raidHP(5, raidD)).toFixed(0)} · Dano ×${Math.min(raidDM(0, raidD), raidDM(5, raidD)).toFixed(1)}–${Math.max(raidDM(0, raidD), raidDM(5, raidD)).toFixed(1)} · Ouro ×${d.gold} · +XP`, 440, 150, 14, d.col, 'center', 'bold');
  btn(684, 136, 96, 22, `Velocidade: x${gameSpeed}`, toggleSpeed, { size: 11, col: gameSpeed === 2 ? '#a06a20' : '#2a2a48' });
  MISSIONS.forEach((m, i) => {
    const x = 195, y = 162 + i * 53, w = 585, h = 48, cl = save.raids[i] || [0, 0, 0, 0, 0], open = i === 0 || ((save.raids[i - 1] || [])[raidD] | 0) > 0, unl = open && diffOpen(raidD), rec = raidRec(i, raidD);
    panel(x, y, w, h, open ? '#232342' : '#1a1a22', open ? d.col : '#2a2a3a');
    ctx.fillStyle = THEMES[m.theme].bg; ctx.fillRect(x + 6, y + 6, 36, 36); drawSprBig(m.boss.pal, x + 24, y + 24, .46); if (!open) drawIcon('lock', x + 24, y + 24, 2);
    txt(`Raid: ${m.name}`, x + 54, y + 20, 16, open ? '#fff' : '#667', 'left', 'bold');
    if (open && unl) { txt(`Conclusões: ${cl[raidD]} · Recompensa: ¢${Math.round(m.reward * d.gold * 1.5)} + ${2 + raidD} itens`, x + 54, y + 38, 12, '#9cf'); txt(`Nv rec. ${rec}`, x + w - 124, y + 28, 12, save.pl.lv >= rec ? '#6f6' : '#f66', 'right', 'bold'); }
    else txt(!open ? 'Conclui a raid anterior nesta dificuldade' : 'Conclui TODAS as raids da dificuldade anterior', x + 54, y + 38, 12, '#a77');
    btn(x + w - 112, y + 7, 100, 34, unl ? T2('Entrar', 'Enter') : 'Bloqueada', () => unl ? startMission(i, raidD) : lockClick('r' + i), { col: unl ? d.col : '#26262f', hot: unl ? d.col : '#33333f', size: 14 });
  });
}
