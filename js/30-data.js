'use strict';
/* =====================================================================
   DADOS
   ===================================================================== */
const CLASSES = {
  knight: { name: 'Cavaleiro', hp: 140, spd: 165, sp: 'Escudo Férreo', desc: 'Tanque corpo-a-corpo. Muita vida, golpes pesados e 15% menos dano recebido.', spDesc: 'Ergue um escudo durante 10 segundos: recebes 60% menos dano. Recarrega a cada 22 segundos.',
    weapons: [
      { id: 'k_sword',  n: 'Espada de Ferro',    price: 0,   t: 'melee', dmg: 1,   cd: .35, range: 70,  arc: .45, kb: 240, info: 'Rápida e equilibrada.', sk: { n: 'Investida', cd: 6, d: 'Lança-te em frente ferindo tudo no caminho.' } },
      { id: 'k_axe',    n: 'Espada Gigante',     price: 600, t: 'melee', dmg: 5, cd: 1.05,  range: 90,  arc: .8, kb: 440, info: 'Enorme e muito lenta: dano altíssimo.', sk: { n: 'Terremoto', cd: 8, d: 'Abala o chão: dano em área e atordoa.' } },
      { id: 'k_spear',  n: 'Lâmina Gémea',       price: 2700, t: 'melee', dmg: 3.2, cd: .5, range: 80, arc: .5, kb: 200, info: 'Afiadíssima: dano alto e golpes certeiros.', sk: { n: 'Onda de Corte', cd: 7, d: 'Lança uma onda de choque que atravessa tudo.' } },
      { id: 'k_hammer', n: 'Espada Dourada',     price: 10500, t: 'melee', dmg: 1.7, cd: .2, range: 68, arc: .42, kb: 90, info: 'Rapidíssima.', sk: { n: 'Frenesim Dourado', cd: 12, d: '6s: cada abate acelera os teus ataques.' } },
      { id: 'k_blade',  n: 'Espada Vampírica',   price: 30000, t: 'melee', dmg: 3.2, cd: .3, range: 78, arc: .5, kb: 160, lifesteal: .12, info: 'Rouba vida em cada golpe.', sk: { n: 'Onda Sanguínea', cd: 11, d: 'Onda de choque que rouba vida.' } } ] },
  archer: { name: 'Arqueiro', hp: 95, spd: 195, sp: 'Chuva de Flechas', desc: 'Ataca de longe. Rápido mas frágil.', spDesc: 'Dispara 14 flechas em todas as direções.',
    weapons: [
      { id: 'a_bow',    n: 'Arco Curto',   price: 0,   t: 'arrow', dmg: 1,  cd: .38, count: 1, spread: 0,  spd: 560, pierce: 0, info: 'Flecha rápida e certeira.', sk: { n: 'Salva Rápida', cd: 6, d: '7 flechas em rápida sequência.' } },
      { id: 'a_triple', n: 'Arco Longo',  price: 600, t: 'arrow', dmg: 2.4, cd: .5, count: 1, spread: 0, spd: 800, life: 2.1, pierce: 1, info: 'Alcança muito mais longe e dá mais dano.', sk: { n: 'Tiro Certeiro', cd: 7, d: 'Flecha gigante de longo alcance que atravessa tudo.' } },
      { id: 'a_cross',  n: 'Besta',        price: 2700, t: 'arrow', dmg: 7.5, cd: 1.1, count: 1, spread: 0, spd: 820, pierce: 2, info: 'Um pouco lenta, mas com bom dano.', sk: { n: 'Rajada de Virotes', cd: 8, d: 'Dispara uma chuva de virotes em leque.' } },
      { id: 'a_fire',   n: 'Besta de Repetição', price: 10500, t: 'arrow', dmg: 1.3, cd: .2, count: 1, spread: .05, spd: 700, bounce: 3, pierce: 0, info: 'Muito rápida, dano baixo. Flechas ricocheteiam.', sk: { n: 'Rajada Ricochete', cd: 8, d: 'Salva de virotes que ricocheteiam entre inimigos.' } },
      { id: 'a_dark',   n: 'Canhão de Mão', price: 30000, t: 'arrow', dmg: 24, cd: 2.4, count: 1, spread: 0, spd: 520, pierce: 0, kind: 'ball', aoe: 70, info: 'Muito lento, mas com dano absurdo.', sk: { n: 'Bomba Carregada', cd: 12, d: 'Carrega o canhão e explode numa área enorme.' } } ] },
  mage: { name: 'Mago', hp: 80, spd: 175, sp: 'Renovação Arcana', desc: 'Magia à distância com efeitos especiais.', spDesc: 'Recupera 10% da vida. Recarrega a cada 12 segundos.',
    weapons: [
      { id: 'm_fire',   n: 'Cajado de Fogo',  price: 0,   t: 'bolt', kind: 'fire', dmg: 1.75, cd: .6, spd: 380, aoe: 55, info: 'Bola de fogo explosiva que deixa chamas no chão.', sk: { n: 'Meteoro', cd: 8, d: 'Chama um meteoro que incendeia o chão.' } },
      { id: 'm_ice',    n: 'Cajado de Gelo',  price: 600, t: 'bolt', kind: 'ice',  dmg: 2.1,   cd: .4, spd: 430, slow: 2, info: 'Congela e deixa um rasto gelado.', sk: { n: 'Prisão de Gelo', cd: 9, d: 'Prende tudo em cristais de gelo.' } },
      { id: 'm_bolt',   n: 'Cajado de Raios', price: 2700, t: 'zap',  dmg: 1.7, cd: .5, range: 300, chain: 3, info: 'Raio com faíscas que salta entre inimigos.', sk: { n: 'Tempestade', cd: 10, d: '7 raios caem sobre os inimigos.' } },
      { id: 'm_arcane', n: 'Cajado Venenoso', price: 10500, t: 'bolt', kind: 'poison', dmg: 3, cd: .4, spd: 360, info: 'Dispara veneno que corrói os inimigos ao longo do tempo.', sk: { n: 'Círculo Tóxico', cd: 12, d: 'Círculo tóxico que fere quem se aproxima.' } },
      { id: 'm_dark',   n: 'Cajado Vampírico', price: 30000, t: 'bolt', kind: 'blood', dmg: 3.6, cd: .45, spd: 400, pierce: 1, leech: .12, info: 'Rouba vida enquanto dispara.', sk: { n: 'Dreno de Vida', cd: 11, d: 'Suga a vida dos inimigos próximos.' } } ] },
};
const MAXLV = Infinity, xpNeed = l => 60 + 40 * (l - 1) + (l > 40 ? 3 * (l - 40) ** 2 : 0);   // nivel infinito
const attrBuyCost = n => Math.round((100 + 20 * n + .5 * n * n) / 5) * 5;   // preco do ponto de atributo n (n = pontos ja comprados): 100, 120, 140, 165, 190... sobe sempre
const GOLD_MAX = 2147483647;   // limite do ouro: maior inteiro de 32 bits
const gfmt = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function addXP(n) { const pl = save.pl; pl.xp += n; while (pl.xp >= xpNeed(pl.lv)) { pl.xp -= xpNeed(pl.lv); pl.lv++; save.pts += 3; if (pl.lv % 10 === 0) save.gems += 10; } }
const FARM_UNLOCK = [10, 10, 10, 10, 10, 10];   // onda a atingir em cada zona para abrir a seguinte
// parametros de equilibrio (testados com o simulador)
const TUNE = { lvDmg: .04, eHP: 1.5, eDmg: .9, wHP: .15, wHP2: .007, wDM: .05, lHP: .02, lDM: .02, zHP: .10, boss: [50, 60, 80, 105, 135, 170], dr: { knight: 15, archer: 0, mage: 0 }, cls: { knight: 1.65, archer: 1, mage: .72 } };
const REC_BASE = [1, 15, 30, 45, 58, 70], PRES_MAX = 5, PRES_STEP = 10, PRES_WAVE = 30;   // nivel recomendado de cada zona; cada estrela de prestigio sobe 10 niveis (a ultima do Abismo Final e nivel 120); para dar prestigio chega a onda 30
const farmRec = (m, P) => REC_BASE[m] + PRES_STEP * (P === undefined ? ((typeof save === 'object' && save && save.pres && save.pres[m]) | 0) : P);
// forca extra dos monstros da campanha por nivel recomendado: [nivel, multiplicador de vida, multiplicador de dano] (calibrado com o simulador)
const FARM_KT = [[1, .55, .8], [15, 1.25, 1.11], [30, 1.9, 1.4], [45, 3.6, 2.17], [60, 6, 3.25], [75, 7, 3.7], [90, 8, 4.15], [105, 8.8, 4.5], [120, 9.2, 4.7]];   // recalibrado: a um nivel igual ao recomendado chega-se a onda 10
function farmK(rec) {
  const t = FARM_KT; if (rec <= t[0][0]) return { hp: t[0][1], dm: t[0][2] };
  for (let i = 1; i < t.length; i++) if (rec <= t[i][0]) { const a = t[i - 1], b = t[i], f = (rec - a[0]) / (b[0] - a[0]); return { hp: a[1] + (b[1] - a[1]) * f, dm: a[2] + (b[2] - a[2]) * f }; }
  const z = t[t.length - 1]; return { hp: z[1], dm: z[2] };
}
const COIN_RATE = .25, FARM_RATE = .85;
const HEART_PCT = .08;   // cada coracao do chao cura 8% da vida maxima
const heartHeal = () => Math.max(1, Math.round(R.p.max * HEART_PCT));
// quem joga acima do nivel recomendado do mapa ganha menos XP: 3 niveis de folga, depois -8% por nivel (minimo 5%)
const xpK = (lv, rec) => lv <= rec + 3 ? 1 : Math.max(.05, 1 - .08 * (lv - rec - 3));   // o Farm da 15% menos ouro e XP
const lvOf = () => (typeof R === 'object' && R && R.farm && R.rec) ? R.rec : (((save && save.pl.lv) || 1));   // na campanha os monstros seguem o nivel recomendado do mapa, nao o teu
const lvHP = () => 1 + TUNE.lHP * (lvOf() - 1), lvDM = () => 1 + TUNE.lDM * (lvOf() - 1);   // os inimigos acompanham o nivel do jogador   // ouro por inimigo (reequilibrio v1.1)
// armas fortes exigem nivel e uma raid concluida (raid = indice do mapa, d = dificuldade): a Mitica pede a ultima raid Normal
const WEAPON_REQ = [{ lv: 1 }, { lv: 6 }, { lv: 12, raid: 0, d: 0 }, { lv: 30, raid: 5, d: 0 }, { lv: 50, raid: 5, d: 1 }];
const RAID_D = [
  { n: 'Fácil',    col: '#4cc46a', hp: 8,   dmg: 2.3, gold: 1,  spd: 1.05 },
  { n: 'Normal',   col: '#4a9aff', hp: 14,  dmg: 3.1, gold: 2,  spd: 1.1 },
  { n: 'Difícil',  col: '#ff9a2a', hp: 24,  dmg: 4.1, gold: 4,  spd: 1.15 },
  { n: 'Pesadelo', col: '#ff4a4a', hp: 40,  dmg: 5.5, gold: 8,  spd: 1.2 },
  { n: 'Inferno',  col: '#c040ff', hp: 65,  dmg: 7.5, gold: 15, spd: 1.25 },
];
// nas raids os monstros pequenos sao mais fortes e aparecem em maior numero (o boss nao muda)
// nivel recomendado de cada raid: de 15 (1a Facil) ate 173 (ultima Inferno); cada dificuldade sobe 32 niveis
const raidRec = (i, d) => 15 + 6 * i + 32 * d;
// vida e dano dos monstros: base por dificuldade, crescendo ao longo das 6 raids (nas dificuldades altas a subida por raid e menor)
const RAID_H0 = [3.2, 14, 34, 65, 105], RAID_HZ = [7, 2.2, 1.4, .6, .1], RAID_M0 = [.54, 1.4, 2.4, 6.5, 6.6], RAID_MZ = [1.7, 1.1, .8, -.5, -.35];   // Pesadelo e Inferno recalibrados com o simulador
const raidHP = (i, d) => RAID_H0[d] * (1 + RAID_HZ[d] * i / 5), raidDM = (i, d) => RAID_M0[d] * (1 + RAID_MZ[d] * i / 5);
RAID_D.forEach((d, j) => { d.hp = +raidHP(0, j).toFixed(1); d.dmg = +raidDM(0, j).toFixed(1); });   // valores da primeira raid (so para mostrar)
const RAID_OVER = { hp: .04, dmg: .02, cap: 12 };   // acima do nivel recomendado os monstros ganham pouca forca (no maximo 12 niveis a contar)
const RAID_MINI = { hp: 1.8, dmg: 1.4, cap: 5, capD: 3, rate: 1.8, burst: 6 };
const diffOpen = d => d === 0 || MISSIONS.every((m, i) => ((save.raids[i] || [])[d - 1] | 0) > 0);   // uma dificuldade abre quando concluis TODAS as raids da anterior
let raidD = 0;
const ANV_MAX = 20, ANV_CH = [100, 95, 90, 80, 70, 60, 50, 40, 30, 22, 15, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5], LUCKY_BONUS = 15, LUCKY_MAX = 85;
const luckOk = (lv, id) => ANV_CH[lv] + Math.min(25, 5 * ((save.pity && save.pity[id]) || 0)) < LUCKY_MAX;   // o amuleto so ajuda se a chance for inferior a 85%
// todos os custos de Bigorna, Encantar e Fusao sobem com o nivel do jogador (+5% por nivel), para nunca ficarem baratos
const lvMul = () => 1 + (((typeof save === 'object' && save && save.pl && save.pl.lv) || 1) * .05);
const anvCost = l => Math.round((60 * (l + 1) + (l >= 8 ? 150 * (l - 7) : 0) + (l >= 12 ? 500 * (l - 11) : 0)) * lvMul()), luckyCost = l => Math.round((30 + 15 * l) * lvMul()), protCost = l => Math.round((60 + 30 * l) * lvMul());
const auraCol = l => l >= 16 ? '#ff7aff' : l >= 12 ? '#ffd34a' : l >= 10 ? '#ff6a6a' : l >= 5 ? '#7fd0ff' : null;

const EN = {
  slime: { spr: 'slime', hp: 3,  spd: 55,  r: 12, dmg: 8,  gold: 3,  ai: 'chase' },
  bat:   { spr: 'bat',   hp: 2,  spd: 125, r: 10, dmg: 6,  gold: 4,  ai: 'bat' },
  skel:  { spr: 'skel',  hp: 4,  spd: 55,  r: 12, dmg: 8,  gold: 6,  ai: 'shoot', shot: 'earrow' },
  brute: { spr: 'brute', hp: 10, spd: 48,  r: 18, dmg: 18, gold: 12, ai: 'chase' },
  wolf:  { spr: 'wolf',  hp: 3,  spd: 150, r: 11, dmg: 9,  gold: 5,  ai: 'chase' },
  ghost: { spr: 'ghost', hp: 4,  spd: 50,  r: 11, dmg: 7,  gold: 7,  ai: 'shoot', shot: 'orb' },
  imp:    { spr: 'imp',    hp: 5,  spd: 95,  r: 11, dmg: 9,  gold: 8,  ai: 'shoot', shot: 'orb', col: '#ff6a2a', pspd: 280, rate: 1.4 },
  beetle: { spr: 'beetle', hp: 9, spd: 62,  r: 14, dmg: 15, gold: 14, ai: 'charge' },
  shroom: { spr: 'shroom', hp: 8,  spd: 42,  r: 12, dmg: 6,  gold: 9,  ai: 'chase', boom: true },
};
const MISSIONS = [
  { name: 'Floresta Sombria', desc: 'Limpa a floresta e enfrenta o Ceifador.', kills: 10, types: ['slime','slime','bat'],
    boss: { name: 'O Ceifador', hp: 50, pal: 'reaper', r: 34, spd: 55, ring: 8, charge: 380, col: '#c6f', pattern: ['ring','charge','spread'] }, reward: 60, theme: 0, cap: 5 },
  { name: 'Cavernas Douradas', desc: 'Esqueletos e lobos guardam o Golem.', kills: 16, types: ['slime','bat','skel','wolf','slime','beetle'],
    boss: { name: 'Golem de Pedra', hp: 85, pal: 'golem', r: 38, spd: 45, ring: 10, charge: 340, col: '#9ef', pattern: ['slam','ring','charge','slam'] }, reward: 120, theme: 1, cap: 6 },
  { name: 'Castelo Maldito', desc: 'O covil do Dragão Rubro.', kills: 22, types: ['slime','bat','skel','brute','imp','imp'],
    boss: { name: 'Dragão Rubro', hp: 120, pal: 'dragon', r: 40, spd: 65, ring: 12, charge: 460, col: '#f93', pattern: ['cone','meteors','charge','cone'] }, reward: 200, theme: 2, cap: 7 },
  { name: 'Pântano Tóxico', desc: 'Fantasmas e lobos servem a Rainha.', kills: 24, types: ['slime','wolf','ghost','bat','shroom','shroom'],
    boss: { name: 'Rainha do Pântano', hp: 160, pal: 'queen', r: 36, spd: 60, ring: 10, charge: 420, col: '#8f4', pattern: ['spread','summon','spiral','charge'] }, reward: 260, theme: 3, cap: 7 },
  { name: 'Deserto Ardente', desc: 'O Faraó desperta das areias.', kills: 26, types: ['wolf','skel','brute','bat','beetle','imp'],
    boss: { name: 'Faraó Eterno', hp: 200, pal: 'pharaoh', r: 38, spd: 55, ring: 14, charge: 440, col: '#fd4', pattern: ['meteors','spiral','slam','cone'] }, reward: 340, theme: 4, cap: 8 },
  { name: 'Abismo Final', desc: 'O Rei Demónio espera no fundo.', kills: 30, types: ['ghost','brute','wolf','skel','bat','imp','shroom','beetle'],
    boss: { name: 'Rei Demónio', hp: 250, pal: 'demon', r: 42, spd: 70, ring: 16, charge: 500, col: '#f4f', pattern: ['blink','spiral','meteors','charge','summon','slam'] }, reward: 500, theme: 5, cap: 9 },
];
Object.assign(EN, MOB_EN);
MISSIONS.forEach((m, i) => { m.types = MAP_TYPES[i]; m.semi = SEMI[i]; });
const THEMES = [
  { bg: '#26301a', grid: '#334422' }, { bg: '#2e2418', grid: '#3e3020' }, { bg: '#2a1a1a', grid: '#3a2424' },
  { bg: '#2a2c14', grid: '#3a3d1c' }, { bg: '#4a3a1c', grid: '#5e4a24' }, { bg: '#1c1226', grid: '#2c1c3a' },
];

