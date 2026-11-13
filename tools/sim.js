#!/usr/bin/env node
// Simulador de combate do Guardians of Gold (corre no terminal, sem browser): node tools/sim.js <comando> [opcoes]
//
//   raid     joga uma raid varias vezes e diz a taxa de vitoria, o tempo e a vida perdida
//            node tools/sim.js raid --class mage --level 44 --raid 0 --diff 1 --runs 5
//   rec      procura o nivel minimo que ganha cada raid (e compara com o "Rec. Lv" do jogo)
//            node tools/sim.js rec --class mage --diff 0,1 --runs 3 --target 0.6
//   weapons  compara as 5 armas de uma classe numa raid
//            node tools/sim.js weapons --class knight --level 40 --raid 1 --diff 0
//   farm     joga o Campanha/Farm ate uma onda
//            node tools/sim.js farm --class archer --level 30 --zone 2 --waves 20
//
// Opcoes do personagem: --level --weapon <0-4|best> --anvil --stars --rarity <0-4> --il --points <fator> --ring <0-3>
// Outras: --runs N  --seed N  --tmax <segundos de jogo>  --json
// O personagem e "tipico" (equipamento do mesmo nivel em todas as pecas, atributos 45/25/20/10); ver tools/sim/bot.js.
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');

const args = process.argv.slice(2), cmd = args[0], opt = {};
for (let i = 1; i < args.length; i++) { if (args[i].startsWith('--')) { const k = args[i].slice(2), v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'; opt[k] = v; } }
if (!cmd || cmd === 'help' || cmd === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 17).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }

const num = (v, d) => v === undefined ? d : isNaN(+v) ? v : +v;
const ctx = loadGame({ seed: num(opt.seed, 12345) });
vm.runInContext(fs.readFileSync(__dirname + '/sim/bot.js', 'utf8'), ctx, { filename: 'sim/bot.js' });
const call = (fn, ...a) => { ctx.__a = a; return vm.runInContext(fn + '(...__a)', ctx); };
const base = () => ({ cls: opt.class || 'mage', level: num(opt.level, 40), weapon: num(opt.weapon, undefined), anvil: num(opt.anvil, undefined), stars: num(opt.stars, undefined), rarity: num(opt.rarity, undefined), il: num(opt.il, undefined), points: num(opt.points, undefined), ring: num(opt.ring, undefined), tmax: num(opt.tmax, undefined) });
const runs = num(opt.runs, 3), pct = x => Math.round(x * 100) + '%';
const raidName = i => vm.runInContext('MISSIONS[' + i + '].name', ctx), diffName = d => vm.runInContext('RAID_D[' + d + '].n', ctx), recOf = (i, d) => vm.runInContext('raidRec(' + i + ',' + d + ')', ctx);
const classes = opt.class ? [opt.class] : ['knight', 'archer', 'mage'];
const list = (v, d) => v === undefined ? d : String(v).split(',').map(Number);

if (cmd === 'raid') {
  const o = Object.assign(base(), { raid: num(opt.raid, 0), diff: num(opt.diff, 0) }), wr = call('simWinRate', o, runs);
  if (opt.json) console.log(JSON.stringify(wr)); else {
    console.log(`${o.cls} nivel ${o.level} | raid ${o.raid + 1} ${raidName(o.raid)} (${diffName(o.diff)}, rec. ${recOf(o.raid, o.diff)}) | arma ${wr.info.weapon} +${wr.info.anvil} ${wr.info.stars}★, equip. raridade ${wr.info.rarity} nv.${wr.info.il}`);
    console.log(`  vitorias ${pct(wr.rate)} (${runs} corridas) | tempo medio ${wr.avgT === null ? '—' : wr.avgT + 's'} | vida perdida ${wr.avgLost}% | sem acabar ${wr.timeouts}`);
  }
} else if (cmd === 'rec') {
  const target = num(opt.target, .6), diffs = list(opt.diff, [0, 1]), raids = list(opt.raid, [0, 1, 2, 3, 4, 5]);
  console.log(`Nivel minimo com >= ${pct(target)} de vitorias (${runs} corridas por nivel) vs. "Rec. Lv" do jogo`);
  for (const d of diffs) for (const i of raids) {
    const per = classes.map(c => { const r = call('simFindLevel', Object.assign(base(), { cls: c, raid: i, diff: d }), runs, target, 1, 220); return r ? r.level : '>220'; });
    console.log(`${diffName(d).padEnd(9)} raid ${i + 1} ${raidName(i).padEnd(20)} rec. ${String(recOf(i, d)).padStart(3)} | ` + classes.map((c, k) => `${c} ${String(per[k]).padStart(4)}`).join(' | ') + (per.every(x => x !== '>220') ? `  (media ${Math.round(per.reduce((a, b) => a + b, 0) / per.length)})` : ''));
  }
} else if (cmd === 'weapons') {
  const o0 = Object.assign(base(), { raid: num(opt.raid, 0), diff: num(opt.diff, 0) });
  console.log(`${o0.cls} nivel ${o0.level} | raid ${o0.raid + 1} ${raidName(o0.raid)} (${diffName(o0.diff)}) | ${runs} corridas`);
  for (let w = 0; w < 5; w++) { const wr = call('simWinRate', Object.assign({}, o0, { weapon: w }), runs); console.log(`  arma ${w + 1} ${wr.info.weapon.padEnd(9)} vitorias ${pct(wr.rate).padStart(4)} | tempo ${wr.avgT === null ? '—' : wr.avgT + 's'} | vida perdida ${wr.avgLost}%`); }
} else if (cmd === 'farm') {
  const o = Object.assign(base(), { zone: num(opt.zone, 0), waves: num(opt.waves, 20) }), rs = [];
  for (let i = 0; i < runs; i++) rs.push(call('simFarm', o));
  console.log(`${o.cls} nivel ${o.level} | zona ${o.zone + 1} ${raidName(o.zone)} | ate a onda ${o.waves}`);
  console.log(`  onda media ${(rs.reduce((a, r) => a + r.wave, 0) / runs).toFixed(1)} | mortes ${rs.filter(r => r.died).length}/${runs} | segundos por morte de monstro ${(rs.reduce((a, r) => a + r.spk, 0) / runs).toFixed(2)}`);
} else { console.log('comando desconhecido: ' + cmd + ' (usa: raid, rec, weapons, farm)'); process.exit(1); }
