/* ---------- Novidades: o que mudou em cada atualizacao ----------
   Abre sozinho no acampamento quando ha novidades que ainda nao viste (save.newsB = ultima versao vista).
   Nas Opcoes ha um botao para as rever. A mais recente fica no topo da lista: acrescenta as novas no inicio. */
const NEWS = [
  { b: 77, d: '20/11/2026', l: [
    ['Novo: este painel de Novidades. Abre sozinho depois de cada atualização e também nas Opções.', 'New: this What\'s New panel. It opens by itself after each update, and from Options.'],
    ['Os monstros batem conforme o nível do mapa e já não conforme a tua vida máxima: mais vida = aguentas mais golpes.', 'Monsters now hit according to the map level, not your max health: more health = you survive more hits.'],
    ['Redução de dano: só conta até 60% e o Personagem mostra "60% MAX" a verde. O que passar dos 60% vira vida: +1% de vida máxima por cada 1%.', 'Damage reduction: only counts up to 60% and Character shows "60% MAX" in green. Anything above 60% becomes health: +1% max health for each 1%.'],
    ['Encantar especial passa pelo servidor: o preço e o efeito sorteado ficam guardados logo.', 'Special enchant now goes through the server: the price and the rolled effect are saved straight away.'],
    ['Wiki: nova secção Força dos monstros, com o dano por mapa, prestígio e onda.', 'Wiki: new Monster strength section, with the damage per map, prestige and wave.'],
  ] },
  { b: 72, d: '19/11/2026', l: [
    ['Prestígio na onda 20 (Abismo Final: onda 30).', 'Prestige at wave 20 (Final Abyss: wave 30).'],
    ['Títulos dos mapas na onda 40 (Abismo Final: onda 50).', 'Map titles at wave 40 (Final Abyss: wave 50).'],
    ['Com os 5 prestígios de um mapa, escolhes começar na onda 10, 20, 30 ou 40 (as ondas saltadas não dão recompensas).', 'With all 5 prestiges on a map you can start at wave 10, 20, 30 or 40 (skipped waves give no rewards).'],
    ['Pets: todos apanham moedas e corações. Galinha: 0.25% do teu dano por nível. Pássaro: cura 0.15% do teu dano por segundo, por nível.', 'Pets: all of them pick up coins and hearts. Chicken: 0.25% of your damage per level. Bird: heals 0.15% of your damage per second, per level.'],
    ['Torre: morrer já não te bloqueia (tentas outra vez no mesmo andar) e há um aviso de quando volta ao andar 1.', 'Tower: dying no longer locks you out (try the same floor again) and a notice shows when it resets to floor 1.'],
    ['Velocidade: x1 ligeiramente mais rápido e x2 menos rápido.', 'Speed: x1 slightly faster and x2 slower.'],
    ['Perfil público: passar o rato nos atributos mostra as estatísticas.', 'Public profile: hovering the attributes shows the stats.'],
  ] },
];
let newsOpen = false, newsPg = 0, newsAuto = false;
const newsSeen = () => (save && +save.newsB) || 0;
function newsShow() { newsOpen = true; newsPg = 0; }
function newsClose() { newsOpen = false; if (save && newsSeen() < NEWS[0].b) { save.newsB = NEWS[0].b; persist(); } SFX.click(); }
function drawNews() {
  if (!save) return;
  if (!newsOpen && !newsAuto && state === 'hub' && !(save.tut && save.tut.on) && newsSeen() < NEWS[0].b) { newsAuto = true; newsShow(); }   // uma vez por sessao, so com novidades por ver
  if (!newsOpen) return;
  const pg = Math.max(0, Math.min(NEWS.length - 1, newsPg)), n = NEWS[pg], X = 140, Y = 46, Wd = 520, Hd = 420;
  ui.push({ x: -UIOX, y: 0, w: W, h: H, fn: () => {} });   // bloqueia os botoes por baixo
  ctx.fillStyle = '#000b'; ctx.fillRect(-UIOX, 0, W, H);
  panel(X, Y, Wd, Hd, '#14142a', '#a8821f');
  txt(T2('NOVIDADES', 'WHAT\'S NEW'), X + Wd / 2, Y + 34, 24, '#f0c060', 'center', 'bold');
  const isNew = n.b > newsSeen();
  txtR(`${n.d} · ${T2('versão', 'build')} ${n.b}`, X + Wd / 2, Y + 58, 13, '#9ab', 'center');
  if (isNew) { const tw = txtW(T2('NOVO', 'NEW'), 11, 'bold') + 12; ctx.fillStyle = '#ffd34a'; ctx.fillRect(X + Wd - 24 - tw, Y + 18, tw, 18); txt(T2('NOVO', 'NEW'), X + Wd - 24 - tw / 2, Y + 31, 11, '#000', 'center', 'bold'); }
  let y = Y + 92;
  for (const [pt, en] of n.l) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(X + 26, y - 7, 5, 5); y = wrap(T2(pt, en), X + 40, y, Wd - 64, 17, 13, '#e6e6f0') + 25; }
  const by = Y + Hd - 48;
  btn(X + 20, by, 120, 32, T2('< Anteriores', '< Older'), () => { newsPg = pg + 1; SFX.click(); }, { size: 13, off: pg >= NEWS.length - 1, col: '#2a2a48' });
  btn(X + Wd - 140, by, 120, 32, T2('Recentes >', 'Newer >'), () => { newsPg = pg - 1; SFX.click(); }, { size: 13, off: pg <= 0, col: '#2a2a48' });
  btn(X + Wd / 2 - 60, by, 120, 32, 'OK', newsClose, { size: 16, col: '#2f7a4a', hot: '#3f9a5a' });
  txtR(`${pg + 1} / ${NEWS.length}`, X + Wd / 2, by - 8, 11, '#667', 'center');
}
// nas Opcoes: botao para rever as novidades (e a janela por cima)
const _dOptNews = drawOptions;
drawOptions = function () { _dOptNews.apply(this, arguments); if (!asOpen) btn(510, 448, 100, 34, T2('Novidades', 'News'), newsShow, { size: 14, col: '#2f6a8a', hot: '#3f8ab0' }); drawNews(); };
