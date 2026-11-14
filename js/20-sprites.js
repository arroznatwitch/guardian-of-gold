'use strict';
/* =====================================================================
   SPRITES (pixel art em texto) + SKINS
   ===================================================================== */
function makeSprite(rows, pal, sc, flash) {
  const c = document.createElement('canvas'); c.width = rows[0].length * sc; c.height = rows.length * sc;
  const x = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; x.fillStyle = flash ? '#fff' : pal[ch]; x.fillRect(i * sc, j * sc, sc, sc); }));
  return c;
}
const SPR = {};
function defSprite(name, rows, pal, sc) { SPR[name] = { n: makeSprite(rows, pal, sc, false), f: makeSprite(rows, pal, sc, true) }; }
// Herois: pixel art 16x16 feita a mao (PNG em art/heroes/; tools/png2sprite.py converte um PNG nestas linhas). Cada pixel e desenhado com 2x2.
const HERO_ROWS = {
  knight: ['................', '................', '.........ab.....', '........ab.b....', '.......aaa......', '......ccac......', '.....cccccc.....', '....cddddddc....', '....cdeddedc....', '....cccccccc....', '......cccc......', '....dccccccd....', '.....cccccc.....', '.....cccccc.....', '......f..f......', '......g..g......'],
  archer: ['................', '.........a.b....', '........aab.....', '.......aabb.....', '.....cccaaa.....', '....ccccccdc....', '....cccccccdc...', '....cefeefccc...', '.....geeeegcc...', '.....aaeeaa.c...', '....eaaaaaae....', '.....daaaad.....', '....daaaaaad....', '.....dddddd.....', '......e..e......', '......h..h......'],
  mage: ['................', '..........aa....', '........baa.....', '.......bbba.....', '......bbbb......', '.....bbbbbb.....', '.....cccccc.....', '.....cdccdc.....', '.....eeeeee.....', '.....bbccbb.....', '....cbbbbbbc....', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....', '.....abbbba.....', '....bbaaaabb....'],
};
const BASE_PAL = {
  knight: { a: '#ac3232', b: '#a84242', c: '#696a6a', d: '#eec39a', e: '#000000', f: '#373838', g: '#595652' },
  archer: { a: '#4b692f', b: '#ffffff', c: '#df7126', d: '#32471e', e: '#eec39a', f: '#000000', g: '#d77bba', h: '#663931' },
  mage: { a: '#925fa6', b: '#76428a', c: '#eec39a', d: '#000000', e: '#ffffff' },
};
const SKINS = { knight: [0], archer: [0], mage: [0] };   // uma unica aparencia por classe (as skins foram removidas)
for (const c in HERO_ROWS) defSprite(c + '0', HERO_ROWS[c], BASE_PAL[c], 2);

defSprite('gguard', ['......HH......', '.....GLLG.....', '....GGEEGG....', '....GEKKEG....', '....GGLLGG....', '..H.HGGGGH.H..', '.GGHNNNNNNHGG.', 'GLGNNEEEENNGLG', 'GGGNNNEENNNGGG', '.G.GGNNNNGG.G.', '.G..GNNNNG..G.', '....KGGGGK....', '...KK....KK...', '..GGG....GGG..'], { G: '#f5c542', H: '#c9951c', L: '#ffe58a', K: '#241e16', N: '#3a2e1c', E: '#ff8a1a' }, 8);
defSprite('slime', ['........','..gggg..','.gggggg.','.gkggkg.','gggggggg','gGgggGgg','GGGGGGGG'], {g:'#4caf50',G:'#2e7d32',k:'#111'}, 3);
defSprite('bat', ['p......p','pp.pp.pp','pppppppp','.ppkkpp.','..prrp..','...pp...'], {p:'#7a4aa0',k:'#111',r:'#ff4040'}, 3);
defSprite('skel', ['..wwww..','.wwwwww.','.wkwwkw.','..wwww..','...ww...','.wwwwww.','b.wwww..','b..ww...','..w..w..','.ww..ww.'], {w:'#ececec',k:'#111',b:'#8a6a3a'}, 3);
defSprite('brute', ['..oooo..','.oooooo.','.orooro.','.oowwoo.','oooooooo','oooddooo','oooooooo','a.oooo..','a.oddo..','..dd.dd.'], {o:'#6a9a3a',d:'#3d5a20',r:'#d33',w:'#fff',a:'#999'}, 4);
defSprite('wolf', ['g......g','gg.gg.gg','gggggggg','gwkggkwg','.gggggg.','..gddg..','..gddg..'].map(r => r.slice(0, 8)), {g:'#8a8a98',d:'#5a5a68',w:'#fff',k:'#e22'}, 3);
defSprite('ghost', ['..wwww..','.wwwwww.','.wkwwkw.','.wwwwww.','.wwwwww.','wwwwwwww','w.ww.ww.'], {w:'#bcd4f5',k:'#223'}, 3);
defSprite('imp', ['h......h'.slice(0, 0) + 'h.rrrr.h', '.hrrrrh.', '..reer..', '..rrrr..', 'wrrmmrrw', '.wrrrrw.', '..r..r..', '..t..t..'], {h:'#ffd9a0',r:'#e0482a',e:'#ffe14a',w:'#7a1a3a',m:'#2a0a0a',t:'#a02818'}, 3);
defSprite('beetle', ['..kk..kk..', '..gggggg..', '.gGGggGGg.', 'gGGggggGGg', 'gGlGGGGlGg', 'gGGGGGGGGg', '.gGGGGGGg.', 'k.k....k.k'], {k:'#2a2a2a',g:'#b8892a',G:'#8a6418',l:'#ffe58a'}, 3);
defSprite('shroom', ['..rrrr..', '.rrwwrr.', 'rrrrrwrr', 'rwrrrrrr', '.wwwwww.', '..wkkw..', '..wwww..', '..wwww..'], {r:'#d8503a',w:'#f0e6c8',k:'#2a1a10'}, 3);
const mir = h => h.map(r => r + [...r].reverse().join(''));
const BOSS_DEF = {
  reaper: { pal: { h:'#5a2a80', H:'#2e1048', s:'#ece8d8', e:'#ff3a3a', k:'#222', c:'#cfd6e6', w:'#6b4a22', t:'#3a1458' },
    rows: ['...hhhhhh.cccc','..hhhhhhhh.c.c','..hHssssHh..w.','..hsessesh..w.','..hskskskh..w.','..hhhssshh..w.','.hhhhhhhhhh.w.','.hhHhhhhhhhhw.','.hhHhhhhhhhhw.','hhhhHhhhhhhhw.','hhhhhhhhhhhhw.','hhHhhHhhHhhhw.','hh.hhtthh.hhw.','h...h.hh...hw.'] },
  golem: { pal: { g:'#8a95a5', G:'#5a6575', L:'#b5c0cf', e:'#40f0ff', m:'#4a8a3a' },
    rows: mir(['....ggg','...gLLL','...gGeG','...gGGG','..ggggg','.gLLggg','ggLLgGG','ggggGGm','gGggGGG','LLL.gGG','LLL.ggg','GGG.GgG','...ggg.','..GGGG.']) },
  dragon: { pal: { r:'#c8402a', R:'#7b241c', y:'#ffd400', w:'#f5deb3', o:'#ff9a2a' },
    rows: mir(['...w...','...wrrr','..rrryr','..rrrrr','..rrwrr','...rrww','RRR.rrr','RRRrroo','RRRrroo','RRRrroo','.RRrroo','..Rrrrr','...rr..','..www..']) },
  queen: { pal: { c:'#ffd24a', p:'#3f9f3a', P:'#1f6a1c', e:'#ff3030', w:'#ffffff', l:'#2a7a28' },
    rows: mir(['....c.c','....ccc','...pppp','..ppepp','...pppe','lllpppw','l.PPppp','lllPPpp','l.PPPpp','lllPPpp','l.PPppp','..lPppp','...pppp','....PPP']) },
  pharaoh: { pal: { g:'#d4a017', b:'#2a6ad0', s:'#c9a060', e:'#40e0ff', k:'#222', w:'#f5ecd0', B:'#8a8a70' },
    rows: mir(['...gggg','..gbgbg','..gbgbg','.gbgsss','.gbgses','.gbgsss','.gbgssk','.gbgbbb','wwwwggg','wwwwwgg','wwwwwww','wBwwBww','.wwwwww','.wwwww.']) },
  demon: { pal: { d:'#3b2058', D:'#18082a', h:'#ff3030', e:'#ff40ff', w:'#ffffff', r:'#7a1a4a', c:'#8a4aaa' },
    rows: mir(['h....dd','hh..ddd','.hhdddd','..hdeDd','..ddddd','..ddwdw','rr.dddd','rrrDddd','rrrDddd','rrr.ddd','.rr.ddd','..c.dDd','...dd..','..cc...']) },
};
for (const k in BOSS_DEF) defSprite(k, BOSS_DEF[k].rows, BOSS_DEF[k].pal, 5);

/* ---- 36 monstros (6 por mapa) e 6 semi-bosses ---- */
const ARCH = {   // o comportamento e os numeros de cada monstro seguem um destes tipos
  chase:  { hp: 4,  spd: 55,  r: 12, dmg: 9,  gold: 4,  ai: 'chase' },
  fast:   { hp: 3,  spd: 150, r: 11, dmg: 9,  gold: 5,  ai: 'chase' },
  fly:    { hp: 2,  spd: 125, r: 10, dmg: 6,  gold: 4,  ai: 'bat' },
  shootA: { hp: 4,  spd: 55,  r: 12, dmg: 8,  gold: 6,  ai: 'shoot', shot: 'earrow' },
  shootO: { hp: 4,  spd: 50,  r: 11, dmg: 7,  gold: 7,  ai: 'shoot', shot: 'orb' },
  tank:   { hp: 10, spd: 48,  r: 18, dmg: 18, gold: 12, ai: 'chase' },
  charge: { hp: 9,  spd: 62,  r: 14, dmg: 15, gold: 14, ai: 'charge' },
  boom:   { hp: 8,  spd: 42,  r: 12, dmg: 6,  gold: 9,  ai: 'chase', boom: true },
};
const MOB_DEF = {
  // ---- Floresta Sombria ----
  sq:     { n: 'Esquilo Raivoso', a: 'fast', o: { hp: 2, spd: 120 }, sc: 3, pal: { b: '#a0622a', B: '#6e3f18', c: '#d98a3a', w: '#f4e4c8', k: '#111' },
    rows: ['.bb....cc', 'bbbb..ccc', 'bkbbb.ccB', 'bbbbbbcc.', '.bwwbbbc.', '..bbbbB..', '.B.B..B.B'] },
  bee:    { n: 'Abelha Gigante', a: 'fly', sc: 3, pal: { w: '#d8f4ff', y: '#f5c542', k: '#222' },
    rows: ['.ww..ww.', 'wwwwwwww', '.wyykyw.', '..kyyk..', '..ykky..', '...yy...'] },
  gob:    { n: 'Goblin Arqueiro', a: 'shootA', sc: 3, pal: { g: '#5aa83a', k: '#111', w: '#fff', t: '#8a5a2a', b: '#caa060' },
    rows: ['gg....gg', '.gggggg.', '.gkggkg.', '..gwwg..', '.tttttt.', 'btttttt.', 'b.tttt..', '..t..t..'] },
  boar:   { n: 'Javali', a: 'charge', o: { hp: 6 }, sc: 3, pal: { b: '#7a4a2a', B: '#4a2a18', w: '#f4ecd0', k: '#111' },
    rows: ['...bbbbb..', 'wbbbbbbbb.', 'wkbbbbBbbb', 'bbbbbbbbbb', '.bbbbbbbb.', '.b.b..b.b.', '.B.B..B.B.'] },
  acorn:  { n: 'Bolota Explosiva', a: 'boom', o: { hp: 5 }, sc: 3, pal: { c: '#6b4a22', C: '#8a6232', o: '#c9892a', k: '#111', w: '#fff' },
    rows: ['..cccc..', '.cCCCCc.', 'cCCCCCCc', '.oooooo.', 'okooooko', 'oowwwwoo', '.oooooo.', '..oooo..'] },
  ent:    { n: 'Ent Jovem', a: 'tank', o: { hp: 7, dmg: 12 }, sc: 4, pal: { g: '#4fa844', G: '#2f7a2c', t: '#7a5230', T: '#4a2e18', y: '#ffd34a' },
    rows: ['..g.gg.g..', '.gGggggGg.', '..tttttt..', '.ttyttytt.', '.tttTTttt.', 'tttttttttt', 'T.tttttt.T', '..tTttTt..', '..TT..TT..'] },
  // ---- Cavernas Douradas ----
  cbat:   { n: 'Morcego de Cristal', a: 'fly', sc: 3, pal: { c: '#6ab8e8', C: '#3a78b8', r: '#ff4090', w: '#e8f8ff' },
    rows: ['c......c', 'cc.cc.cc', 'cCcccCcc', '.cCrrCc.', '..cwwc..', '...cc...'] },
  spider: { n: 'Aranha das Rochas', a: 'fast', sc: 3, pal: { k: '#4a3a5a', K: '#2a1a3a', r: '#ff3a3a' },
    rows: ['.k.....k.', 'k.kkkkk.k', '.kKrKrKk.', 'kkkKKKkkk', '.kkkkkkk.', 'k.k.k.k.k'] },
  miner:  { n: 'Mineiro Esqueleto', a: 'shootA', sc: 3, pal: { h: '#e8a020', l: '#fff6a0', w: '#ececec', k: '#111', p: '#8a6a3a' },
    rows: ['..hhhh..', '.hhllhh.', '.wkwwkw.', '..wwww..', '.wwwwww.', 'p.wwww..', 'p..ww...', '..w..w..'] },
  scarab: { n: 'Escaravelho Dourado', a: 'charge', sc: 3, pal: { g: '#f0c040', G: '#b88a18', k: '#2a2a2a', w: '#fff6c0' },
    rows: ['..k....k..', '..gggggg..', '.gGwggwGg.', 'gGggwwggGg', 'gGggggggGg', '.gGGggGGg.', 'k.k....k.k'] },
  rockb:  { n: 'Rocha Instável', a: 'boom', sc: 3, pal: { r: '#8a8a98', R: '#5a5a68', o: '#ff7a1a', k: '#111', y: '#ffd34a' },
    rows: ['....y...', '..rrrr..', '.rrRrrr.', 'rrkrrkrr', 'rRrooRrr', 'rrrooRrr', '.rRrrrr.', '..RRRR..'] },
  troll:  { n: 'Troll das Cavernas', a: 'tank', sc: 4, pal: { t: '#6a8a9a', T: '#44606e', y: '#ffd34a', w: '#fff' },
    rows: ['...tttt...', '..tttttt..', '..tyttyt..', '..twwwwt..', 'tttttttttt', 'tTtttttTtt', 'tT.tttt.Tt', '..TT..TT..'] },
  // ---- Castelo Maldito ----
  vamp:   { n: 'Morcego Vampiro', a: 'fly', sc: 3, pal: { p: '#8a1a2a', P: '#4a0a18', w: '#fff', y: '#ffd34a' },
    rows: ['p......p', 'pp.pp.pp', 'pPpppPpp', '.pyppyp.', '..pwwp..', '...pp...'] },
  witch:  { n: 'Bruxa', a: 'shootO', o: { col: '#9acd32' }, sc: 3, pal: { h: '#3a2a5a', H: '#2a1a40', f: '#9acd32', k: '#111', p: '#8a4fd0' },
    rows: ['...hh...', '..hhhh..', '.HHHHHH.', '..ffff..', '.fkffkf.', '..pppp..', '.pppppp.', 'pppppppp'] },
  sknight: { n: 'Cavaleiro Esqueleto', a: 'chase', o: { hp: 5, dmg: 11 }, sc: 3, pal: { w: '#ececec', s: '#8a95a5', S: '#5a6575', k: '#111', r: '#c03030' },
    rows: ['..wwww..', '.wwwwww.', '.wkwwkw.', '..wwww..', 'SSwwwwr.', 'SSwwwwr.', '.Sswwwr.', '..w..w..'] },
  garg:   { n: 'Gárgula', a: 'charge', o: { hp: 8 }, sc: 3, pal: { g: '#7a7a8a', G: '#4a4a5a', e: '#ff5050', h: '#aaaaba' },
    rows: ['h..gggg..h', 'Gg.gggg.gG', 'GGggeeggGG', 'GGggggggGG', '.Gggggggg.', '..gg..gg..', '..GG..GG..'] },
  pump:   { n: 'Abóbora Maldita', a: 'boom', sc: 3, pal: { o: '#e8801a', O: '#a04a08', g: '#3a8a2a', k: '#111', y: '#ffd34a' },
    rows: ['...gg...', '.oogoOo.', 'oOoooOoo', 'okoookoo', 'oooooooo', 'oykykyko', '.oOooOo.', '..oooo..'] },
  armor:  { n: 'Armadura Assombrada', a: 'tank', sc: 4, pal: { s: '#9aa4b8', S: '#5a6478', r: '#e03030', e: '#ff4040', k: '#222' },
    rows: ['....rr....', '..ssssss..', '..skeeks..', '..ssssss..', '.sssSSsss.', 'ssssssssss', 'S.ssssss.S', '..sS..Ss..', '..SS..SS..'] },
  // ---- Pantano Toxico ----
  toad:   { n: 'Sapo Venenoso', a: 'chase', sc: 3, pal: { g: '#5a9a3a', G: '#2e6a24', y: '#e8d040', k: '#111', w: '#e8e8b0' },
    rows: ['.yy...yy.', 'gkgggggkg', 'ggggggggg', 'gGwwwwwGg', '.gggggGg.', 'gg.....gg'] },
  leech:  { n: 'Sanguessuga', a: 'fast', sc: 3, pal: { l: '#4a2a3a', L: '#7a3a5a', m: '#ff6080' },
    rows: ['mm......', 'mLll....', '.lLLll..', '..llLLl.', '...lLLll', '....llL.'] },
  wisp:   { n: 'Fogo-Fátuo', a: 'shootO', o: { col: '#40e0b0' }, sc: 3, pal: { w: '#bffff0', c: '#40e0b0', C: '#209070', k: '#113' },
    rows: ['...cc...', '..cwwc..', '.cwwwwc.', '.cwkwkc.', '.cwwwwc.', '..cwwc..', '..C..C..', '...CC...'] },
  croc:   { n: 'Crocodilo', a: 'charge', sc: 3, pal: { g: '#4a8a3a', G: '#2e5a24', w: '#ffffff', y: '#e8d040', k: '#111' },
    rows: ['..g.g.g.g.', 'gggggggggG', 'gkggggggGG', 'wwwggggGGG', 'gggggggggg', '.G.G..G.G.'] },
  zombie: { n: 'Zombi do Lodo', a: 'tank', sc: 4, pal: { z: '#7a9a6a', Z: '#4a6a3a', c: '#6a5a3a', k: '#111', r: '#c04040' },
    rows: ['..zzzzzz..', '.zzkzzkzz.', '.zzzrrzzz.', '..zzzzzz..', 'zzccccccZz', 'zZccccccZz', 'z.cccccc.z', '..cc..cc..', '..ZZ..ZZ..'] },
  spore:  { n: 'Cogumelo Tóxico', a: 'boom', sc: 3, pal: { p: '#9a4ad0', P: '#6a2a9a', w: '#e8e0c8', k: '#111', g: '#b0ff40' },
    rows: ['..pppp..', '.pgppgp.', 'ppppPppp', 'pgpppppg', '.wwwwww.', '..wkkw..', '..wwww..', '..wwww..'] },
  // ---- Deserto Ardente ----
  scorp:  { n: 'Escorpião', a: 'charge', sc: 3, pal: { s: '#c8822a', S: '#8a5218', k: '#111', r: '#e04040' },
    rows: ['....ssss..', '...s....s.', 'ss.s.ssss.', 'ssssssSsSr', '.sksksSss.', '..S.S.S.S.'] },
  mummy:  { n: 'Múmia', a: 'tank', sc: 4, pal: { w: '#e8dcb8', W: '#b8a878', e: '#ff4040', k: '#2a2010' },
    rows: ['..wwwwww..', '.wWwwwwWw.', '.wwekkewW.', '..wWwwWw..', 'wwwwWwwwww', 'wWwwwwwWww', 'w.wWwwWw.w', '..wwWwww..', '..WW..WW..'] },
  snake:  { n: 'Serpente da Areia', a: 'fast', sc: 3, pal: { s: '#d8b050', S: '#a07a20', r: '#e04040', k: '#111' },
    rows: ['.ssss....', 'skssS....', 'rssSss...', '..sSSss..', '...sssSs.', '.....sSss', '....sss..'] },
  vulture: { n: 'Abutre', a: 'fly', sc: 3, pal: { b: '#5a3a2a', B: '#3a2218', r: '#d04040', y: '#e8c040' },
    rows: ['B......B', 'BB.bb.BB', 'BbbbbbbB', '.bbrrbb.', '..byyb..', '...bb...'] },
  djinn:  { n: 'Mago do Deserto', a: 'shootO', o: { col: '#ffd34a' }, sc: 3, pal: { t: '#2a6ad0', T: '#1a3a90', f: '#d8a070', k: '#111', y: '#ffd34a' },
    rows: ['...yy...', '..tttt..', '.tTttTt.', '..ffff..', '.fkffkf.', '..tttt..', '.tttttt.', 'tTtttTtt'] },
  cactus: { n: 'Cacto Explosivo', a: 'boom', sc: 3, pal: { g: '#3f8f45', G: '#2a6a30', r: '#ff5a5a', k: '#111', y: '#ffd34a' },
    rows: ['.r.gg.r.', 'gg.gg.gg', 'gg.gg.gg', 'gggkgkgg', 'GgggggGg', '.gggyggG.'.slice(0, 8), '..gggg..', '..GGGG..'] },
  // ---- Abismo Final (6 proprios; aqui aparecem os 36) ----
  voidimp: { n: 'Diabrete do Vazio', a: 'fly', sc: 3, pal: { p: '#8a3ad0', P: '#4a1a80', e: '#ff40ff', w: '#e8c0ff' },
    rows: ['p......p', 'pp.pp.pp', 'pPpppPpp', '.peppep.', '..pwwp..', '...PP...'] },
  hellhound: { n: 'Cão Infernal', a: 'fast', sc: 3, pal: { d: '#3a1a1a', r: '#e0402a', o: '#ff9a2a', k: '#111' },
    rows: ['d......d', 'dd.dd.dd', 'dddddddd', 'drkddkrd', '.dddddd.', '..dooood.'.slice(0, 8), '..d..d..'] },
  eye:    { n: 'Olho do Abismo', a: 'shootO', o: { col: '#ff40ff' }, sc: 3, pal: { w: '#f4e8ff', p: '#8a3ad0', m: '#ff40ff', k: '#111', P: '#4a1a80' },
    rows: ['..PPPP..', '.PwwwwP.', 'PwwppwwP', 'PwpmkpwP', 'PwwppwwP', '.PwwwwP.', '..PPPP..', '.P.PP.P.'] },
  shgolem: { n: 'Golem Sombrio', a: 'tank', sc: 4, pal: { g: '#3a2a5a', G: '#1a1030', e: '#ff40ff', c: '#8a4aaa' },
    rows: ['..gggggg..', '.gGggggGg.', '.ggeggegg.', '..gGGGGg..', 'ggggggcggg', 'gGggggcGgg', 'g.gggggg.g', '..GG..GG..', '..GG..GG..'] },
  voidk:  { n: 'Cavaleiro do Vazio', a: 'charge', sc: 3, pal: { v: '#2a1a4a', V: '#14082a', e: '#ff40ff', s: '#8a6ac8' },
    rows: ['....ss....', '..vvvvvv..', '..vVeeVv..', '..vvvvvv..', '.vvvVVvvv.', 'vvvvvvvvvv', 'V.vvvvvv.V', '..V..V....'.slice(0, 10)] },
  crystal: { n: 'Cristal Sombrio', a: 'boom', sc: 3, pal: { c: '#a050e0', C: '#6a2aa0', w: '#f0d0ff', k: '#111' },
    rows: ['...cc...', '..cwcc..', '.cCwccC.', 'ccCcckcc', 'cCcckcCc', '.cCccCc.', '..cCCc..', '...cc...'] },
};
const MOB_BY_MAP = [
  ['sq', 'bee', 'gob', 'boar', 'acorn', 'ent'], ['cbat', 'spider', 'miner', 'scarab', 'rockb', 'troll'], ['vamp', 'witch', 'sknight', 'garg', 'pump', 'armor'],
  ['toad', 'leech', 'wisp', 'croc', 'zombie', 'spore'], ['scorp', 'mummy', 'snake', 'vulture', 'djinn', 'cactus'], ['voidimp', 'hellhound', 'eye', 'shgolem', 'voidk', 'crystal'],
];
const MOB_EN = {};
for (const id in MOB_DEF) { const d = MOB_DEF[id]; defSprite(id, d.rows, d.pal, d.sc); MOB_EN[id] = Object.assign({ spr: id }, ARCH[d.a], d.o || {}); }
// cada mapa tem os seus 6 monstros (os fracos aparecem mais vezes); no Abismo aparecem todos
const MAP_TYPES = MOB_BY_MAP.map((ids, m) => {
  const w = { fly: 2, fast: 2, chase: 2, shootA: 1, shootO: 1, tank: 1, charge: 1, boom: 1 }, out = [];
  ids.forEach(id => { for (let i = 0; i < w[MOB_DEF[id].a]; i++) out.push(id); }); return out;
});
MAP_TYPES[5] = [].concat(...MOB_BY_MAP);
// semi-boss de cada mapa (onda 5, 15, 25...): desenho proprio, menos vida e golpes mais simples que o boss
const SEMI_DEF = {
  alpha: { pal: { g: '#9a9aa8', G: '#5a5a68', w: '#ffffff', e: '#ff3030', k: '#222' },
    rows: mir(['gg.....', 'ggg....', 'gGggggg', 'ggeeggg', 'ggggwgg', '.gggkkk', '..ggwkw', '.gggggg', 'GggGggg', 'GGggGgg', 'GgggGgg', 'GG.gGgg', '.GG.GGg', '.kk..kk']) },
  spiderq: { pal: { k: '#2a1a3a', K: '#4a3a6a', r: '#ff3040', p: '#b040ff', w: '#dddddd' },
    rows: mir(['....kkk', '...kKKK', 'k..kKKK', '.k.KrKr', '..kKKKK', 'kk.KKrK', '.kkKKKK', '..kKKpK', 'k.kKKpK', '.k.KKKK', 'k..kKKK', '.k..kKK', 'k....kK', '......k']) },
  bknight: { pal: { s: '#3c3c4a', S: '#1c1c28', e: '#ff4040', r: '#c03030', g: '#8a8a9a', k: '#111' },
    rows: mir(['....rrr', '...ssss', '..sssss', '..sSeek', '..sSssk', '...sSSS', 'gg.ssss', 'gssSsss', 'gssSsss', 'gg.sSss', '..sSsss', '..sssSs', '..SSsss', '..SS.SS']) },
  toadk:  { pal: { g: '#5a9a3a', G: '#2e6a24', y: '#e8d040', k: '#111', w: '#e8e8b0', p: '#b0ff40' },
    rows: mir(['.yy....', 'gkgg...', 'gggggg.', 'gggggg.', 'GwwwwwG', 'GGGGGGG', '.gggggg', 'gggpggg', 'gggggpg', 'GggggGg', 'GGggggG', 'GG.gggG', 'gg..GGG', 'gg....G']) },
  scorpk: { pal: { s: '#c8822a', S: '#8a5218', k: '#111', r: '#e04040', y: '#ffd34a' },
    rows: mir(['....sss', '...s..s', '..s...s', '.s...ss', 'ss..sss', 'ss.sskk', 's.ssSss', '..ssSss', '.sssSss', '.ssSsss', 'ss.Sss.', 's.s.s.s', 'S..S..S', '.......']) },
  archd:  { pal: { d: '#3b2058', D: '#18082a', h: '#ff3030', e: '#ff40ff', w: '#ffffff', c: '#8a4aaa', r: '#7a1a4a' },
    rows: mir(['h....hh', 'hh..hdd', '.hhhddd', '..hddee', '..hdddD', '..ddwdw', 'rr.dddd', 'rrrDDdd', 'rrrDddd', 'rrrcddd', '.rrcddd', '..ccdDd', '...cdd.', '..cc...']) },
};
for (const k in SEMI_DEF) defSprite(k, SEMI_DEF[k].rows, SEMI_DEF[k].pal, 5);
const SEMI = [
  { name: 'Lobo Alfa', pal: 'alpha', r: 28, spd: 80, ring: 8, charge: 420, col: '#ccd', pattern: ['charge', 'spread', 'ring'] },
  { name: 'Rainha Aranha', pal: 'spiderq', r: 28, spd: 58, ring: 10, charge: 380, col: '#b4f', pattern: ['spread', 'summon', 'ring'] },
  { name: 'Cavaleiro Negro', pal: 'bknight', r: 29, spd: 62, ring: 10, charge: 440, col: '#f55', pattern: ['slam', 'charge', 'cone'] },
  { name: 'Sapo Colossal', pal: 'toadk', r: 30, spd: 55, ring: 10, charge: 400, col: '#bf4', pattern: ['slam', 'spread', 'charge'] },
  { name: 'Escorpião Rei', pal: 'scorpk', r: 29, spd: 68, ring: 12, charge: 460, col: '#fb4', pattern: ['charge', 'slam', 'cone'] },
  { name: 'Arquidemónio', pal: 'archd', r: 30, spd: 66, ring: 14, charge: 480, col: '#f4f', pattern: ['blink', 'spiral', 'ring'] },
];


/* ---------- armas em pixel-art (apontam para a direita; usadas na mao e nos icones) ---------- */
const WSHAPES = {
  sword:   { ax: 3, rows: ['....g.........','....g.bbbbbbb.','phhhgbbbbbbbbb','....g.bbbbbbb.','....g.........'] },
  axe:     { ax: 3, rows: ['..........a...','.........aaa..','........aaaaa.','hhhhhhhhaaaaaA','........aaaaa.','.........aaa..','..........a...'] },
  spear:   { ax: 4, rows: ['..........tt..','hhhhhhhhhttttt','..........tt..'] },
  hammer:  { ax: 3, rows: ['.........mmmmm','.........mMMMm','ssssssssssMMMm','ssssssssssMMMm','.........mMMMm','.........mmmmm'] },
  dagger:  { ax: 3, rows: ['....g.........','phhhg.rrrrrrr.','pphhgrrrrrrrrr','phhhg.rrrrrrr.','....g.........'] },
  bow:     { ax: 4, rows: ['..ww....','..sww...','..s.ww..','..s..w..','..s..ww.','..s...w.','..s..ww.','..s..w..','..s.ww..','..sww...','..ww....'] },
  cross:   { ax: 3, rows: ['........w...','........ww..','.........w..','hhhhhhhhhbbb','.........w..','........ww..','........w...'] },
  staff:   { ax: 3, rows: ['..........ooo.','.........oohoo','sssssssssooooo','.........ooooo','..........ooo.'] },
};
/* cabecas dos cajados desenhadas por codigo (uma forma por cajado e por nivel de estrela) */
function mkStaffHead(kind, tier) {
  const t = tier || 1, big = t - 1, W = 16 + big * 2, H = 9 + big * 2, R = 2.6 + big * .85, cx = W - 5 - big, cy = (H - 1) / 2;
  const sh = t === 1 ? 's' : 'H', mn = t === 1 ? 'o' : 'O', hi = t === 1 ? 'h' : 'L', g = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const disc = (px, py, r, c) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - px) ** 2 + (y - py) ** 2 <= r * r) g[y][x] = c; };
  for (let x = 0; x <= cx - R + 1; x++) put(x, cy, sh);
  if (kind === 'fire') {            // chama: gota com ponta e linguas de fogo
    disc(cx - 1, cy + .5, R, mn); const L = 2 + big;
    for (let i = 1; i <= L; i++) { const half = R * (1 - i / (L + 1.5)); for (let y = Math.ceil(cy - half); y <= Math.floor(cy + half); y++) put(cx - 1 + R + i - .5, y - (i >= L ? 1 : 0), mn); }
    put(cx - 3, cy - R - 1, mn); put(cx - 1, cy - R - 2 - big * .5, mn); put(cx + 1, cy - R - 1, mn);
    disc(cx - 1.5, cy + .5, R * .5, hi);
  } else if (kind === 'ice') {      // cristal com duas lascas
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(x - cx) / (R + 2) + Math.abs(y - cy) / (R + .4) <= 1) g[y][x] = mn;
    const sx = cx - 2, k = 1.4 + big * .5;
    for (const dy of [-1, 1]) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(x - sx) / (k + .6) + Math.abs(y - (cy + dy * (R + 1))) / (k + 1) <= 1) g[y][x] = mn;
    for (let x = cx - R + 1; x <= cx + R; x++) put(x, cy, hi); put(cx - 1, cy - 1, hi);
  } else if (kind === 'bolt') {     // estrela de faiscas
    disc(cx, cy, R * .62, mn); const A = Math.floor(R + 2);
    for (let k = 1; k <= A; k++) { put(cx + k, cy, mn); put(cx - k, cy, mn); put(cx, cy + k, mn); put(cx, cy - k, mn); }
    for (let k = 1; k <= Math.floor(R); k++) { put(cx + k, cy + k, mn); put(cx - k, cy + k, mn); put(cx + k, cy - k, mn); put(cx - k, cy - k, mn); }
    disc(cx, cy, R * .3, hi);
  } else if (kind === 'arcane') {   // anel arcano com nucleo e orbes
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= R + .3 && d >= R - 1) g[y][x] = mn; }
    disc(cx, cy, R * .42, hi); put(cx + R + 1, cy - R, hi); put(cx - R, cy + R + 1, hi); put(cx + R + 1, cy + 1, mn);
  } else {                          // sombrio: lua crescente com olho
    disc(cx, cy, R, mn); disc(cx + R * .6, cy, R * .85, '.'); disc(cx + R * .55, cy, R * .35, hi);
  }
  if (t >= 2) {
    const x0 = Math.round(cx - R - 1 - (kind === 'fire' ? 1 : 0));
    for (let dy = -1 - big; dy <= 1 + big; dy++) put(x0, cy + dy, 'G'); put(x0 - 1, cy, 'G'); put(x0 + 1, cy - 1 - big, 'G'); put(x0 + 1, cy + 1 + big, 'G'); put(cx, cy, 'J');
  }
  if (t === 3) { for (const dy of [-1, 1]) { const yy = cy + dy * (R + 2.2); put(cx - 1, yy, 'G'); put(cx + 1, yy, 'G'); put(cx, yy + dy, 'G'); } put(cx - 1, cy, 'J'); put(cx + 1, cy, 'J'); }
  return g.map(r => r.join(''));
}
for (const k of ['fire', 'ice', 'bolt', 'arcane', 'dark']) WSHAPES['staff_' + k] = { ax: 3, rows: mkStaffHead(k, 1) };
/* arcos com formas proprias: triplo (3 flechas em leque), ignea (chamas nas pontas) e sombrio (cornos e olho) */
const padRows = rows => { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.')); };
WSHAPES.bow_triple = { ax: 4, rows: padRows(['..ww.........', '..sww.....t..', '..s.ww...q...', '..s..w..q....', '..s..w.q.....', '..s..wqqqqqqt', '..s..w.q.....', '..s..w..q....', '..s.ww...q...', '..sww.....t..', '..ww.........']) };
WSHAPES.bow_fire = { ax: 4, rows: padRows(['.ff.......', '.fofw.....', '..sfow....', '..s.fww...', '..s..fw...', '..s..wh...', '..s..woo..', '..s..wh...', '..s..fw...', '..s.fww...', '..sfow....', '.fofw.....', '.ff.......']) };
WSHAPES.bow_dark = { ax: 4, rows: padRows(['.d..d.....', '.dd.dd....', '.dsww.d...', '..s.wwd...', '..s..wwd..', '..s..wwe..', '..s...wee.', '..s..wwe..', '..s..wwd..', '..s.wwd...', '.dsww.d...', '.dd.dd....', '.d..d.....']) };
const WDEF = {
  k_sword:  { shape: 'sword',  pal: { p:'#8a6a2a', h:'#6b4a22', g:'#e8c060', b:'#d0d8e8' } },
  k_axe:    { shape: 'axe',    pal: { h:'#6b4a22', a:'#9aa4b8', A:'#e0e6f4' } },
  k_spear:  { shape: 'spear',  pal: { h:'#6b4a22', t:'#e0e6f4' } },
  k_hammer: { shape: 'hammer', pal: { s:'#6b4a22', m:'#5a6378', M:'#9aa4b8' } },
  k_blade:  { shape: 'dagger', pal: { p:'#802030', h:'#401018', g:'#a02030', r:'#ff4060' } },
  a_bow:    { shape: 'bow',    pal: { w:'#a06a30', s:'#e8e8e8' } },
  a_triple: { shape: 'bow_triple', pal: { w:'#3fa050', s:'#e8e8e8', q:'#8a6a3a', t:'#f0f0f0' } },
  a_cross:  { shape: 'cross',  pal: { h:'#6b4a22', w:'#9aa4b8', b:'#e8e8e8' } },
  a_fire:   { shape: 'bow_fire', pal: { w:'#e0602a', s:'#ffd080', f:'#ff5a1a', o:'#ffb030', h:'#ffe9a0' } },
  a_dark:   { shape: 'bow_dark', pal: { w:'#5a2a8a', s:'#d0a0ff', d:'#2a1040', e:'#ff40c0' } },
  m_fire:   { shape: 'staff_fire',  pal: { s:'#6b4a22', o:'#ff7a1a', h:'#ffe066' } },
  m_ice:    { shape: 'staff_ice',  pal: { s:'#6b4a22', o:'#6ad0ff', h:'#ffffff' } },
  m_bolt:   { shape: 'staff_bolt',  pal: { s:'#6b4a22', o:'#ffe14a', h:'#ffffff' } },
  m_arcane: { shape: 'staff_arcane',  pal: { s:'#6b4a22', o:'#b06aff', h:'#f0d8ff' } },
  m_dark:   { shape: 'staff_dark',  pal: { s:'#3a2a2a', o:'#5a1a6a', h:'#ff40c0' } },
};
const WSPR = {};
for (const id in WDEF) { const sh = WSHAPES[WDEF[id].shape]; WSPR[id] = { img: makeSprite(sh.rows, WDEF[id].pal, 1, false), ax: sh.ax, w: sh.rows[0].length, h: sh.rows.length }; }
/* ---------- itens comuns: pixel art 16x16 feita a mao (PNGs em art/items/common/; tools/png2sprite.py converte um PNG nestas linhas) ---------- */
const COMMON_ART = {
  head: { rows: ['......aabbb.....', '...baacccccbb...', '.baccccccccccbb.', '.bccccccdcccccb.', 'bccccdcccccccccb', 'ccccccdccccccccc', 'cccccccccccccccc', 'dcc..ecccce..ccf', 'dcc...ecce...ccf', 'dcc....ee....ccf', 'dcc..........ccf', 'ecc..........cce', 'eccc........ccce', '.eccc......ccce.', '..eccc....ccce..', '...eee....eee...'], pal: { a: '#a0642a', b: '#643a10', c: '#642f10', d: '#783e16', e: '#642110', f: '#4c240d' } },
  chest: { rows: ['................', '................', '..aa........bb..', '.bacb......bccb.', 'bccccbb..bbccccb', 'dccccccbbccccccd', 'dddccccccccccddd', '...eccccccccf...', '...eccccccccf...', '...eccccecccf...', '...cccecccccf...', '...cccceccccf...', '...cccccccccf...', '...dccccccccd...', '....ddccccdd....', '......dddd......'], pal: { a: '#a0642a', b: '#643a10', c: '#642f10', d: '#642110', e: '#783e16', f: '#4c240d' } },
  boots: { rows: ['......aaaabbb...', '.....acccccccb..', '....acccccccccb.', '....acccccccccb.', '....bdddddddddb.', '....bcccccccccd.', '....bcccccccccd.', '.....cccecccccd.', '.....cecccccccd.', '...accccccccccd.', '.accccccccccccd.', 'acccdccccccccfd.', 'ccccdccecccfff..', 'ccccccccfff.....', '.cccccff........', '..ffff..........'], pal: { a: '#a0642a', b: '#643a10', c: '#642f10', d: '#4c240d', e: '#783e16', f: '#642110' } },
  amulet: { rows: ['................', '...abbbbaaabba..', '..a...........a.', '.a............a.', '.b............b.', '.b...........b..', '.b...........b..', '.b.........bb...', '..a.......a.....', '...acdedca......', '....d.f.c.......', '...e.fee.c......', '...c.ecc.c......', '....c.c.g.......', '.....gcg........', '................'], pal: { a: '#737070', b: '#9b9999', c: '#4c240d', d: '#783e16', e: '#a0642a', f: '#a0742a', g: '#642110' } },
  k_sword: { rows: ['..............aa', '.............aab', '............aab.', '...........aab..', '..........aab...', '.........aab....', '........aab.....', '.......aab......', '...cc.aab.......', '....ccab........', '....dee.........', '...fdgee........', '..fhg..e........', '.dhg............', 'egg.............', 'ce..............'], pal: { a: '#9b9999', b: '#737070', c: '#d0ca6f', d: '#643a10', e: '#d0b06f', f: '#a0642a', g: '#642110', h: '#4c240d' } },
  a_bow: { rows: ['................', '..a.............', '.abbbbbc........', '.bdcccbbbbc.....', '...d..ccbbbc....', '....d....cbbc...', '.....d...aabc...', '......d..a.bbc..', '.......d...cbc..', '........d...bc..', '.........d..bc..', '..........d.ba..', '...........dac..', '............b...', '................', '................'], pal: { a: '#d0b06f', b: '#643a10', c: '#4c240d', d: '#ffffff' } },
  m_fire: { rows: ['................', '..........aa....', '.........bbbba..', '.............bc.', '..........de.bc.', '..........fg.bc.', '.........bf.bc..', '........hbbbc...', '.......hbc......', '......abbc......', '.....abhc.......', '....abbc........', '...hbbc.........', '..hbbc..........', '.ijbc...........', '................'], pal: { a: '#a0642a', b: '#4c240d', c: '#642110', d: '#ffffff', e: '#e6e50a', f: '#f0a318', g: '#d22f12', h: '#643a10', i: '#d0ca6f', j: '#d0b06f' } },
};
Object.assign(COMMON_ART, { m_ice: { rows: ['................', '..........aa....', '.........bbbba..', '...........c.bd.', '..........ecfbd.', '..........ffgbd.', '.........b.gbd..', '........hbbbd...', '.......hbd......', '......abbd......', '.....abhd.......', '....abbd........', '...hbbd.........', '..hbbd..........', '.ijbd...........', '................'], pal: { a: '#a0642a', b: '#4c240d', c: '#bfefff', d: '#642110', e: '#ffffff', f: '#5ec8ff', g: '#2a7fd0', h: '#643a10', i: '#d0ca6f', j: '#d0b06f' } }, m_bolt: { rows: ['................', '..........aa....', '.........bbbba..', '..........cdcbe.', '.........dfgdbe.', '.........cgfcbe.', '.........bdcbe..', '........hbbbe...', '.......hbe......', '......abbe......', '.....abhe.......', '....abbe........', '...hbbe.........', '..hbbe..........', '.ijbe...........', '................'], pal: { a: '#9b9999', b: '#737070', c: '#6adfff', d: '#bfefff', e: '#5a5858', f: '#ffe14a', g: '#ffffff', h: '#868383', i: '#c9c7c7', j: '#b3b1b1' } }, m_arcane: { rows: ['................', '..........aa....', '.........bbbba..', '............cbd.', '..........ce.bd.', '..........ef.bd.', '...e.....bf.bd..', '...ce...gbbbd...', '....eh.gbd......', '.....fabbd......', '.....abgd.......', '....abbd........', '...gbbd.........', '..gbbd..........', '.ijbd...........', '................'], pal: { a: '#a0642a', b: '#4c240d', c: '#e8ffb0', d: '#642110', e: '#9be32f', f: '#3f8a14', g: '#643a10', h: '#5aa820', i: '#d0ca6f', j: '#d0b06f' } }, m_dark: { rows: ['................', '..........aa....', '.........bbbba..', '.........cd.dbe.', '..........fghbe.', '.........ihgjbe.', '.........b.jbe..', '........kbbbe...', '.......kbe......', '......abbe......', '.....abke.......', '....abbe........', '...kbbe.........', '..kbbe..........', '.lmbe...........', '................'], pal: { a: '#a02a4a', b: '#33122a', c: '#ffd0d8', d: '#a0102e', e: '#451838', f: '#ff9aa8', g: '#e0204a', h: '#ff4a6a', i: '#ffffff', j: '#8a0f2a', k: '#5a1a34', l: '#e8d8a0', m: '#d0b06f' } } });   // cajados novos desenhados a mao (art/items/staffs)
Object.assign(COMMON_ART, { k_axe: { rows: ['..............ab', '............aabc', '...........aabc.', '..........aabcc.', '.........aabcc..', '........aabcc...', '.......aabcc....', '......aabcc.....', '..d..aabcc......', '..ddaabcc.......', '...ddbcc........', '...eddc.........', '..efghh.........', 'ddfg..hh........', '.hh.............', '..h.............'], pal: { a: '#d0d2da', b: '#9b9999', c: '#737070', d: '#d0ca6f', e: '#a0642a', f: '#643a10', g: '#642110', h: '#d0b06f' } }, k_spear: { rows: ['................', '..........aaa...', '.........aab....', '........aab...a.', '.......aab...ba.', '......aab...baa.', '.....aab...baa..', '....aab...baa...', '...cccc..baa....', '....c.cdbaa.....', '....e..daa......', '...efgdda.......', '..ehg..d........', '.fhg............', 'dgg.............', 'cd..............'], pal: { a: '#9b9999', b: '#737070', c: '#d0ca6f', d: '#d0b06f', e: '#a0642a', f: '#643a10', g: '#642110', h: '#4c240d' } }, k_hammer: { rows: ['..............aa', '.............aab', '............aab.', '...........aab..', '..........aab...', '.........aab....', '........aab.....', '.......aab......', '...cc.aab.......', '....ccab........', '....dee.........', '...fdgee........', '..fhg..e........', '.dhg............', 'egg.............', 'ce..............'], pal: { a: '#d0ca6f', b: '#d0b06f', c: '#2a2a29', d: '#643a10', e: '#454544', f: '#a0642a', g: '#642110', h: '#4c240d' } }, k_blade: { rows: ['..............ab', '............aabc', '...........aabc.', '..........aabcc.', '.........aabcc..', '........aabcc...', '.......aabcc....', '......aabcc.....', '..d..aabcc......', '..ddaabcc.......', '...ddbcc........', '...eddc.........', '..efghh.........', 'ddfg..hh........', '.hh.............', '..h.............'], pal: { a: '#ff9aa8', b: '#e0204a', c: '#8a0f2a', d: '#e8d8a0', e: '#a02a4a', f: '#5a1a34', g: '#33122a', h: '#d0b06f' } } });   // espadas novas desenhadas a mao (art/items/swords)
Object.assign(COMMON_ART, { a_triple: { rows: ['.aa.............', '.bac............', '..daa...........', '...baaa.........', '....b.aaa.......', '.....b..ee......', '......b..fa.....', '.......b..ea....', '........b..ac...', '.........b.da...', '..........b.aa..', '...........b.ac.', '............bdc.', '.............da.', '..............ac', '..............da'], pal: { a: '#c08a40', b: '#ffffff', c: '#6a3c18', d: '#f0cc88', e: '#2a1408', f: '#e0b030' } }, a_cross: { rows: ['..............ab', '..c...........bb', '.dcecccc.....f..', '.dgddddcccc.f...', '...g..ddddcf....', '....g....dfcc...', '.....g...hhdc...', '......gijd.dcc..', '......ijk..ddc..', '.....ijlg...dc..', '....ijl..g..dc..', '...ijk....g.dc..', '..ijk......gdc..', '.ijk........d...', 'kjk.............', 'kk..............'], pal: { a: '#9b9999', b: '#ffffff', c: '#2a2a38', d: '#9a9ab0', e: '#5a5a70', f: '#e8e8e8', g: '#fff0c0', h: '#e0b030', i: '#a0642a', j: '#6a3c18', k: '#3a200c', l: '#2a1408' } }, a_fire: { rows: ['..............ab', '..c...........bb', '.dcecccc.....f..', '.dgddddcccc.f...', '...g..ddddcf....', '....g....dfcc...', '.....g...hhdc...', '......gijd.dcc..', '....klijm..ddc..', '...bbijng...dc..', '..klijn..g..dc..', '..oijm....g.dc..', 'foijm......gdc..', 'oijm........d...', 'mjm.............', 'mm..............'], pal: { a: '#9b9999', b: '#ffffff', c: '#7a5a10', d: '#ffe27a', e: '#d0a030', f: '#e8e8e8', g: '#fff0c0', h: '#e0b030', i: '#a0642a', j: '#6a3c18', k: '#8a6a20', l: '#b08820', m: '#3a200c', n: '#2a1408', o: '#c9c7c7' } }, a_dark: { rows: ['............a...', '...........aabb.', '...........acdb.', '..........acdeff', '.........gcdeff.', '.....h..acief...', '.....j.gcdeg....', '.....kacief.....', '.....kcdeg......', '.....lmef.......', '....lmn.........', '..klmn..........', '.klmn...........', '.lmnk...........', '..nk............', '................'], pal: { a: '#d8d8d8', b: '#2a2828', c: '#b0aeae', d: '#8a8888', e: '#5a5858', f: '#3a3838', g: '#b08820', h: '#ffe27a', i: '#e0b030', j: '#ffb020', k: '#6a3c18', l: '#c08a40', m: '#8a5a2a', n: '#4a2a10' } } });   // arqueiro: Arco Longo, Besta, Besta de Repeticao, Canhao de Mao
const C16 = {}; for (const k in COMMON_ART) C16[k] = makeSprite(COMMON_ART[k].rows, COMMON_ART[k].pal, 1, false);
/* armas desenhadas na diagonal (ponta para cima-direita). gx,gy = pixel onde a mao agarra; w,h,ax = medidas (em pixeis do desenho) para os brilhos das estrelas; gd = distancia ate ao brilho */
const DIAG_W = {
  k_sword: { gx: 3.5, gy: 12.5, w: 17, h: 6, ax: 0, gd: 10 },
  a_bow:   { gx: 10.5, gy: 6.5, w: 8, h: 14, ax: 4, gd: 0 },
  m_fire:  { gx: 6.5, gy: 10.5, w: 12, h: 8, ax: 2, gd: 6.7 },
  m_ice:   { gx: 6.5, gy: 10.5, w: 12, h: 8, ax: 2, gd: 6.7 },
  m_bolt:  { gx: 6.5, gy: 10.5, w: 12, h: 8, ax: 2, gd: 6.7 },
  m_arcane: { gx: 6.5, gy: 10.5, w: 12, h: 8, ax: 2, gd: 6.7 },
  m_dark:  { gx: 6.5, gy: 10.5, w: 12, h: 8, ax: 2, gd: 6.7 },
  k_axe:    { gx: 3.5, gy: 12.5, w: 17, h: 6, ax: 0, gd: 10 },
  k_spear:  { gx: 3.5, gy: 12.5, w: 17, h: 6, ax: 0, gd: 10 },
  k_hammer: { gx: 3.5, gy: 12.5, w: 17, h: 6, ax: 0, gd: 10 },
  k_blade:  { gx: 3.5, gy: 12.5, w: 17, h: 6, ax: 0, gd: 10 },
  a_triple: { gx: 9.5, gy: 6.5, w: 8, h: 16, ax: 4, gd: 0 },
  a_cross:  { gx: 7.5, gy: 8.5, w: 12, h: 12, ax: 4, gd: 4 },
  a_fire:   { gx: 7.5, gy: 8.5, w: 12, h: 12, ax: 4, gd: 4 },
  a_dark:   { gx: 6.5, gy: 9.5, w: 14, h: 10, ax: 4, gd: 6 },
};
for (const id in DIAG_W) WSPR[id] = Object.assign({ img: C16[id], diag: true }, DIAG_W[id]);
/* versoes melhoradas das armas: 2 estrelas (contorno escuro, brilho, gema) e 3 estrelas (contorno dourado, cores radiantes, gema dupla, faiscas) */
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const mixC = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const WTIER = {};
/* desenhos novos por forma e por nivel (metade de cima, a ultima linha e a do meio; a de baixo e o espelho com sombra) */
const TIER_ART = {
  sword: { 2: { ax: 3, h: ['....G.............', '....GG............', '..H.GGLLLLLLLLM...', 'pHHHJGMMMMMMMMMMMW'] },
           3: { ax: 3, h: ['..G.G.............', '..GGG.............', '...GGMLLLLLLLLM....', '..H.GMLLLLLLLLLLM..', 'pHHHJGMMMMMMMMMMMMMW'] } },
  axe: { 2: { ax: 3, h: ['..........MM.....', '........MMMMM....', '......GMMLLLMMM..', '....HGGMLLLLLMMM.', 'HHHHHJGGMMMMMMMMM'] },
           3: { ax: 3, h: ['..........M..M.....', '........MMMMMMM....', '......GMMLLLLLMMM..', '....GGGMLLLLLLLMMM.', '..H.GJGMMLLLLLLMMMM', 'HHHHHJGGGMMMMMMMMMW'] } },
  spear: { 2: { ax: 4, h: ['........MM.........', '.......GMLLMM.......', 'HHHHHHHGJMMMMMMMMMMW'] },
           3: { ax: 4, h: ['......J.............', '......GMM...........', '.....GGMLLMM........', 'HHHHHHJGMMMMMMMMMMMMW'] } },
  hammer: { 2: { ax: 3, h: ['.......GGGGGGGGG.', '.......GMLLLLLMMG', '.......GMLJJLLMMG', '..H....GMMMMMMMMG', 'HHHHHHHHGGGGGGGGG'] },
            3: { ax: 3, h: ['......G.G.G.G.G.G.', '.......GGGGGGGGGG.', '.......GMLLLLLLMMG', '.......GMLJJJJLMMG', '..H....GMMMMMMMMMG', 'HHHHHHHHGJGGGGGGJG'] } },
  dagger: { 2: { ax: 3, h: ['...G..........', '..HGGMLLLLLM..', 'pHHJGMMMMMMMMM'] },
           3: { ax: 3, h: ['..G..G.........', '..GGGG.MM......', '..HGGMLLLLMM...', 'pHHJGMMMMMMMMMW'] } },
  bow: { 2: { ax: 3, h: ['..SMM.....', '..SGMM....', '..S.MM....', '..S..MM...', '..S..GM...', '..S...MM..', '..SJ..MM..'] },
           3: { ax: 3, h: ['..SGMM......', '..SGGMM.....', '..S.GMMM....', '..S..GMMM...', '..S..LGMMM..', '..S...GMMM..', '..SJ..GMMMM.', '.WSJJ..MMMMM'] } },
  cross: { 2: { ax: 3, h: ['........M.......', '.......MM.......', '......MMG.......', '......MG........', 'HHHHHHJGLLLLLLLW'] },
           3: { ax: 3, h: ['..........M.......', '.........MM.......', '........MMG.......', '.......MMG........', '..H...MMGG.LLLL...', 'HHHHHHJJGGLLLLLLLW'] } },
  staff: { 2: { ax: 3, h: ['..........GOOG..', '.........GOLLOG.', '.........OLJJLOO', 'HHHHHHHHGOOJJOOO'] },
           3: { ax: 3, h: ['..........G..G..G.', '..........GOOOOOG..', '.........GOLLLLLOG.', '.........OLJJJJJLOO', 'HHHHHHHHJGOOJWJOOOG'] } },
};
for (const k of ['fire', 'ice', 'bolt', 'arcane', 'dark']) TIER_ART['staff_' + k] = { 2: { ax: 3, rows: mkStaffHead(k, 2) }, 3: { ax: 3, rows: mkStaffHead(k, 3) } };
for (const k of ['bow_triple', 'bow_fire', 'bow_dark']) {
  const base = WSHAPES[k].rows, mid = base.length >> 1, mk = t => base.map((r, j) => { let q = r.replace(/w/g, 'M').replace(/s/g, 'S'); if (j === mid) q = q.replace('M', 'J'); if (t === 3 && (j === 0 || j === base.length - 1)) q = q.replace('S', 'G'); if (t === 3 && (j === mid - 1 || j === mid + 1)) q = q.replace('S', 'G'); return q; });
  TIER_ART[k] = { 2: { ax: 4, rows: mk(2) }, 3: { ax: 4, rows: mk(3) } };
}
function tierSprite(id, tier) {
  const shp = WDEF[id].shape, art = TIER_ART[shp][tier], pal = WDEF[id].pal, acc = WCOL[id] || '#ffe14a', up = c => tier === 3 ? mixC(c, '#ffffff', .22) : c;
  let R2;
  if (shp === 'sword') R2 = { M: pal.b, H: pal.h, p: pal.p };
  else if (shp === 'axe') R2 = { M: pal.a, L: pal.A, H: pal.h };
  else if (shp === 'spear') R2 = { M: pal.t, H: pal.h };
  else if (shp === 'hammer') R2 = { M: pal.M, m: pal.m, H: pal.s };
  else if (shp === 'dagger') R2 = { M: pal.r, H: pal.h, p: pal.p };
  else if (shp.startsWith('bow')) { R2 = { M: pal.w, S: pal.s }; for (const k in pal) if (k !== 'w' && k !== 's') R2[k] = pal[k]; }
  else if (shp === 'cross') R2 = { M: pal.w, H: pal.h, L: pal.b };
  else R2 = { H: pal.s, O: pal.o, L: pal.h };
  const base = R2.M || R2.O, C = { D: '#15101f', W: '#ffffff', J: acc, G: tier === 3 ? '#ffe27a' : '#e0b030', L: mixC(base, '#ffffff', .55), m: mixC(base, '#000000', .3) };
  for (const k in R2) C[k] = up(R2[k]); if (R2.L) C.L = tier === 3 ? mixC(R2.L, '#ffffff', .5) : R2.L; if (!R2.m) C.m = mixC(C[R2.M ? 'M' : 'O'], '#000000', .3); if (!C.p) C.p = C.G; if (!C.H) C.H = '#6b4a22'; if (!C.S) C.S = '#e8e8e8'; if (!C.O) C.O = C.M;
  const top = art.h || [], low = top.slice(0, -1).reverse().map(r => r.replace(/L/g, 'm')), rows = art.rows || top.concat(low), w0 = Math.max(...rows.map(r => r.length)), h0 = rows.length, W = w0 + 2, H = h0 + 2;
  const g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill(null));
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.' && C[ch]) g[j + 1][i + 1] = C[ch]; }));
  const f = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y][x], ol = tier === 3 ? mixC(acc, '#ffffff', .15) : '#15101f', o = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x] && (f(x - 1, y) || f(x + 1, y) || f(x, y - 1) || f(x, y + 1))) o[y][x] = ol;
  if (tier === 3) for (const [x, y] of [[W - 1, 0], [W - 4, H - 1], [8, 0], [0, H - 1]]) if (!o[y][x]) o[y][x] = '#ffffff';
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x2 = c.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (o[y][x]) { x2.fillStyle = o[y][x]; x2.fillRect(x, y, 1, 1); }
  return { img: c, ax: art.ax + 1, w: W, h: H, s: 1 };
}
function wSp(id) { const st = STAR_OV >= 0 ? STAR_OV : wStar(id); if (st < 2 || WSPR[id].diag) return WSPR[id]; const k = id + st; return WTIER[k] || (WTIER[k] = tierSprite(id, st >= 3 ? 3 : 2)); }
let STAR_OV = -1;
const STAR_ANIM = false;   // animacao de brilho/faiscas das estrelas desligada por agora
function starFx(id, sp, k, front) {
  if (!STAR_ANIM) return;
  const st = STAR_OV >= 0 ? STAR_OV : wStar(id); if (!st) return;
  const t = performance.now() / 1000, L = sp.w * k, cx = (sp.w / 2 - sp.ax) * k, hh = sp.h * k, col = st === 3 ? `hsl(${(t * 90) % 360},100%,65%)` : (WCOL[id] || '#fff');
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (!front) { ctx.globalAlpha = .16 + .06 * st + .05 * Math.sin(t * 5); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, 0, L * (.42 + .05 * st), hh * (.5 + .12 * st), 0, 0, 7); ctx.fill(); ctx.restore(); return; }
  if (st >= 2 && !sp.diag) { ctx.globalAlpha = .22 + .16 * Math.sin(t * 6); ctx.drawImage(sp.img, -sp.ax * k, -sp.h * k / 2, sp.w * k, sp.h * k); }
  const n = [0, 0, 3, 6][st], z = Math.max(1.5, k * .55); ctx.globalAlpha = .95; ctx.fillStyle = st === 3 ? '#fff' : col;
  for (let i = 0; i < n; i++) { const a = t * 2.2 + i * 6.283 / n; ctx.fillRect(cx + Math.cos(a) * L * .58 - z / 2, Math.sin(a * 1.3) * hh * 1.1 - z / 2, z, z); }
  ctx.restore();
}
/* hs = escala do heroi (1 em jogo): nas armas diagonais cada pixel do desenho vale 2 pixeis do heroi */
function drawWeapon(id, hx, hy, ang, k, hs = 1) {
  const sp = wSp(id); if (sp.diag) k = 2 * hs; else k *= sp.s || 1;
  ctx.save(); ctx.translate(Math.round(hx), Math.round(hy)); ctx.rotate(ang); if (Math.cos(ang) < 0) ctx.scale(1, -1);
  starFx(id, sp, k, false);
  if (sp.diag) { ctx.save(); ctx.rotate(Math.PI / 4); ctx.drawImage(sp.img, -sp.gx * k, -sp.gy * k, 16 * k, 16 * k); ctx.restore(); }
  else ctx.drawImage(sp.img, -sp.ax * k, -sp.h * k / 2, sp.w * k, sp.h * k);
  starFx(id, sp, k, true); ctx.restore();
}
const wGlowD = (id, hs, old) => { const sp = wSp(id); return sp.diag ? sp.gd * 2 * hs : old; };   // distancia da mao ate ao brilho da ponta
const wGlowR = (id, hs, old) => wSp(id).diag ? 5 * hs : old;   // raio do brilho
function weaponIcon(id, cx, cy, k, rot = -.785) {
  const sp = wSp(id);
  if (sp.diag) {   // desenho diagonal: sem rodar quando aponta para cima-direita; escala inteira para os pixeis ficarem nitidos
    const ks = Math.max(1, Math.round(k * .9)), up = Math.abs(rot + Math.PI / 4) < .01, c = Math.cos(Math.PI / 4), s = Math.sin(Math.PI / 4), vx = sp.gx - 8, vy = sp.gy - 8;
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.rotate(up ? -Math.PI / 4 : rot);
    ctx.save(); ctx.translate((vx * c - vy * s) * ks, (vx * s + vy * c) * ks); starFx(id, sp, ks, false); ctx.restore();
    ctx.save(); ctx.rotate(Math.PI / 4); ctx.drawImage(sp.img, -8 * ks, -8 * ks, 16 * ks, 16 * ks); ctx.restore();
    ctx.translate((vx * c - vy * s) * ks, (vx * s + vy * c) * ks); starFx(id, sp, ks, true); ctx.restore(); return;
  }
  k *= sp.s || 1; ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.rotate(rot); const o = sp.ax * k - sp.w * k / 2;
  ctx.save(); ctx.translate(o, 0); starFx(id, sp, k, false); ctx.restore(); ctx.drawImage(sp.img, -sp.w * k / 2, -sp.h * k / 2, sp.w * k, sp.h * k); ctx.translate(o, 0); starFx(id, sp, k, true); ctx.restore();
}
function heldWeapon(p, bobY) {
  const w = curW(); let ang = p.face, ox = 0;
  if (p.sw > 0) { const pr = 1 - p.sw / p.swd; if (w.t === 'melee') { ang += -1.2 + 2.4 * pr; } else ox = -Math.sin(pr * Math.PI) * 4; }
  else if (w.t === 'melee') ang -= .35;
  const hd = HAND[save.cls], hx = p.x + (p.flip ? -1 : 1) * hd[0] * 3 + Math.cos(p.face) * ox, hy = p.y + bobY + hd[1] * 3 + Math.sin(p.face) * ox * .7;   // mao direita do heroi
  const wlv = wlvl(), ac = auraCol(wlv);
  if (ac) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .28 + .12 * Math.sin(R.time * 8); ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * 16, hy + Math.sin(ang) * 16, 20, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (wlv >= 10 && Math.random() < .25) spark(hx + Math.cos(ang) * (8 + Math.random() * 24), hy + Math.sin(ang) * (8 + Math.random() * 24), ac, 1, 20, .5, 2, -25); }
  drawWeapon(w.id, hx, hy, ang, 3, 1);
  if (GLOWW[w.id]) { const gd = wGlowD(w.id, 1, 27), tx = hx + Math.cos(ang) * gd, ty = hy + Math.sin(ang) * gd; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55 + .2 * Math.sin(R.time * 9); ctx.fillStyle = GLOWW[w.id]; ctx.beginPath(); ctx.arc(tx, ty, wGlowR(w.id, 1, 13), 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
}

function drawSpr(name, x, y, flip, flash, bob = 0) {
  const s = SPR[name], img = flash ? s.f : s.n;
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(flip ? -1 : 1, 1); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
}
function drawSprBig(name, x, y, k) { const img = SPR[name].n; ctx.drawImage(img, x - img.width * k / 2, y - img.height * k / 2, img.width * k, img.height * k); }

