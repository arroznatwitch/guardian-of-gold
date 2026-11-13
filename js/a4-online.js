'use strict';
/* ----- Bandeiras em pixel-art, paises e seletor ----- */
const _H = (...c) => (x, y, w, h) => c.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(x, y + Math.round(h * i / c.length), w, Math.ceil(h / c.length)); });
const _V = (...c) => (x, y, w, h) => c.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(x + Math.round(w * i / c.length), y, Math.ceil(w / c.length), h); });
const _dot = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
const _nordic = (bg, cr, inner) => (x, y, w, h) => { ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); const cx = x + Math.round(w * .32), cy = y + Math.round(h * .5), t = Math.max(2, Math.round(h * .24)); ctx.fillStyle = cr; ctx.fillRect(x, cy - t / 2, w, t); ctx.fillRect(cx - t / 2, y, t, h); if (inner) { const u = Math.max(1, Math.round(t / 2)); ctx.fillStyle = inner; ctx.fillRect(x, cy - u / 2, w, u); ctx.fillRect(cx - u / 2, y, u, h); } };
const FLAGS = {
  PT: (x, y, w, h) => { ctx.fillStyle = '#0a7a2a'; ctx.fillRect(x, y, Math.round(w * .4), h); ctx.fillStyle = '#d02020'; ctx.fillRect(x + Math.round(w * .4), y, w - Math.round(w * .4), h); _dot(x + w * .4, y + h / 2, h * .26, '#f5c542'); _dot(x + w * .4, y + h / 2, h * .13, '#d02020'); },
  BR: (x, y, w, h) => { ctx.fillStyle = '#10a040'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#f5d020'; ctx.beginPath(); ctx.moveTo(x + w / 2, y + 1); ctx.lineTo(x + w - 1, y + h / 2); ctx.lineTo(x + w / 2, y + h - 1); ctx.lineTo(x + 1, y + h / 2); ctx.fill(); _dot(x + w / 2, y + h / 2, h * .22, '#2040a0'); },
  ES: (x, y, w, h) => { ctx.fillStyle = '#d02020'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#f5c542'; ctx.fillRect(x, y + Math.round(h * .25), w, Math.round(h * .5)); },
  FR: _V('#1a3a9a', '#f4f4f4', '#d02020'), IT: _V('#10903a', '#f4f4f4', '#d02020'), DE: _H('#111', '#d02020', '#f5c542'), NL: _H('#c02020', '#f4f4f4', '#2040a0'),
  BE: _V('#111', '#f5c542', '#d02020'), IE: _V('#10903a', '#f4f4f4', '#f08020'), PL: _H('#f4f4f4', '#d02040'), AT: _H('#d02020', '#f4f4f4', '#d02020'), LU: _H('#d02020', '#f4f4f4', '#40a0d8'),
  CH: (x, y, w, h) => { ctx.fillStyle = '#d02020'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(x + w * .42, y + h * .2, w * .16, h * .6); ctx.fillRect(x + w * .3, y + h * .38, w * .4, h * .24); },
  GB: (x, y, w, h) => { ctx.fillStyle = '#1a2a7a'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, h * .22); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke(); ctx.strokeStyle = '#d02030'; ctx.lineWidth = Math.max(1, h * .1); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(x, y + h * .36, w, h * .28); ctx.fillRect(x + w * .4, y, w * .2, h); ctx.fillStyle = '#d02030'; ctx.fillRect(x, y + h * .43, w, h * .14); ctx.fillRect(x + w * .45, y, w * .1, h); },
  US: (x, y, w, h) => { for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#f4f4f4' : '#c02030'; ctx.fillRect(x, y + Math.round(h * i / 7), w, Math.ceil(h / 7)); } ctx.fillStyle = '#2a3a8a'; ctx.fillRect(x, y, Math.round(w * .45), Math.round(h * 4 / 7)); },
  CA: (x, y, w, h) => { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#d02020'; ctx.fillRect(x, y, Math.round(w * .25), h); ctx.fillRect(x + Math.round(w * .75), y, w - Math.round(w * .75), h); ctx.fillRect(x + w * .4, y + h * .3, w * .2, h * .4); },
  MX: _V('#0a7a3a', '#f4f4f4', '#c02020'), AR: (x, y, w, h) => { _H('#74b4e0', '#f4f4f4', '#74b4e0')(x, y, w, h); _dot(x + w / 2, y + h / 2, h * .14, '#f5c542'); }, CO: (x, y, w, h) => { ctx.fillStyle = '#f5c542'; ctx.fillRect(x, y, w, Math.round(h / 2)); ctx.fillStyle = '#2040a0'; ctx.fillRect(x, y + Math.round(h / 2), w, Math.round(h / 4)); ctx.fillStyle = '#c02020'; ctx.fillRect(x, y + Math.round(h * .75), w, h - Math.round(h * .75)); },
  AO: (x, y, w, h) => { _H('#c02020', '#111')(x, y, w, h); _dot(x + w / 2, y + h / 2, h * .2, '#f5c542'); }, MZ: (x, y, w, h) => { _H('#0a7a3a', '#111', '#f5c542')(x, y, w, h); ctx.fillStyle = '#c02020'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * .4, y + h / 2); ctx.lineTo(x, y + h); ctx.fill(); },
  CV: (x, y, w, h) => { ctx.fillStyle = '#2040a0'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, y + h * .55, w, h * .2); ctx.fillStyle = '#c02020'; ctx.fillRect(x, y + h * .62, w, h * .07); },
  SE: _nordic('#1a5a9a', '#f5c542'), NO: _nordic('#c02030', '#f4f4f4', '#1a2a7a'), DK: _nordic('#c02030', '#f4f4f4'), FI: _nordic('#f4f4f4', '#1a3a8a'),
  JP: (x, y, w, h) => { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, y, w, h); _dot(x + w / 2, y + h / 2, h * .3, '#c02030'); },
  UA: _H('#2060c0', '#f5d020'),
  TR: (x, y, w, h) => { ctx.fillStyle = '#d02020'; ctx.fillRect(x, y, w, h); _dot(x + w * .38, y + h / 2, h * .26, '#f4f4f4'); _dot(x + w * .44, y + h / 2, h * .21, '#d02020'); },
  ZZ: (x, y, w, h) => { ctx.fillStyle = '#1a4a8a'; ctx.fillRect(x, y, w, h); _dot(x + w / 2, y + h / 2, h * .38, '#3a9a5a'); },
};
const COUNTRIES = [['PT', 'Portugal'], ['BR', 'Brasil'], ['ES', 'Espanha'], ['FR', 'França'], ['DE', 'Alemanha'], ['GB', 'Reino Unido'], ['IE', 'Irlanda'], ['IT', 'Itália'], ['NL', 'Países Baixos'], ['BE', 'Bélgica'], ['LU', 'Luxemburgo'], ['CH', 'Suíça'], ['AT', 'Áustria'], ['PL', 'Polónia'], ['SE', 'Suécia'], ['NO', 'Noruega'], ['DK', 'Dinamarca'], ['FI', 'Finlândia'], ['UA', 'Ucrânia'], ['TR', 'Turquia'], ['US', 'EUA'], ['CA', 'Canadá'], ['MX', 'México'], ['AR', 'Argentina'], ['CO', 'Colômbia'], ['JP', 'Japão'], ['ZZ', 'Outro / Mundo']];
const cName = c => { const q = COUNTRIES.find(z => z[0] === c); return q ? q[1] : 'Outro / Mundo'; };
function drawFlag(code, x, y, w = 20, h = 13) {
  const f = FLAGS[code] || FLAGS.ZZ; x = Math.round(x); y = Math.round(y); ctx.fillStyle = '#05050a'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); f(x, y, w, h); ctx.restore();
}
const guessCountry = () => { try { const m = (navigator.language || '').split('-')[1]; const c = (m || '').toUpperCase(); return FLAGS[c] && c !== 'ZZ' ? c : (/^pt/i.test(navigator.language || '') ? 'PT' : 'ZZ'); } catch (e) { return 'ZZ'; } };
let cpick = null;   // seletor de pais aberto: { pick: codigo => ... }
function drawCountryPicker() {
  if (!cpick) return;
  ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { cpick = null; } });
  const x = 110, y = 36, w = 580, h = 428; panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  txt('Escolhe o teu país', x + w / 2, y + 32, 20, '#ffd34a', 'center', 'bold');
  COUNTRIES.forEach(([c, n], i) => {
    const cx = x + 16 + (i % 4) * 140, cy = y + 52 + Math.floor(i / 4) * 40, hov = mouse.x - UIOX >= cx && mouse.x - UIOX <= cx + 132 && mouse.y >= cy && mouse.y <= cy + 34;
    bevel(cx, cy, 132, 34, hov ? '#2c2c4a' : '#1b1b30', hov ? '#a8821f' : '#33334a', '#05050a'); drawFlag(c, cx + 8, cy + 10, 22, 14); txt(n, cx + 38, cy + 22, 11, '#fff', 'left', 'bold');
    ui.push({ x: cx, y: cy, w: 132, h: 34, fn: () => { const f = cpick && cpick.pick; cpick = null; if (f) f(c); } });
  });
}
// editar perfil: so o sexo e o pais; o nick nunca muda
const FLAG_COST = 250;   // mudar de bandeira custa diamantes; escolher a primeira e gratis
const flagCost = e => (on.country && on.country !== 'ZZ' && e.country !== (on.country || 'ZZ')) ? FLAG_COST : 0;
let editProf = null;
function openEditProfile() { if (!on.token) return; editProf = { gender: myG(), country: on.country || 'ZZ', busy: false, msg: '', col: '#f88' }; }
async function saveEditProfile() {
  const e = editProf; if (!e || e.busy) return; const cost = flagCost(e); if (save.gems < cost) { e.msg = `Precisas de ${cost} diamantes para mudar de bandeira`; e.col = '#f88'; SFX.error(); return; }
  e.busy = true; e.msg = 'A guardar...'; e.col = '#9ab';
  const r = await rpc('gog_set_profile', { p_token: on.token, p_gender: e.gender, p_country: e.country === 'ZZ' ? null : e.country }); e.busy = false;
  if (r.ok) { on.gender = r.gender; on.country = r.country; onSave(); if (cost) { save.gems -= cost; persist(); } SFX.buy(); editProf = null; rk.at = {}; if (cost === 0) hubToast = { t: 2.4, s: 'Perfil guardado', col: '#6f6' }; } else { e.msg = RK_MSG[r.error] || 'Erro, tenta outra vez'; e.col = '#f88'; }
}
function profileTabs() {
  const nChest = Math.max(0, save.pl.lv - save.chestDone);
  [['profile', 'Perfil'], ['rewards', 'Recompensas'], ['ach', 'Conquistas']].forEach(([k, l], i) => {
    const bx = 197 + i * 104; btn(bx, 87, 100, 20, l, () => { tab = k; }, { size: 12, col: tab === k ? '#a8821f' : '#2a2a48', hot: '#c9a030' });
    if ((k === 'rewards' && nChest > 0) || (k === 'ach' && achReady() > 0)) { const nn = k === 'ach' ? achReady() : nChest, s = nn > 99 ? '99+' : String(nn), w = Math.max(16, s.length * 8 + 6); ctx.fillStyle = '#05050a'; ctx.fillRect(bx + 100 - w - 1, 76, w + 2, 16); ctx.fillStyle = '#ffd34a'; ctx.fillRect(bx + 100 - w, 77, w, 14); txt(s, bx + 100 - w / 2, 88, 11, '#000', 'center', 'bold'); }   // aviso: ha baus por abrir
  });
}
function hubProfile() {
  profileTabs();
  if (!on.token) { txt('Entra numa conta para ver o perfil e os personagens.', 487, 270, 15, '#778', 'center'); return; }
  if (!chList && !chBusy) { chBusy = true; loadChars().then(() => { chBusy = false; }); }
  if (!editProf) openEditProfile(); const e = editProf; if (!e) return;
  // coluna da esquerda: um personagem por classe
  const lx = 197, lw = 284; txt('Personagens', lx, 128, 15, '#f0c060', 'left', 'bold'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(lx, 134, lw, 1);
  Object.keys(CLASSES).forEach((k, i) => {
    const y = 144 + i * 108, ch = chList ? chList.find(q => q.cls === k) : null, cur = ch && ch.current;
    bevel(lx, y, lw, 100, cur ? '#2c2410' : '#12121f', cur ? '#d8b030' : '#33334a', '#05050a');
    ctx.fillStyle = '#0c0c18'; ctx.fillRect(lx + 8, y + 8, 76, 84); drawSprBig(hk(k), lx + 46, y + 52 + Math.sin(T * 2 + i) * 1.5, 2);
    txt(CLASSES[k].name, lx + 96, y + 26, 15, '#fff', 'left', 'bold');
    if (ch) {
      txt(ch.nick, lx + 96, y + 46, 13, cur ? '#ffd34a' : '#cdd6f0', 'left', 'bold'); txt(`Nv ${ch.level | 0}` + (ch.main ? ' · principal' : ''), lx + 96, y + 63, 11, '#8a9ab8');
      btn(lx + 96, y + 70, 178, 22, cur ? 'Personagem atual' : 'Entrar com este', () => switchChar(ch.nick), { size: 12, col: cur ? '#26262f' : '#2f7a4a', hot: '#3fa061', off: cur || chBusy });
    } else {
      txt(chList ? 'Ainda não tens' : 'A carregar...', lx + 96, y + 48, 12, '#778');
      btn(lx + 96, y + 70, 178, 22, 'Criar personagem', () => { chNew = k; chMsg = ''; rk.cnick = ''; rk.focus = 'cnick'; }, { size: 12, col: '#a06a20', hot: '#c98a30', off: chBusy || !chList });
    }
  });
  if (chMsg && !chNew) txt(chMsg, lx + lw / 2, 470, 11, chBusy ? '#9ab' : '#f88', 'center');
  // coluna da direita: editar perfil
  const x = 497, w = 285; txt('Perfil da conta', x, 128, 15, '#f0c060', 'left', 'bold'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(x, 134, w, 1);
  { const own = Object.keys(TITLES).filter(titleOwned), list = [''].concat(own), ci = Math.max(0, list.indexOf(save.title)), step = d => { setTitle(list[(ci + d + list.length) % list.length]); };
    txt(T2('Título', 'Title'), x, 152, 11, '#8a9ab8'); bevel(x, 158, w, 28, '#10101c', '#33334a', '#05050a');
    btn(x, 158, 28, 28, '‹', () => step(-1), { size: 16, col: '#2a2a48', off: !own.length }); btn(x + w - 28, 158, 28, 28, '›', () => step(1), { size: 16, col: '#2a2a48', off: !own.length });
    if (own.length && save.title && TITLES[save.title]) drawTitle('« ' + titleName(save.title) + ' »', x + w / 2, 177, 12, save.title, 'center'); else txt(own.length ? T2('Sem título', 'No title') : T2('Ainda sem títulos (ver Conquistas)', 'No titles yet (see Achievements)'), x + w / 2, 177, 12, '#778', 'center', 'bold'); }
  txt('Nick (não pode ser alterado)', x, 212, 11, '#8a9ab8'); bevel(x, 218, w, 28, '#10101c', '#33334a', '#05050a'); txt(on.nick || '', x + 10, 238, 14, '#fff', 'left', 'bold'); drawIcon('lock', x + w - 18, 232, 1.1);
  txt('País', x, 268, 11, '#8a9ab8');
  btn(x, 274, w, 30, '', () => { cpick = { pick: c => { e.country = c; } }; }, { col: '#2a2a48', hot: '#3a3a5a' }); drawFlag(e.country, x + 10, 281, 24, 16); txt(cName(e.country), x + 44, 294, 13, '#fff', 'left', 'bold'); txt('▾', x + w - 16, 294, 13, '#aab', 'center');
  { const c = flagCost(e); txt(e.msg || (c ? `Mudar de bandeira custa ◆${c}` : (on.country && on.country !== 'ZZ' ? 'Podes mudar de bandeira por ◆' + FLAG_COST : 'A primeira bandeira é grátis')), x + w / 2, 323, 11, e.msg ? e.col : c ? (save.gems >= c ? '#7fe8ff' : '#f88') : '#9ab', 'center'); }
  const changed = e.country !== (on.country || 'ZZ');
  btn(x, 332, w, 30, flagCost(e) ? `Guardar · ◆${flagCost(e)}` : 'Guardar', saveEditProfile, { size: 14, col: '#2f7a4a', hot: '#3fa061', off: e.busy || !changed || save.gems < flagCost(e) });
  wrap('O país vale para todos os teus personagens. O título é de cada personagem.', x, 376, w, 13, 10, '#778');
}

/* ----- Ranking online (Supabase; ver docs/ONLINE.md) ----- */
const ONLINE_URL = 'https://fnkjmykbjuxkagtjlyfn.supabase.co', ONLINE_KEY = 'sb_publishable_y_fMP0OBRbarUpDliORTdw_bfFYuwrx';   // preencher com o URL e a chave publica do teu projecto
const ON_STORE = 'gog-online-v1';
let on = { token: null, nick: null, gender: 'm', country: null };
try { const o = JSON.parse(localStorage.getItem(ON_STORE) || 'null'); if (o && /^[0-9a-f]{64}$/.test(o.token) && /^[A-Za-z0-9_]{3,16}$/.test(o.nick)) on = { token: o.token, nick: o.nick, gender: o.gender === 'f' ? 'f' : 'm', country: /^[A-Z]{2}$/.test(o.country || '') ? o.country : null }; } catch (e) {}
const onSave = () => { try { if (on.token) localStorage.setItem(ON_STORE, JSON.stringify(on)); else localStorage.removeItem(ON_STORE); } catch (e) {} };
let rk = { gmotto: '', gb: null, gp: null, gname: '', gtag: '', pname: '', code: '', cnick: '', gender: 'm', country: 'ZZ', mode: 'login', nick: '', pass: '', pass2: '', focus: '', stat: 'level', rows: [], me: null, busy: false, msg: '', col: '#f88', at: {}, loading: false };
rk.country = guessCountry();
const RK_MSG = {
  banned: 'A tua conta foi desativada por valores suspeitos no save. Fala com o administrador.',
  bad_nick: 'Nick inválido: 3 a 16 letras, números ou _', short_pass: 'A palavra-passe precisa de 8 a 64 caracteres', mismatch: 'As palavras-passe não coincidem', same_pass: 'A palavra-passe não pode ser igual ao nick',
  nick_taken: 'Esse nick já está em uso', class_taken: 'Já tens um personagem com esta classe', too_many: 'Já tens os 3 personagens', not_found: 'Personagem não encontrado', inactive: 'Esta conta está desativada. Fala com o administrador.', ip_limit: 'Já existem 5 contas criadas a partir desta rede', bad_login: 'Nick ou palavra-passe incorretos', locked: 'Conta bloqueada por tentativas falhadas. Tenta daqui a', busy: 'Muitos registos neste momento. Tenta daqui a uns minutos.',
  network: 'Sem ligação ao servidor', off: 'O ranking online ainda não está ligado a um servidor.', nocrypto: 'O teu browser não permite criptografia aqui (usa https).', server: 'Erro do servidor, tenta mais tarde',
  implausible: 'Progresso recusado pelo servidor (valores inesperados)', auth: 'Sessão expirada. Entra outra vez.', bad_request: 'Pedido inválido', bad_data: 'Dados inválidos', working: 'A ligar...', welcome: 'Sessão iniciada!', sent: 'Progresso enviado!', deleted: 'Conta apagada.', cheat: 'Este save não pode entrar no ranking.'
};
function rkSay(code, extra) { const good = code === 'welcome' || code === 'sent' || code === 'deleted' || code === 'working'; rk.msg = (RK_MSG[code] || code) + (extra ? ' ' + extra + 's' : ''); rk.col = good ? '#7fe8a0' : '#f88'; }
async function rpc(fn, args) {
  if (labOn) return { ok: false, error: 'lab' };   // laboratorio: nada sai do jogo
  if (!ONLINE_URL || !ONLINE_KEY) return { ok: false, error: 'off' };
  try {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 20000);
    try { const r = await fetch(`${ONLINE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: ONLINE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: ac.signal });
      const j = await r.json(); return j && typeof j === 'object' && 'ok' in j ? j : { ok: false, error: 'server' }; } finally { clearTimeout(tm); }
  } catch (e) { return { ok: false, error: 'network' }; }
}
// A palavra-passe nunca sai do dispositivo: envia-se apenas PBKDF2-SHA256 (210 000 iteracoes, sal = nick) em hexadecimal.
async function mkProof(nick, pass) {
  const enc = new TextEncoder(), key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('gog1|' + nick.toLowerCase()), iterations: 210000 }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function statsAdd(g) { const t = save.stats = save.stats || { kills: 0, gold: 0, bosses: 0 }; t.kills += R.kills | 0; t.gold += Math.max(0, g | 0); t.bosses += R.bossK | 0; onlineSubmit(); }
function statPayload() {
  const t = save.stats || { kills: 0, gold: 0, bosses: 0 }, f = save.farmBest || {}, o = { cls: save.cls, level: save.pl.lv, kills: Math.floor(t.kills), gold: Math.floor(t.gold), bosses: t.bosses | 0, raids: Object.values(save.raids || {}).reduce((a, v) => a + (v || []).reduce((x, y) => x + y, 0), 0) };
  for (let i = 0; i < 6; i++) o['w' + i] = f[i] | 0; o.build = buildPayload(); return o;
}
// build publica (so dados de jogo): skin, arma, atributos e equipamento
function buildPayload() {
  const g = {}; for (const sl of EQ_SLOTS) { const it = save.gear[sl]; if (it) { g[sl] = { r: it.r, e: it.ench || 0, st: it.st || 0, sp: it.spec ? it.spec.nm : '' }; if (sl === 'ring') g[sl].g = it.gem | 0; } }   // o anel leva a cor da gema (g)
  const w = curW(); return { pet: save.pets && save.pets.eq && save.pets.own[save.pets.eq] ? { id: save.pets.eq, lv: petLv(save.pets.eq), name: (save.pets.names && save.pets.names[save.pets.eq]) || '' } : null, skin: 0, title: save.title && TITLES[save.title] && titleOwned(save.title) ? save.title : '', weapon: { id: w.id, lv: wlvl(), st: wStar(w.id) }, attr: Object.assign({}, save.attr), gear: g };
}
async function openProfile(nick) {
  rk.prof = { nick, d: null, err: '' }; const r = await rpc('gog_profile', { p_nick: nick });
  if (rk.prof && rk.prof.nick === nick) { if (r.ok) rk.prof.d = r; else rk.prof.err = r.error || 'server'; }
}
let subBusy = false;
function autoSync() { if (on.token && save && state !== 'play' && !(save.cheat && save.cheat.used) && JSON.stringify(statPayload()) !== rk.sentHash) onlineSubmit(); }
setInterval(autoSync, 30000);
async function onlineSubmit() {
  if (!on.token || !save || subBusy) return; if (save.cheat && save.cheat.used) return;
  subBusy = true; const r = await rpc('gog_submit', { p_token: on.token, p: statPayload() }); subBusy = false;
  if (r.error === 'auth') { dropSession(false); rkSay('auth'); } else if (r.ok) { rk.sentHash = JSON.stringify(statPayload()); rk.lastSub = Date.now(); rk.at = {}; if (tab === 'rank') rkLoad(true); } else if (r.error === 'implausible') rkSay('implausible');
  return r;
}
// rk.at guarda a classificacao de cada categoria (rows, me, hora); limpar rk.at forca nova leitura
let rkSeq = 0;
async function rkLoad(force) {
  const st = rk.stat; if (!ONLINE_URL) return; if (st === 'guilds') return gbLoad(force);
  const c = rk.at[st]; rk.rows = c ? c.rows : []; rk.me = c ? c.me : null;                  // mostra logo o que ja temos desta categoria
  if (!force && c && Date.now() - c.t < 15000) return;
  const my = ++rkSeq; rk.loading = true; const r = await rpc('gog_board', { p_stat: st, p_limit: 14, p_token: on.token }); if (my === rkSeq) rk.loading = false;
  if (r.ok) { rk.at[st] = { rows: r.rows || [], me: r.me || null, t: Date.now() }; if (st === rk.stat) { rk.rows = rk.at[st].rows; rk.me = rk.at[st].me; } } else if (st === rk.stat) rkSay(r.error);
}
async function rkAuth(register) {
  if (rk.busy) return; const nick = rk.nick.trim();
  if (!ONLINE_URL) return rkSay('off');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) return rkSay('bad_nick');
  if (rk.pass.length < 8 || rk.pass.length > 64) return rkSay('short_pass');
  if (register && rk.pass !== rk.pass2) return rkSay('mismatch');
  if (register && rk.pass.toLowerCase() === nick.toLowerCase()) return rkSay('same_pass');
  rk.busy = true; rkSay('working'); let proof;
  try { proof = await mkProof(nick, rk.pass); } catch (e) { rk.busy = false; return rkSay('nocrypto'); }
  const r = await rpc(register ? 'gog_register' : 'gog_login', register ? { p_nick: nick, p_proof: proof, p_gender: rk.gender, p_country: rk.country === 'ZZ' ? null : rk.country } : { p_nick: nick, p_proof: proof }); rk.busy = false;
  if (r.ok) { on = { token: r.token, nick: r.nick, gender: r.gender === 'f' ? 'f' : 'm', country: r.country || null }; onSave(); rk.pass = rk.pass2 = ''; rk.focus = ''; rkSay('welcome'); rk.at = {}; cloudStart(); } else rkSay(r.error, r.wait);
}
async function rkLogout() {
  if (ONLINE_URL && cloud.ready && (cloud.dirty || cloud.timer || cloud.busy)) {
    const ok = await cloudFlush();
    if (!ok && !cloud.confirmOut) { cloud.confirmOut = true; rkSay('Não foi possível guardar o progresso recente. Clica outra vez para sair mesmo assim.'); return; }
  }
  const t = on.token; dropSession(true); if (t) rpc('gog_logout', { p_token: t });
}
function rankKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const k = e.code, f = rk.focus;
  if (k === 'Escape') { rk.focus = ''; return true; }
  if (k === 'Tab') { e.preventDefault(); const order = on.token ? ['pass'] : rk.mode === 'register' ? ['nick', 'pass', 'pass2'] : ['nick', 'pass']; rk.focus = order[(order.indexOf(f) + 1) % order.length]; return true; }
  if (k === 'Enter') { e.preventDefault(); if (f === 'gname' || f === 'gtag') createGuild(); else if (f === 'gmotto') saveGStyle(); else if (f === 'pname') confirmPetRename(); else if (f === 'code') redeemCode(); else if (f === 'cnick' && chNew) createChar(chNew); else if (!on.token) rkAuth(rk.mode === 'register'); return true; }
  if (k === 'Backspace') { e.preventDefault(); rk[f] = (rk[f] || '').slice(0, -1); return true; }
  if (e.key && e.key.length === 1) { e.preventDefault(); if (f === 'gmotto' ? /[A-Za-z0-9 .,!?_'-]/.test(e.key) && (rk[f] || '').length < 40 : f === 'gname' ? /[A-Za-z0-9 _-]/.test(e.key) && (rk[f] || '').length < 16 : f === 'gtag' ? /[A-Za-z0-9]/.test(e.key) && (rk[f] || '').length < 4 : f === 'pname' ? /[A-Za-z0-9 _-]/.test(e.key) && (rk[f] || '').length < 12 : f === 'nick' || f === 'cnick' || f === 'code' ? /[A-Za-z0-9_]/.test(e.key) && (rk[f] || '').length < 16 : rk[f].length < 64) rk[f] = (rk[f] || '') + e.key; return true; }
  return false;
}
function rkField(x, y, w, label, key, mask) {
  txt(label, x, y - 5, 12, '#9ab'); const foc = rk.focus === key;
  btn(x, y, w, 28, '', () => { rk.focus = key; }, { col: foc ? '#26264a' : '#12121f', hot: '#1c1c34', sel: false });
  const v = mask ? '•'.repeat(rk[key].length) : rk[key];
  txt(v + (foc && Math.floor(T * 2) % 2 ? '_' : ''), x + 8, y + 20, 15, '#fff', 'left', 'bold');
}
const RK_STATS = () => [['level', 'Nível'], ['kills', 'Mobs'], ['gold', 'Ouro'], ['bosses', 'Bosses'], ['raids', 'Raids'], ['guilds', E2('Guilds', 'Guildas')]].concat(MISSIONS.map((m, i) => ['wave' + i, 'Mapa ' + (i + 1)]));
function hubRank() {
  const cheat = save.cheat && save.cheat.used, conf = !!ONLINE_URL;
  panel(197, 90, 225, 386, '#16162a');
  if (!on.token) {
    txt('Conta online', 309, 114, 16, '#f0c060', 'center', 'bold');
    ['login', 'register'].forEach((m, i) => btn(207 + i * 103, 124, 100, 26, m === 'login' ? 'Entrar' : 'Criar conta', () => { rk.mode = m; rk.pass2 = ''; rk.msg = ''; }, { size: 13, col: rk.mode === m ? '#a8821f' : '#2a2a48' }));
    rkField(207, 176, 205, 'Nick', 'nick', false); rkField(207, 226, 205, 'Palavra-passe', 'pass', true);
    let y = 262; if (rk.mode === 'register') { rkField(207, 276, 205, 'Repetir palavra-passe', 'pass2', true); y = 312; }
    btn(207, y + 4, 205, 34, rk.mode === 'register' ? 'Criar conta' : 'Entrar', () => rkAuth(rk.mode === 'register'), { size: 15, col: '#2f7a4a', hot: '#3fa061', off: rk.busy || !conf });
    if (!conf) wrap(RK_MSG.off, 207, y + 54, 205, 14, 12, '#f88'); else if (rk.msg) wrap(rk.msg, 207, y + 54, 205, 14, 12, rk.col);
    wrap('A tua palavra-passe nunca sai deste dispositivo: só é enviada uma prova criptográfica. Não há recuperação de palavra-passe, por isso guarda-a bem.', 207, 408, 205, 13, 10, '#778');
  } else {
    txt('Conectado como', 309, 112, 12, '#9ab', 'center'); txt(on.nick, 309, 136, 20, '#ffd34a', 'center', 'bold');
    const t = save.stats || { kills: 0, gold: 0, bosses: 0 };
    [['Nível', gfmt(save.pl.lv)], ['Mobs mortos', gfmt(t.kills | 0)], ['Ouro ganho', gfmt(t.gold | 0)], ['Bosses', gfmt(t.bosses | 0)]].forEach(([n, v], i) => { txt(n, 210, 170 + i * 20, 13, '#9ab'); txt(v, 410, 170 + i * 20, 13, '#fff', 'right', 'bold'); });
    if (cheat) wrap(RK_MSG.cheat, 207, 262, 205, 14, 12, '#f88'); else { const ago = rk.lastSub ? Math.floor((Date.now() - rk.lastSub) / 1000) : -1; txt('Sincronização automática', 309, 270, 13, '#7fe8a0', 'center', 'bold'); txt(ago < 0 ? 'A aguardar a primeira sincronização...' : ago < 60 ? 'Última: agora mesmo' : `Última: há ${Math.floor(ago / 60)} min`, 309, 290, 12, '#9ab', 'center'); }
    if (rk.msg) wrap(rk.msg, 207, 304, 205, 14, 12, rk.col);
    btn(207, 346, 205, 28, 'Terminar sessão', rkLogout, { size: 13, col: '#3a2a3a' });
    wrap('Para desativar ou recuperar a conta fala com o administrador.', 207, 400, 205, 14, 11, '#778');
  }
  // classificacao
  panel(430, 90, 352, 386, '#16162a');
  const st = RK_STATS(); st.forEach(([k, n], i) => btn(i < 6 ? 438 + i * 56 : 438 + (i - 6) * 56, i < 6 ? 98 : 124, 52, 22, n, () => { rk.stat = k; rkLoad(false); }, { size: 11, col: rk.stat === k ? '#a8821f' : '#2a2a48' }));
  const idx = st.findIndex(q => q[0] === rk.stat), title = idx < 5 ? ['Maior nível', 'Mais mobs mortos', 'Mais ouro ganho', 'Mais bosses derrotados', 'Mais raids vencidas'][idx] : idx === 5 ? E2('Top guilds', 'Melhores guildas') : 'Recorde de waves: ' + MISSIONS[idx - 6].name;
  txt(title, 606, 170, 15, '#f0c060', 'center', 'bold');
  btn(740, 150, 34, 20, '↻', () => rkLoad(true), { size: 13, col: '#2a2a48', off: !conf });
  if (!conf) { wrap(RK_MSG.off, 446, 240, 320, 16, 13, '#889'); return; }
  if (rk.stat === 'guilds') {
    const G = rk.gb; if (!G) { gbLoad(false); txt(E2('Loading...', 'A carregar...'), 606, 280, 14, '#778', 'center'); return; }
    if (!G.rows.length) txt(E2('No guilds yet.', 'Ainda não há guildas.'), 606, 280, 14, '#778', 'center');
    G.rows.forEach((g, i) => {
      const y = 186 + i * 20.5, mine = g.id === G.mine, col = i === 0 ? '#ffd34a' : i === 1 ? '#d8e0f0' : i === 2 ? '#e0a060' : '#fff';
      if (mine) { ctx.fillStyle = '#10263e'; ctx.fillRect(438, y - 13, 336, 19); ctx.fillStyle = '#4aa8ff'; ctx.fillRect(438, y - 13, 3, 19); }
      const hov = mouse.x - UIOX >= 438 && mouse.x - UIOX <= 774 && mouse.y >= y - 13 && mouse.y <= y + 6; if (hov && !mine) { ctx.fillStyle = '#ffffff12'; ctx.fillRect(438, y - 13, 336, 19); }
      ui.push({ x: 438, y: y - 13, w: 336, h: 19, fn: () => openGuild(g.id) });
      txt('#' + g.rank, 446, y, 13, col, 'left', 'bold'); drawGEmb(g.emblem, 480, y - 10, 1.5, gcol(g.color)); txt(`[${g.tag}] ${g.name}`, 500, y, 14, gcol(g.color), 'left', 'bold');
      txt(E2(`Lv ${g.level} · ${g.members}/${GUILD.max}`, `Nv ${g.level} · ${g.members}/${GUILD.max}`), 768, y, 12, '#cfd8f0', 'right', 'bold');
    });
    if (G.rows.length) txt(E2('Click a guild to see its profile', 'Clica numa guilda para ver o perfil'), 606, 452, 11, '#778', 'center');
    return;
  }
  if (!rk.rows.length) txt(rk.loading ? 'A carregar...' : 'Ainda sem resultados.', 606, 280, 14, '#778', 'center');
  rk.rows.forEach((r, i) => {
    const y = 186 + i * 20.5, mine = on.nick && r.nick.toLowerCase() === on.nick.toLowerCase(), col = i === 0 ? '#ffd34a' : i === 1 ? '#d8e0f0' : i === 2 ? '#e0a060' : '#fff';
    if (mine) { ctx.fillStyle = '#10263e'; ctx.fillRect(438, y - 13, 336, 19); ctx.fillStyle = '#4aa8ff'; ctx.fillRect(438, y - 13, 3, 19); }   // a tua linha fica a azul, para nao se confundir com o 1.º lugar
    const hov = mouse.x - UIOX >= 438 && mouse.x - UIOX <= 774 && mouse.y >= y - 13 && mouse.y <= y + 6; if (hov && !mine) { ctx.fillStyle = '#ffffff12'; ctx.fillRect(438, y - 13, 336, 19); }
    ui.push({ x: 438, y: y - 13, w: 336, h: 19, fn: () => openProfile(r.nick) });
    if (SPR[r.cls + '0']) drawSprBig(hk(r.cls, r.skin, r.gender), 482, y - 4, .5);
    txt('#' + r.rank, 446, y, 13, col, 'left', 'bold'); txt(r.nick, 502, y, 14, mine ? '#6cc4ff' : col, 'left', 'bold'); let fx = 502 + txtW(r.nick, 14, 'bold') + 8;
    if (r.gtag) { const tgt = '[' + r.gtag + ']'; txt(tgt, fx, y, 10, gcol(r.gcol)); fx += txtW(tgt, 10) + 6; }
    if (r.country) { drawFlag(r.country, fx, y - 10, 16, 11); fx += 22; }
    { const tt = r.title && TITLES[r.title] ? '« ' + titleName(r.title) + ' »' : '', room = 768 - txtW(gfmt(r.value), 14, 'bold') - 8 - fx; if (tt && txtW(tt, 10, 'bold') <= room) drawTitle(tt, fx, y, 10, r.title); else if (rk.stat !== 'level' && txtW('Nv ' + r.lv, 11) <= room) txt('Nv ' + r.lv, fx, y, 11, '#8a9ab8'); }
    txt(gfmt(r.value), 768, y, 14, '#fff', 'right', 'bold');
  });
  if (rk.rows.length) txt('Clica num jogador para ver o perfil', 606, 452, 11, '#778', 'center');
  if (rk.me) txt(`Tu: #${rk.me.rank} · ${gfmt(rk.me.value)}`, 606, 468, 14, '#7fe8a0', 'center', 'bold');
}

/* ----- Save na nuvem: com o servidor configurado o login e obrigatorio e o save vive na conta ----- */
const OWNER_KEY = 'bladehunter_owner';
const DEV_ID = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
const cloudNew = () => ({ rev: 0, dirty: false, busy: false, timer: null, ready: false, err: '', confirmOut: false, uid: null, cls: null, taken: [] });
let cloud = cloudNew(), cf = null;
function lsSync(ok) { try { localStorage.setItem('bladehunter_unsynced', ok ? '0' : '1'); if (ok) localStorage.setItem('bladehunter_rev', String(cloud.rev)); } catch (e) {} }
function cloudMark() { if (!ONLINE_URL || !on.token || !cloud.ready || !save) return; cloud.dirty = true; lsSync(false); if (!cloud.timer) cloud.timer = setTimeout(() => cloudFlush(), 8000); }
async function cloudFlush() {
  clearTimeout(cloud.timer); cloud.timer = null;
  if (!cloud.dirty || cloud.busy || !on.token || !cloud.ready || !save) return !cloud.dirty;
  cloud.busy = true; cloud.dirty = false;
  const r = await rpc('gog_save_put', { p_token: on.token, p_save: save, p_rev: cloud.rev, p_dev: DEV_ID }); cloud.busy = false;
  if (r.ok) { cloud.rev = r.rev; cloud.err = ''; lsSync(!cloud.dirty); if (cloud.dirty) cloudMark(); return true; }
  cloud.dirty = true;
  if (r.error === 'conflict') {
    if (r.dev === DEV_ID) { cloud.rev = r.rev; cloud.timer = setTimeout(() => cloudFlush(), 500); return false; }   // foi esta mesma janela (ex.: envio ao fechar)
    cloudConflict(); return false;
  }
  if (r.error === 'auth') { dropSession(false); return false; }
  if (r.error === 'banned') { cloud.dirty = false; cloud.timer = null; dropSession(false); rkSay('banned'); return false; }   // anti-batota: valores impossiveis ou 3 ocorrencias
  if (r.error === 'cheat') { cloud.err = 'cheat'; hubToast = { t: 6, s: 'O servidor recusou o save: valores suspeitos. Se jogaste normalmente, espera um pouco e tenta outra vez.', col: '#f88' }; cloud.timer = setTimeout(() => cloudFlush(), 60000); return false; }
  if (r.error === 'not_new' || r.error === 'wrong_class' || r.error === 'class_taken') {   // o servidor so aceita um personagem novo numa conta nova: o save local nao pertence a esta conta
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) localStorage.setItem('bladehunter_orphan', raw); localStorage.removeItem(SAVE_KEY); } catch (e) {}
    save = null; cloud.dirty = false; cloud.timer = null; lsSync(true); if (state !== 'play') state = 'menu'; return false;
  }
  cloud.err = r.error; cloud.timer = setTimeout(() => cloudFlush(), r.error === 'slow' ? 4000 : 15000); return false;
}
function cloudApply(sv, upload) {
  save = sv; try { localStorage.setItem(OWNER_KEY, cloud.uid || on.nick); if (sv) localStorage.setItem(SAVE_KEY, JSON.stringify(sv)); } catch (e) {}
  cloud.ready = true; cloud.dirty = false; cloud.confirmOut = false; cf = null; rk.at = {};
  if (upload && sv) { cloud.dirty = true; lsSync(false); cloudFlush(); } else lsSync(true);
  if (state === 'sync' || state === 'conflict' || state === 'syncerr') state = 'menu';
  onlineSubmit(); loadGuild(true);
}
async function cloudConflict() {
  if (state === 'play') { cloud.timer = setTimeout(cloudConflict, 20000); return; }
  cloud.ready = false; const r = await rpc('gog_save_get', { p_token: on.token });
  if (!r.ok || !r.save) { cloud.ready = true; cloud.timer = setTimeout(() => cloudFlush(), 15000); return; }
  cloud.rev = r.rev; const cl = normalize(r.save), lo = save;
  cf = { cloud: cl, local: lo, reason: 'dev', done: u => cloudApply(u ? lo : cl, u) }; state = 'conflict';
}
async function cloudStart() {
  state = 'sync'; cloud.ready = false; cloud.err = '';
  const r = await rpc('gog_save_get', { p_token: on.token });
  if (r.error === 'auth') { dropSession(false); return; }
  if (!r.ok) { cloud.err = r.error; state = 'syncerr'; return; }
  cloud.rev = r.rev; cloud.uid = r.uid || null; cloud.cls = r.cls || null; cloud.taken = Array.isArray(r.taken) ? r.taken : [];
  // o save deste dispositivo so e usado se pertencer a ESTA conta (id da conta, nao o nick): evita levar o progresso de uma conta para outra
  let local = null, owner = null, uns = false, srev = -1;
  try {
    owner = localStorage.getItem(OWNER_KEY); const raw = localStorage.getItem(SAVE_KEY);
    const trusted = !!owner && (owner === r.uid || (!r.uid && owner === on.nick) || (owner === on.nick && !!r.save));   // dono antigo (nick) so vale se a conta ja tem save na nuvem
    if (raw && trusted) local = normalize(JSON.parse(raw)); else if (raw) localStorage.setItem('bladehunter_orphan', raw);   // fica guardado de lado e nunca passa para outra conta
    uns = localStorage.getItem('bladehunter_unsynced') === '1'; const sr = localStorage.getItem('bladehunter_rev'); srev = sr === null ? -1 : +sr;
  } catch (e) { local = null; }
  const mine = !!local;
  if (r.save) {
    let cl; try { cl = normalize(r.save); } catch (e) { cloud.err = 'bad_data'; state = 'syncerr'; return; }
    if (mine && uns && srev !== r.rev) { cf = { cloud: cl, local, reason: 'dev', done: u => cloudApply(u ? local : cl, u) }; state = 'conflict'; return; }
    if (mine && uns) return cloudApply(local, true);
    return cloudApply(cl, false);
  }
  if (mine) return cloudApply(local, true);   // personagem novo desta conta ainda por enviar
  cloudApply(null, false);                   // conta nova: comeca sempre com um personagem novo
}
async function cloudNewGame(k) {
  if (ONLINE_URL && on.token && cloud.ready) await cloudReset();   // personagem novo = ranking novo
  save = newSave(k); persist(); goHub();
}
async function cloudReset() {
  if (!ONLINE_URL || !on.token) return; clearTimeout(cloud.timer); cloud.timer = null; cloud.dirty = false;
  const r = await rpc('gog_save_reset', { p_token: on.token }); if (r.ok) { cloud.rev = r.rev; lsSync(true); rk.at = {}; }
}
// varios personagens por conta (um por classe): cada um tem o seu nick, save e ranking. A nuvem e a fonte de verdade:
// antes de trocar guarda-se o personagem atual, e o save local de outro personagem nunca e reutilizado (ver cloudStart).
let chList = null, chBusy = false, chMsg = '', chNew = null;
async function loadChars() { if (!on.token) return; const r = await rpc('gog_chars', { p_token: on.token }); if (r.ok) chList = r.chars; }
async function cloudSettle() {
  const wait = async () => { for (let i = 0; i < 60 && cloud.busy; i++) await new Promise(r => setTimeout(r, 100)); };
  await wait(); if (cloud.ready && (cloud.dirty || cloud.timer)) await cloudFlush(); await wait();
  return !cloud.dirty && !cloud.busy;
}
function activateChar(r) {
  const old = on.token; on = { token: r.token, nick: r.nick, gender: r.gender === 'f' ? 'f' : 'm', country: r.country || null }; onSave();
  clearTimeout(cloud.timer); cloud = cloudNew(); save = null; rk.at = {}; chList = null; editProf = null; chNew = null; rk.cnick = ''; rk.focus = ''; rk.prof = null; rk.me = null; tab = 'farm'; bagPage = 0; bagMulti = false; bagPick.clear(); bagSel = -1; enchItem = null;
  state = 'sync'; if (old) rpc('gog_logout', { p_token: old }); cloudStart();
}
async function switchChar(nick) {
  if (chBusy || !nick || nick.toLowerCase() === (on.nick || '').toLowerCase()) return; chBusy = true; chMsg = 'A guardar o personagem atual...';
  if (!(await cloudSettle())) { chBusy = false; chMsg = 'Não foi possível guardar o personagem atual. Espera uns segundos e tenta outra vez.'; return; }
  const r = await rpc('gog_char_switch', { p_token: on.token, p_nick: nick }); chBusy = false;
  if (!r.ok) { chMsg = RK_MSG[r.error] || 'Erro, tenta outra vez'; return; } chMsg = ''; activateChar(r);
}
async function createChar(cls) {
  if (chBusy) return; const nick = rk.cnick.trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) { chMsg = RK_MSG.bad_nick; return; }
  chBusy = true; chMsg = 'A criar...';
  if (!(await cloudSettle())) { chBusy = false; chMsg = 'Não foi possível guardar o personagem atual. Tenta outra vez.'; return; }
  const r = await rpc('gog_char_create', { p_token: on.token, p_cls: cls, p_nick: nick }); chBusy = false;
  if (!r.ok) { chMsg = RK_MSG[r.error] || 'Erro, tenta outra vez'; return; } chMsg = ''; SFX.buy(); activateChar(r);
}
function drawCharCreate() {
  if (!chNew || state !== 'hub' || tab !== 'profile') return;
  ctx.fillStyle = '#000c'; ctx.fillRect(-UIOX, 0, W, H); ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => { if (!chBusy) chNew = null; } });
  const x = 220, y = 120, w = 360, h = 230; panel(x, y, w, h, '#16162a', '#a8821f'); ui.push({ x, y, w, h, fn: () => {} });
  txt('Criar personagem', x + w / 2, y + 34, 20, '#ffd34a', 'center', 'bold'); txt(CLASSES[chNew].name, x + w / 2, y + 58, 15, '#9cf', 'center', 'bold');
  rkField(x + 24, y + 86, w - 48, 'Nick do personagem', 'cnick', false);
  wrap('Cada personagem tem um nick diferente e uma classe fixa. Entras com a mesma palavra-passe.', x + 24, y + 134, w - 48, 14, 11, '#778');
  if (chMsg) txt(chMsg, x + w / 2, y + 176, 12, chBusy ? '#9ab' : '#f88', 'center');
  btn(x + 24, y + 186, 150, 30, 'Criar', () => createChar(chNew), { size: 14, col: '#2f7a4a', hot: '#3fa061', off: chBusy || rk.cnick.length < 3 });
  btn(x + 186, y + 186, 150, 30, 'Cancelar', () => { if (!chBusy) { chNew = null; chMsg = ''; } }, { size: 14, col: '#3a2a3a' });
}
function dropSession(wipe) {
  gld.info = null; gld.loaded = false; gld.list = []; gld.msg = '';
  on = { token: null, nick: null }; onSave(); clearTimeout(cloud.timer); cloud = cloudNew(); cf = null; rk.prof = null; rk.me = null; rk.rows = []; rk.at = {}; rk.pass = rk.pass2 = ''; rk.focus = ''; rk.focusSet = false; rk.msg = '';
  if (wipe) { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('bladehunter_v2'); localStorage.removeItem(OWNER_KEY); localStorage.removeItem('bladehunter_unsynced'); localStorage.removeItem('bladehunter_rev'); } catch (e) {} save = null; }
  if (state !== 'play') state = 'login';
}
document.addEventListener('visibilitychange', () => { if (document.hidden) cloudFlush(); });
addEventListener('pagehide', () => {
  if (ONLINE_URL && cloud.dirty && on.token && cloud.ready && save) fetch(`${ONLINE_URL}/rest/v1/rpc/gog_save_put`, { method: 'POST', keepalive: true, headers: { apikey: ONLINE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: on.token, p_save: save, p_rev: cloud.rev, p_dev: DEV_ID }) }).catch(() => {});
});
function menuAccount() { if (ONLINE_URL && on.token) btn(190, 8, 150, 24, 'Personagens', () => { state = 'hub'; tab = 'profile'; chList = null; editProf = null; }, { size: 12, col: '#2a3a5a', off: !save }); if (ONLINE_URL && on.token) btn(8, 8, 176, 24, cloud.confirmOut ? 'Sair sem guardar?' : 'Sair: ' + on.nick, rkLogout, { size: 12, col: cloud.confirmOut ? '#a03a3a' : '#3a2a3a' }); }
function sumSave(sv) { let w = 0; for (const k in (sv.farmBest || {})) w = Math.max(w, sv.farmBest[k] | 0); return [`${CLASSES[sv.cls].name} · Nv ${sv.pl.lv}`, '¢' + gfmt(sv.gold | 0) + '   ◆' + (sv.gems | 0), 'Campanha: onda ' + w]; }
function drawLogin() {
  menuScene(); if (!rk.focusSet) { rk.focus = 'nick'; rk.focusSet = true; }
  const gx = UW / 2; txt('GUARDIANS OF GOLD', gx, 62, 36, '#f0c060', 'center', 'bold'); txt('Entra na tua conta para jogar', gx, 88, 15, '#cdd6f0', 'center');
  panel(235, 108, 330, rk.mode === 'register' ? 362 : 372, '#16162aee');
  ['login', 'register'].forEach((m, i) => btn(247 + i * 158, 120, 154, 28, m === 'login' ? 'Entrar' : 'Criar conta', () => { rk.mode = m; rk.pass2 = ''; rk.msg = ''; }, { size: 14, col: rk.mode === m ? '#a8821f' : '#2a2a48' }));
  rkField(247, 176, 306, 'Nick', 'nick', false); rkField(247, 232, 306, 'Palavra-passe', 'pass', true);
  let y = 270; if (rk.mode === 'register') {
    rkField(247, 288, 306, 'Repetir palavra-passe', 'pass2', true);
    btn(247, 346, 306, 26, '', () => { rk.focus = ''; cpick = { pick: c => { rk.country = c; } }; }, { col: '#2a2a48', hot: '#3a3a5a' }); drawFlag(rk.country, 258, 352, 22, 14); txt(cName(rk.country), 290, 364, 13, '#fff', 'left', 'bold'); txt('▾', 540, 364, 13, '#aab', 'center');
    y = 378; }
  btn(247, y + 4, 306, 38, rk.mode === 'register' ? 'Criar conta' : 'Entrar', () => rkAuth(rk.mode === 'register'), { size: 17, col: '#2f7a4a', hot: '#3fa061', off: rk.busy });
  if (rk.msg) wrap(rk.msg, 247, y + 48, 306, 15, 13, rk.col);
  if (rk.mode !== 'register') wrap('A tua palavra-passe nunca sai deste dispositivo: só é enviada uma prova criptográfica. Não há recuperação de palavra-passe, por isso guarda-a bem.', 247, 420, 306, 13, 11, '#778');
  btn(8, 8, 60, 24, lang === 'en' ? 'EN' : 'PT', () => setLang(lang === 'en' ? 'pt' : 'en'), { size: 12, col: '#2a2a48' });
}
function drawSync() {
  menuScene(); const gx = UW / 2; panel(225, 170, 350, 150, '#16162aee');
  if (state === 'sync') { txt('A carregar o teu save' + '.'.repeat(1 + Math.floor(T * 2) % 3), gx, 245, 18, '#fff', 'center', 'bold'); return; }
  txt('Sem ligação ao servidor', gx, 214, 18, '#f88', 'center', 'bold'); txt('O jogo precisa de internet para carregar a tua conta.', gx, 238, 12, '#9ab', 'center');
  btn(250, 256, 140, 34, 'Tentar outra vez', cloudStart, { size: 14, col: '#2f7a4a', hot: '#3fa061' }); btn(410, 256, 140, 34, 'Terminar sessão', () => { const t = on.token; dropSession(true); if (t) rpc('gog_logout', { p_token: t }); }, { size: 14, col: '#3a2a3a' });
}
function drawConflict() {
  menuScene(); const gx = UW / 2; if (!cf) { state = 'menu'; return; }
  txt('Que save queres usar?', gx, 62, 28, '#f0c060', 'center', 'bold');
  txt(cf.reason === 'legacy' ? 'Já tens um save guardado na conta e outro neste dispositivo.' : 'Esta conta foi usada noutro dispositivo desde a última vez.', gx, 90, 13, '#cdd6f0', 'center');
  [['Save da conta', cf.cloud, false, '#2f7a4a'], [cf.reason === 'legacy' ? 'Save deste dispositivo' : 'Save desta janela', cf.local, true, '#a06a20']].forEach(([h, sv, u, col], i) => {
    const x = 120 + i * 300, y = 120; panel(x, y, 280, 250, '#16162aee'); txt(h, x + 140, y + 30, 18, '#fff', 'center', 'bold');
    drawSprBig(sv.cls + '0', x + 140, y + 100, 3);
    sumSave(sv).forEach((t, k) => txt(t, x + 140, y + 160 + k * 20, k ? 13 : 15, k ? '#bcd' : '#ffd34a', 'center', k ? 'normal' : 'bold'));
    btn(x + 30, y + 206, 220, 34, 'Usar este', () => cf.done(u), { size: 15, col, hot: '#c98a30' });
  });
  wrap(cf.reason === 'legacy' ? 'O save que não escolheres deixa de existir. O da conta fica guardado online.' : 'Escolhe o da conta para carregar o que foi guardado, ou o desta janela para o substituir.', 150, 392, 500, 15, 13, '#9ab');
}

