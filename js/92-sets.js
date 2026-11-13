'use strict';
/* ----- Conjuntos de armadura: 2 e 4 pecas da mesma raridade -----
   Conta as pecas equipadas (capacete, armadura, botas, amuleto) por raridade. Com 2 pecas iguais ativa o bonus de 2; com as 4 ativa tambem o de 4.
   Os bonus de stats multiplicam o valor final (o Critico soma pontos). Lendario e Mitico ganham um efeito especial nas 4 pecas.
   Com 2+2 (duas raridades com 2 pecas cada) ficam ativos os dois bonus de 2 pecas. O anel tem o seu proprio bonus (ver 90-equipment.js). */
const ARMOUR_SETS = [
  { two: { k: 'hp', p: 3 },   four: { k: 'spd', p: 4 } },                        // Couro (Comum)
  { two: { k: 'dmg', p: 4 },  four: { k: 'cdr', p: 5 } },                        // Ferro (Raro)
  { two: { k: 'crit', p: 5 }, four: { k: 'dmg', p: 7 } },                        // Runico (Epico)
  { two: { k: 'hp', p: 6 },   four: { k: 'dmg', p: 8, fx: 'boom' } },            // Ancestral (Lendario)
  { two: { k: 'dmg', p: 8 },  four: { k: 'hp', p: 10, fx: 'aegis' } },           // Divino (Mitico)
];
const SET_NAMES = ['Couro', 'Ferro', 'Rúnico', 'Ancestral', 'Divino'];
const SET_FX = { boom: ['Detonação', 'Ao matar, 15% de explodir.'], aegis: ['Égide Divina', 'De 12 em 12 s ficas invulnerável 1,5 s.'] };
const SET_BOOM = { chance: .15, r: 70, dmg: 3 }, SET_AEGIS = { every: 12, inv: 1.5 };

function armourCounts() { const c = [0, 0, 0, 0, 0]; for (const sl of SLOTS) { const it = save && save.gear && save.gear[sl]; if (it) c[it.r | 0]++; } return c; }
// bonus ativos agora: [{ r, n: 2|4, k, p, fx? }]
function armourSets() {
  const c = armourCounts(), out = [];
  c.forEach((n, r) => { if (n >= 2) out.push(Object.assign({ r, n: 2 }, ARMOUR_SETS[r].two)); if (n >= 4) out.push(Object.assign({ r, n: 4 }, ARMOUR_SETS[r].four)); });
  return out;
}
const setPct = k => { let s = 0; for (const b of armourSets()) if (b.k === k && k !== 'crit') s += b.p / 100; return s; };   // fracao a multiplicar no stat final
const setHasFx = fx => armourSets().some(b => b.fx === fx);
const setLine = b => `+${b.p}% ${AFF[b.k].n}`;

// texto do ecra da personagem (so desenho): devolve a altura usada
function drawSetInfo(x, y) {
  const c = armourCounts(), act = []; for (let r = 4; r >= 0; r--) if (c[r] >= 2) act.push(r);
  if (!act.length) { wrap('Junta 2 ou 4 peças da mesma raridade para ativar bónus de conjunto.', x, y + 2, 262, 13, 11, '#778'); return 28; }
  let yy = y;
  for (const r of act.slice(0, 2)) {
    const S = ARMOUR_SETS[r], n = c[r], on4 = n >= 4, col = RAR[r][1];
    txt(lang === 'en' ? `${L(SET_NAMES[r])} Set (${n}/4)` : `Conjunto ${SET_NAMES[r]} (${n}/4)`, x, yy, 12, col, 'left', 'bold'); yy += 13;
    const a = '2 peças: ' + setLine(S.two), w1 = txtW(a, 10) + 12;
    txt(a, x, yy, 10, '#6f6'); txt('4 peças: ' + setLine(S.four), x + w1, yy, 10, on4 ? '#6f6' : '#778'); yy += 12;
    if (S.four.fx) { txt(`${SET_FX[S.four.fx][0]}: ${SET_FX[S.four.fx][1]}`, x, yy, 10, on4 ? '#fd5' : '#778'); yy += 12; }
    yy += 3;
  }
  return yy - y;
}
