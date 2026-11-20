// Gera wiki.html a partir de tools/wiki/wiki-data.json (node tools/wiki/gen-data.js primeiro) e escreve-o na raiz do projeto.
// Gera wiki.html (página única, com pesquisa) a partir dos dados exportados do jogo.
const fs = require('fs'), path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'wiki-data.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const img = (f, w = 48) => `<img src="docs/img/${f}" width="${w}" alt="" loading="lazy">`;
const PAT = { ring: 'anel de projéteis', charge: 'investida', spread: 'leque de tiros', slam: 'pancada em área', cone: 'sopro em cone', meteors: 'chuva de meteoros', summon: 'invoca lacaios', spiral: 'espiral de tiros', blink: 'teletransporte' };
const AID = { chase: 'persegue-te', fast: 'muito rápido', fly: 'voo errático e rápido', shootA: 'mantém distância e dispara setas', shootO: 'mantém distância e dispara orbes', tank: 'lento, muita vida e muito dano', charge: 'prepara-se (!) e investe em linha reta', boom: 'explode ao morrer, deixando uma área perigosa' };
const ANV = [100, 95, 90, 80, 70, 60, 50, 40, 30, 22, 15, 10];
const ST = [1, 1.4, 1.9, 2.5];
const card = (txt, body) => `<div class="card" data-s="${esc(txt.toLowerCase())}">${body}</div>`;
const sec = (id, title, intro, body) => `<section id="${id}"><h2>${title}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}${body}</section>`;
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'starfx.json'), 'utf8'));
const H = [];

// Classes + armas
let cls = '';
for (const k in D.classes) {
  const c = D.classes[k];
  cls += card(c.name + ' ' + c.sp + ' ' + c.desc, `<div class="row">${img(`skin-${k}-0.png`, 64)}<div><h3>${c.name}</h3><p>Vida ${c.hp} · Veloc. ${c.spd}</p><p><b>${esc(c.sp)}</b> (Q): ${esc(c.spDesc)}</p><p class="mut">${esc(c.desc)}</p></div></div>`);
}
H.push(sec('classes', 'Classes', 'A classe escolhe-se ao criar o personagem e não pode ser trocada.', `<div class="grid">${cls}</div>`));

let wp = '';
for (const k in D.classes) {
  const c = D.classes[k];
  wp += `<h3 class="cl" data-cls="${k}">${c.name}</h3><div class="grid" data-cls="${k}">` + c.weapons.map((w, i) => {
    const q = D.req[i], need = i === 0 ? 'Inicial' : `Nv ${q.lv}` + (q.raid !== undefined ? ` + raid ${D.raid[q.d || 0].n}: ${D.missions[q.raid].name}` : '');
    return card(`${w.n} ${w.info} ${w.sk.n} ${w.sk.d} ${c.name}`, `<div class="row">${img(`weapon-${w.id}.png`, 56)}<div><h3>${esc(w.n)}</h3><p class="mut">${esc(w.info)}</p><p>Dano ${Math.round(w.dmg * 10)} · ${(1 / w.cd).toFixed(1)}/s · ${w.price ? '¢' + w.price : 'inicial'}</p><p class="mut">${need}</p></div></div><p><b>${esc(w.sk.n)}</b> (E, ${w.sk.cd}s): ${esc(w.sk.d)}</p><p class="mut">★1 ${esc(FX[w.id][0])} · ★2 ${esc(FX[w.id][1])} · ★3 ${esc(FX[w.id][2])}</p>`);
  }).join('') + '</div>';
}
H.push(sec('armas', 'Armas', 'Cada arma tem uma habilidade própria (E) e melhora na Bigorna até +12.', wp));

H.push(sec('fusao', 'Fusão', 'Desbloqueia no nível 20. 5 armas iguais dão 1 com mais uma estrela, até 3★; o equipamento também se funde (5 peças iguais, incluindo as bloqueadas com cadeado).',
  `<p class="mut">Cada estrela melhora também a habilidade (E) da arma; os efeitos aparecem em cada arma, em Armas. Cada fusão custa ouro.</p><table><tr><th>Estrelas</th><th>Arma: dano</th><th>Arma: vel. ataque</th><th>Equipamento: bónus</th></tr>` +
  [1, 2, 3].map(i => `<tr><td>${i}★${i === 3 ? ' (MAX)' : ''}</td><td>×${D.starMult[i].toFixed(2)}</td><td>+${i * 3}%</td><td>×${D.gearStar[i].toFixed(2)}</td></tr>`).join('') + '</table>' +
  `<h3>Missão de cada estrela (uma vez por arma)</h3><p class="mut">Antes de poderes juntar cópias para uma estrela, a arma tem de cumprir uma missão, <b>uma única vez</b>. Depois disso juntas quantas vezes quiseres (5 cópias + ouro). Armas que já têm uma estrela têm essa e as anteriores desbloqueadas.</p>
<table><tr><th>Estrela</th><th>Pedra de evolução</th><th>Objetivo com esta arma</th></tr>
<tr><td>1★</td><td>1× ${D.rar[0][0]}</td><td>5 000 abates</td></tr>
<tr><td>2★</td><td>2× ${D.rar[1][0]}</td><td>20 raids (depois de ter 1★)</td></tr>
<tr><td>3★</td><td>1× ${D.rar[3][0]}</td><td>50 raids Normal ou acima (depois de ter 2★)</td></tr></table>
<h3>Equipamento</h3><p>5 peças iguais (mesma peça, raridade, estrelas e faixa de nível de item) dão 1 peça com <b>mais uma estrela</b> e <b>+2 níveis de item</b> (média dos 5 + 2, máx. 120). As outras 4 desaparecem. Os itens bloqueados com cadeado também entram. A lista de grupos tem páginas e mostra primeiro os que já se podem juntar.</p>
<h3>Vender cópias de arma</h3><p>No separador Fusão › Armas podes vender cópias (Vender 1 / 5 / Todas): cada cópia vale 1% do preço da arma (× estrelas) e fica sempre pelo menos 1. Só caem cópias de armas que já tens, e uma cópia <b>não desbloqueia</b> a arma: para a teres é preciso comprá-la.</p>`));

let gear = `<div class="scroll"><table><tr><th>Peça</th>${D.rar.map(r => `<th>${r[0]}</th>`).join('')}</tr>`;
for (const sl of ['head', 'chest', 'boots', 'amulet']) gear += `<tr data-s="${esc(D.slots[sl].toLowerCase())}"><td><b>${D.slots[sl]}</b></td>` + D.rar.map((r, i) => `<td>${img(`gear-${sl}-${i}.png`, 40)}<br><small>${esc(D.items[sl][i])}</small></td>`).join('') + '</tr>';
gear += '</table></div><p class="mut">Capacete e Armadura dão Vida, Botas dão Velocidade, Amuleto dá Dano. Cada raridade acrescenta um bónus aleatório; Lendário e Mítico podem ter efeito especial.</p>';
H.push(sec('equipamento', 'Equipamento', 'Guarda-se na Mochila (5 mochilas de 30 lugares: a 1.ª é grátis, a 2.ª custa 10 000 de ouro, a 3.ª 25 000 de ouro, a 4.ª 200 diamantes e a 5.ª 300 diamantes) e equipa-se no ecrã Personagem.', gear));

H.push(sec('encantos', 'Encantamentos e Bigorna', '',
  `<p><b>Refinar (equipamento)</b> até +10, +6% por nível. Chances: ${D.enc.map((c, i) => `+${i + 1}: ${c}%`).join(' · ')}.</p><p><b>Encantar especial:</b> ${D.spec.map(s => esc(s[1])).join(', ')}.</p><p><b>Bigorna (armas)</b> até +20. O dano sobe a cada nível e cada vez mais depressa: +12 = ×3,7 e +20 = ×6,4. O nível máximo que podes atingir é o teu nível ÷ 3 (por exemplo, +12 pede nível 36 e +20 pede nível 60). Chances: ${D.anvCh.map((c, i) => `+${i + 1}: ${c}%`).join(' · ')}.</p>`));

H.push(sec('progressao', 'Progressão', 'Nível máximo 120; cada nível dá +4 de vida, +1% de dano e 3 pontos de atributo. A partir do nível 40 o XP necessário cresce depressa (9% por nível até ao 70, 4% depois).',
  `<table><tr><th>Atributo</th><th>Efeito por ponto</th></tr>${D.attrs.map(a => `<tr data-s="${esc(a[1].toLowerCase())}"><td>${esc(a[1])}</td><td>${esc(a[2])}</td></tr>`).join('')}</table>
<h3>XP necessário para subir</h3><table><tr><th>Nível</th>${D.xp.map(x => `<th>${x[0]}</th>`).join('')}</tr><tr><td>XP</td>${D.xp.map(x => `<td>${x[1].toLocaleString('pt-PT')}</td>`).join('')}</tr></table>
<p class="mut">Aos sábados e domingos o XP e o ouro das missões são x2. Pontos de atributo também se compram com ouro (o preço sobe a cada ponto) e podes redistribuí-los por ouro.</p>`));

H.push(sec('recompensas', 'Recompensas por nível', 'Cada nível tem um prémio fixo, sempre o mesmo, que resgatas no Perfil › Recompensas (até ao nível 120). Podes resgatar um nível ou todos de uma vez. Não há baús nem sorte.',
  `<table><tr><th>Quando</th><th>Prémio</th></tr>
<tr><td>Todos os níveis</td><td>Ouro (100 + 45 por nível + 0,4 × nível²).</td></tr>
<tr><td>Níveis pares · múltiplos de 5 · múltiplos de 10</td><td>Pontos de atributo: 1 · 2 · 4.</td></tr>
<tr><td>Múltiplos de 5 · múltiplos de 10</td><td>Diamantes: 5 · 15.</td></tr>
<tr><td>De 4 em 4 níveis</td><td>1 Pedra de evolução (2 de 20 em 20); a raridade sobe com o nível (Comum até ao 24, Raro até ao 49, Épico até ao 74, Lendário até ao 99, Mítico a partir do 100).</td></tr>
<tr><td>De 5 em 5 níveis</td><td>Uma peça de equipamento (capacete, armadura, botas e amuleto à vez) <b>sempre do nível do prémio</b> (um item do nível 5 é nível 5); a raridade sobe com o nível.</td></tr>
<tr><td>Níveis 5, 15, 25…</td><td>Uma cópia de uma arma que já tenhas.</td></tr></table>
<h3>Primeiros níveis</h3><table><tr><th>Nível</th><th>Ouro</th><th>Pontos</th><th>◆</th><th>Pedra</th><th>Item</th></tr>${D.rewards.slice(0, 20).map((r, i) => `<tr><td>${i + 1}</td><td>${r.gold}</td><td>${r.pts || ''}</td><td>${r.gems || ''}</td><td>${r.stone ? r.stone.n + '× ' + D.rar[r.stone.r][0] : ''}</td><td>${r.item ? D.slots[r.item.slot] + ' (nv ' + r.item.il + ', ' + D.rar[r.item.r][0] + ')' : ''}</td></tr>`).join('')}</table>`));

H.push(sec('raids', 'Campanha e Raids', `Campanha: ondas infinitas, boss a cada 10 ondas e semi-boss a cada 5 (cada mapa tem o seu). Quando <b>concluis</b> a onda ${D.presWave[0]} de uma zona (no Abismo Final, a onda ${D.presWave[D.presWave.length - 1]}; matas o boss e sais pelo checkpoint; morrer ou sair a meio da onda não conta) podes dar <b>prestígio</b>: ganhas uma estrela (máx. 5 por zona), o progresso de ondas dessa zona volta a 0 e os monstros ficam mais fortes, com mais ouro e XP. Cada estrela sobe o nível recomendado em 10: o prestígio máximo do Abismo Final é nível 120. Com as 5 estrelas de um mapa podes escolher começar na onda ${D.farmStarts.filter(w => w > 1).slice(0, -1).join(", ")} ou ${D.farmStarts[D.farmStarts.length - 1]} (só até à tua melhor onda; as ondas saltadas não dão recompensas). Depois de cada boss podes sair e guardar tudo (na Floresta Sombria também depois de cada semi-boss, ou seja, nas ondas 5, 10, 15, 20...); sair a meio com Esc deixa só 30% e morrer deixa 40% do XP e 10% do ouro (os itens perdem-se). Raids: 4 ondas + boss, muito difíceis, com itens garantidos. O ouro das raids e o prémio de conclusão sobem com o nível recomendado da raid. Depois de uma raid podes carregar em <b>Refazer Raid</b> para a repetir logo.`,
  `<table><tr><th>Dificuldade</th><th>Vida</th><th>Dano</th><th>Ouro</th></tr>${D.raid.map(r => `<tr><td>${r.n}</td><td>×${r.hp}</td><td>×${r.dmg}</td><td>×${r.gold}</td></tr>`).join('')}</table>`));

const RW = ['Campanha, ondas 1 a 3', 'Raid Fácil · Campanha onda 8', 'Raid Normal · Campanha onda 16', 'Raid Difícil · Campanha onda 24+', 'Raid Pesadelo', 'Raid Inferno'];
H.push(sec('drops', 'Drops', 'O que pode cair e com que raridade. Lendário e Mítico são muito raros, mesmo nas raids.',
  `<table><tr><th>Origem</th><th>O que pode cair</th></tr>
<tr><td>Inimigos (Campanha e Raids)</td><td>Moedas (sempre), equipamento (1,2% + 0,1% por onda; +1,2% nas raids; os monstros fortes largam mais vezes e itens de nível mais alto), cópia de arma de uma arma que já tens (1,2%; +2% nas raids) e corações de vida (4%, curam 8% da vida máxima); as moedas e os corações desaparecem do chão ao fim de 30 a 45 segundos (piscam no fim).</td></tr>
<tr><td>Boss da Campanha (a cada 10 ondas)</td><td>1 peça de equipamento (no mínimo Raro), 1 cópia de arma e 8 moedas grandes.</td></tr>
<tr><td>Guardião Dourado (Campanha, nas ondas 41, 81, 121…)</td><td>Um boss gigante com muita vida que salta para cima de ti e gira a espada. Por enquanto não dá recompensas.</td></tr>
<tr><td>Semi-boss da Campanha (a cada 5 ondas)</td><td>1 peça de equipamento (rarefeita pelas probabilidades normais) e 40% de chance de uma cópia de arma.</td></tr>
<tr><td>Horda derrotada (a cada 10 ondas)</td><td>1 peça de equipamento (no mínimo Raro) e ouro ×1,5 durante a onda.</td></tr>
<tr><td>Raid vencida</td><td>Boss: 2 + dificuldade peças (no mínimo Raro, Épico a partir do Difícil), 1 + dificuldade ÷ 2 cópias de arma, ouro da raid e <b>pedras de evolução</b> (2 + raid ÷ 2; a raridade segue a dificuldade) e 1 a 5 diamantes (1 + dificuldade).</td></tr>
<tr><td>Recompensas por nível</td><td>Prémio fixo por nível (ver Recompensas por nível): ouro, pontos, diamantes, pedras, uma peça de equipamento do nível do prémio e cópias de arma.</td></tr></table>
<h3>Chance de raridade de cada peça</h3>
<table><tr><th>Situação</th>${D.rar.map(r => `<th>${r[0]}</th>`).join('')}</tr>${D.rarW.map((row, i) => `<tr><td>${RW[i]}</td>${row.map(v => `<td>${v}%</td>`).join('')}</tr>`).join('')}</table>
<p class="intro">Ordem de raridade: Comum, Raro, Épico, Lendário e Mítico. Os valores são por peça que cai, antes das garantias mínimas dos bosses.</p>`));
H.push(sec('pets', 'Pets', 'Companheiros que sobem de nível enquanto estão equipados, do nível 1 ao 30 (demora: são cerca de 43 000 de XP de pet no total, ganho com mobs e bosses). Cada pet pode ser renomeado por ◆50 a cada mudança e aparece ao teu lado no perfil do Ranking.',
  `<table><tr><th>Pet</th><th>Como obter</th><th>O que faz (melhora com o nível)</th></tr>
<tr><td>Cão</td><td>Grátis no separador Pets (nível 30).</td><td>Não causa dano. Enquanto estiver perto de ti: +6% de velocidade de movimento e +5% de velocidade de ataque no nível 1, até +8,9% e +7,5% no nível 30.</td></tr>
<tr><td>Galinha Bombista</td><td>¢50 000</td><td>Anda pelo mapa e apanha as moedas e os corações por ti. Enquanto anda, põe um ovo a cada 2 segundos (até 1,1 s no nível 30) que explode num raio pequeno, com 60% a 147% do teu dano.</td></tr>
<tr><td>Pássaro</td><td>¢65 000</td><td>Voa à tua volta e cura-te quando tens menos de 50% de vida: 0,4% da vida máxima por segundo no nível 1, até 1,1% no nível 30.</td></tr></table>
<p class="mut">XP do pet: 1 por mob, 12 por semi-boss, 25 por boss e 60 por Guardião Dourado.</p>`));
H.push(sec('guildas', 'Guildas', 'Sem chat: só progresso partilhado. Uma guilda sobe sozinha com o que os membros fazem no jogo e o líder escolhe as melhorias.',
  `<table><tr><th>Regra</th><th>Valor</th></tr>
<tr><td>Criar uma guilda</td><td>Nível 40, ¢15 000 e ◆100. O nome tem 3 a 16 letras, números ou espaços e a tag 2 a 4 letras ou números. Nomes com palavras ofensivas são recusados.</td></tr>
<tr><td>Entrar</td><td>Nível 10. Cada guilda tem até <b>10 membros</b>. Cada personagem (classe) da mesma conta entra à parte e ocupa uma vaga. Quem sai ou é expulso espera 24 horas para entrar ou criar outra.</td></tr>
<tr><td>Cargos</td><td>Líder e membros. Só o líder gasta pontos, expulsa e passa a liderança. Se o líder sair, passa para quem mais contribuiu; sem membros a guilda desaparece.</td></tr>
<tr><td>Pontos de guilda</td><td>Automáticos: 1 por mob, 10 por boss e 60 por raid concluída de qualquer membro (só conta o progresso que o servidor valida).</td></tr>
<tr><td>Personalização</td><td>O líder escolhe a <b>cor</b> (8), o <b>emblema</b> (12) e um <b>lema</b> de até 40 caracteres (filtrado). Aparecem no separador Guilda, no Ranking e no perfil; a tag ganha a cor da guilda.</td></tr>
<tr><td>Ranking de guildas</td><td>No Ranking há um separador <b>Guildas</b>. Clica numa guilda para ver o perfil público (nível, bónus, líder e membros); clicar num membro abre o perfil dele.</td></tr>
<tr><td>Nível da guilda</td><td>Vai até ao <b>40</b> e é lento: são cerca de 6 milhões de pontos no total. Cada nível dá 1 ponto de melhoria ao líder.</td></tr></table>
<h3>Melhorias (só o líder; cada uma sobe até ao nível 10)</h3>
<table><tr><th>Melhoria</th><th>Por nível</th><th>Máximo</th></tr>
<tr><td>Bónus de XP</td><td>+1%</td><td>+10%</td></tr>
<tr><td>Bónus de ouro</td><td>+1,5%</td><td>+15%</td></tr>
<tr><td>Chance de drop de equipamento</td><td>+0,25% (relativo)</td><td>+2,5%</td></tr>
<tr><td>Atributos</td><td>+0,5%</td><td>+5%</td></tr></table>
<p class="mut">A tag da guilda aparece junto ao teu nome no acampamento, no Ranking e no perfil público. Cada nível dá um ponto e as quatro melhorias precisam de 40 no total, por isso só uma guilda no nível 40 as tem todas no máximo.</p>`));
const CATN = { combat: 'Combate', prog: 'Progresso', farm: 'Farm', raid: 'Raids', gear: 'Equipamento' };
H.push(sec('conquistas', 'Conquistas e títulos', 'No separador Perfil › Conquistas. Cada conquista dá diamantes ◆ (25 fácil, 50 média, 75 difícil) e algumas dão um título. O título que escolheres (no Perfil ou em Conquistas › Títulos) aparece junto ao teu nome no acampamento, no Ranking e no teu perfil público. Há também títulos especiais por código promocional (cada código só se usa uma vez por conta).',
  Object.keys(CATN).map(c => `<h3>${CATN[c]}</h3><table><tr><th>Conquista</th><th>Objetivo</th><th>Prémio</th><th>Título</th></tr>${D.ach.filter(a => a.cat === c).map(a => `<tr data-s="${esc((a.name[0] + ' ' + a.desc[0]).toLowerCase())}"><td>${esc(a.name[0])}</td><td>${esc(a.desc[0])}</td><td>◆ ${a.gems}</td><td>${a.title ? esc(D.titles[a.title][0]) : ''}</td></tr>`).join('')}</table>`).join('')));
H.push(sec('mapas', 'Mapas e bosses', 'Cada mapa tem 6 monstros próprios (no Abismo Final aparecem todos), um semi-boss na onda 5 (e de 10 em 10 ondas a seguir) e o boss na onda 10. Cada mapa tem também a sua música, cada uma mais intensa que a anterior.', '<div class="grid">' + D.missions.map((m, i) => card(m.name + ' ' + m.boss.name + ' ' + m.semi.name, `<img src="docs/img/map-${i}.jpg" class="map" alt="" loading="lazy"><h3>${esc(m.name)}</h3><p class="mut">${esc(m.desc)}</p><p>Nível recomendado: <b>${D.recBase[i]}</b> (prestígio 1 a 5: ${[1, 2, 3, 4, 5].map(k => D.recBase[i] + 10 * k).join(', ')})</p><div class="row">${img(`boss-${m.semi.pal}.png`, 56)}<div><b>${esc(m.semi.name)}</b> <span class="mut">(semi-boss)</span><p class="mut">${[...new Set(m.semi.pattern)].map(x => PAT[x]).join(', ')}</p></div></div><div class="row">${img(`boss-${m.boss.pal}.png`, 64)}<div><b>${esc(m.boss.name)}</b> <span class="mut">(boss)</span><p class="mut">${[...new Set(m.boss.pattern)].map(x => PAT[x]).join(', ')}</p></div></div>`)).join('') + '</div>'));

H.push(sec('inimigos', 'Inimigos', 'Seis monstros por mapa. Os fracos aparecem mais vezes; os fortes largam mais vezes equipamento e de nível mais alto.', D.missions.map((m, i) => `<h3 class="cl">${esc(m.name)}${i === 5 ? ' (aparecem todos os monstros do jogo)' : ''}</h3><div class="grid">` + D.mobsByMap[i].map(id => { const e = D.enemies[id], md = D.mobs[id]; return card(md.n + ' ' + AID[md.a] + ' ' + m.name, `<div class="row">${img(`enemy-${id}.png`, 56)}<div><h3>${esc(md.n)}</h3><p class="mut">${AID[md.a]}</p><p>Vida base ${e.hp} · Dano base ${e.ai === 'shoot' ? '8 (projétil)' : e.dmg}${e.boom ? ' · explosão 14' : ''} · ¢${e.gold}</p></div></div>`); }).join('') + '</div>').join('')));


// Forca dos monstros: o mesmo calculo do jogo (hurt em js/60-mission.js e applyWave em js/90-equipment.js)
{
  const T = D.scale.tune, WV = [1, 10, 20, 30, 40, 50, 60, 80, 100];
  const mult = (w, s) => (1 + T.wDM * (w - 1)) * s.dm * T.eDmg * (1 + T.lDM * (s.rec - 1));
  const hitOf = lv => { const t = D.scale.hit; for (let i = 1; i < t.length; i++) if (lv <= t[i][0]) { const a = t[i - 1], b = t[i]; return a[1] + (b[1] - a[1]) * (lv - a[0]) / (b[0] - a[0]); } return t[t.length - 1][1]; }, nf = x => x >= 100 ? Math.round(x).toLocaleString('pt-PT') : x.toFixed(1).replace('.', ',');
  const ex = { s: D.scale.maps[4][5], w: 20 }, exB = 9 * mult(ex.w, ex.s) * hitOf(ex.s.rec);
  H.push(sec('forca', 'Força dos monstros', 'Quanto dano um monstro te tira em cada mapa, prestígio e onda da Campanha.',
`<h3>Como se calcula um golpe</h3>
<p><b>Dano = dano base do monstro × multiplicador da onda e do mapa × fator de nível × (1 − redução de dano)</b></p>
<ul>
<li><b>Dano base:</b> está em cada monstro, na secção Inimigos (a maioria tem 6 a 9; os tanques 18; os que investem 15; projéteis 8; explosões 14).</li>
<li><b>Multiplicador da onda e do mapa</b> (tabela abaixo): +5% por onda, e cresce com o <b>nível do mapa</b> (o nível recomendado, que sobe 10 a cada prestígio). Na Campanha conta o nível do mapa, não o teu.</li>
<li><b>Fator de nível:</b> cresce com o nível dos monstros (na Campanha, o nível do mapa; nas Raids e na Torre, o teu). <b>Não depende da tua vida</b>: quanto mais vida tens, mais golpes aguentas.</li>
<li><b>Redução de dano: conta até ${D.scale.drMax}%</b> (o Knight já tem ${T.dr.knight}% de base, incluído). O que passar dos ${D.scale.drMax}% vira vida: <b>+1% de vida máxima por cada 1% a mais</b> (no Personagem aparece "${D.scale.drMax}% MAX" e, no detalhe, quanto vira vida).</li>
<li>O escudo do Knight tira mais 60% ao golpe que já foi reduzido.</li>
</ul>
<h3>Fator de nível</h3><div class="scroll"><table><tr><th>Nível</th>${D.scale.hit.map(h => `<th>${h[0]}</th>`).join('')}</tr><tr><td>Fator</td>${D.scale.hit.map(h => `<td>×${nf(h[1])}</td>`).join('')}</tr></table></div>
<h3>Multiplicador da onda e do mapa</h3><p class="mut">Multiplica o dano base. Ex.: um monstro de dano base 9 com ×20 tira 180 antes da tua vida e da redução de dano. A linha "P0" é o mapa sem prestígios; cada prestígio (P1 a P5) sobe 10 níveis ao mapa.</p>
${D.missions.map((m, i) => `<h3 class="cl">${esc(m.name)}</h3><div class="scroll"><table><tr><th>Prestígio (nível do mapa)</th>${WV.map(w => `<th>Onda ${w}</th>`).join('')}</tr>` + D.scale.maps[i].map((s, P) => `<tr><td>P${P} (Nv ${s.rec})</td>${WV.map(w => `<td>×${nf(mult(w, s))}</td>`).join('')}</tr>`).join('') + '</table></div>').join('')}
<h3>Exemplo</h3><p>Serpente da Areia (dano base 9) no ${esc(D.missions[4].name)} com 5 prestígios (Nv ${ex.s.rec}), onda ${ex.w}: 9 × ${nf(mult(ex.w, ex.s))} × ${nf(hitOf(ex.s.rec))} = <b>${nf(exB)}</b> sem redução; com 60% de redução fica <b>${nf(exB * .4)}</b> por golpe, tenhas 3 000 ou 10 000 de vida.</p>
<p class="mut">Nas Raids e na Torre os monstros usam outros multiplicadores (dificuldade da raid e andar da Torre), mas o fator de nível e o limite de redução são os mesmos.</p>`));
}
H.push(sec('materiais', 'Pedras de evolução', 'Materiais que não se vendem (separador Mochila › Materiais). Há uma por raridade.',
  `<div class="grid">${['comum', 'rara', 'epica', 'lendaria', 'mitica'].map((n, i) => card('pedra de evolução ' + D.rar[i][0].toLowerCase(), `<div class="row">${img(`stone-${n}.png`, 56)}<div><h3>Pedra de evolução · ${D.rar[i][0]}</h3></div></div>`)).join('')}</div>
<table><tr><th>Como obter</th><th>Para que serve</th></tr>
<tr><td>Vencer raids (2 + raid ÷ 2 por vitória; a raridade segue a dificuldade) e nas recompensas por nível.</td><td>Evoluir o nível de um item da mesma raridade (+2 níveis de item por pedra, no separador Encantar) e desbloquear as estrelas das armas (ver Fusão).</td></tr></table>`));

H.push(sec('loadouts', 'Loadouts (builds)', 'No ecrã Personagem tens 3 builds. A 1.ª está sempre disponível, a 2.ª é grátis e a 3.ª custa 200 diamantes.',
  `<p>Cada build guarda os seus <b>atributos</b>, a <b>arma equipada</b>, o <b>equipamento</b> (capacete, armadura, botas, amuleto e anel), o <b>pet</b> e a <b>skin</b>. Uma build nova começa sem equipamento e sem pontos distribuídos: equipas o que tens na Mochila e distribuis os pontos. Os pontos de atributo ganhos são partilhados por todas as builds e os itens só estão numa build de cada vez. Só se troca de build no acampamento.</p>`));

H.push(sec('eventos', 'Eventos e missões diárias', 'Separador Eventos do acampamento.',
  `<h3>Fim de semana</h3><p>Aos <b>sábados e domingos</b> o XP e o ouro das missões e dos eventos são <b>x2</b>.</p>
<h3>Missões diárias</h3><p>3 por dia (mudam à meia-noite). Cada uma dá ouro (100 + 15 por nível) e 3 diamantes; se fizeres as 3 ganhas um bónus. Tipos: ${D.daily.map(p => esc(p.pt.replace(/\d+/, 'N'))).join(' · ')}. As conquistas <b>Dedicado I–VI</b> pedem 1, 5, 25, 50, 100 e 250 missões diárias.</p>
<h3>Evento: Estátua Dourada</h3><p>Uma estátua do Guardião Dourado, parada. Tens <b>${D.events[0].secs} segundos</b> para dar o máximo de dano: o ouro é o dano ÷ 33 (máx. ¢${D.events[0].goldCap.toLocaleString('pt-PT')}), x2 ao fim de semana. Só às <b>${['domingos','segundas','terças','quartas','quintas','sextas','sábados'][D.events[0].day]}</b>, <b>${D.events[0].tries} tentativas</b> nesse dia.</p>`));

H.push(sec('shop', 'Shop (Auto-Raid)', 'Separador Shop do acampamento.',
  `<p><b>Auto-Raid · ${D.ar.secs / 60} minutos · ${D.ar.cost} diamantes.</b> Escolhes uma raid que já concluíste e carregas em <b>Simular</b> (grátis): o jogo corre uma raid com o teu personagem (como se estivesses AFK) e vê quanto demora. Calcula quantas vezes a farias em ${D.ar.secs / 60} minutos e dás tudo de uma vez por ${D.ar.cost} diamantes: ouro, XP, itens e cópias de arma, com <b>-10%</b>. Não dá diamantes nem pedras.</p>
<p class="mut">Se a mochila encher, os itens a mais são vendidos automaticamente (o ecrã avisa antes). Estas raids não contam para o ranking de raids feitas, nem para os abates, as missões diárias ou os objetivos das armas. Se o personagem perder ou não acabar a raid simulada, não deixa comprar.</p>`));

const NAV = [['O jogo', [['classes', 'Classes'], ['armas', 'Armas'], ['fusao', 'Fusão'], ['equipamento', 'Equipamento'], ['encantos', 'Encantos e bigorna'], ['progressao', 'Progressão'], ['recompensas', 'Recompensas por nível'], ['materiais', 'Pedras de evolução'], ['loadouts', 'Loadouts']]],
  ['Combate', [['raids', 'Campanha e raids'], ['drops', 'Drops'], ['mapas', 'Mapas e bosses'], ['inimigos', 'Inimigos'], ['forca', 'Força dos monstros'], ['eventos', 'Eventos e missões'], ['shop', 'Shop (Auto-Raid)']]],
  ['Coleção', [['pets', 'Pets'], ['guildas', 'Guildas'], ['conquistas', 'Conquistas e títulos']]]];
const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wiki · Guardians of Gold</title>
<link rel="icon" href="docs/img/skin-knight-0.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Jersey+10&display=swap" rel="stylesheet">
<style>
:root{--bg:#0f0f1a;--panel:#16162a;--panel2:#1c1c34;--line:#2e2e4c;--line2:#22223a;--tx:#e6e6f0;--mut:#98a0b8;--gold:#f0c060;--blue:#9cc8ff;--px:'Jersey 10',system-ui,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}
img{image-rendering:pixelated}a{color:var(--blue)}
.bar{position:sticky;top:0;z-index:10;background:#0b0b14;border-bottom:2px solid var(--line);display:flex;align-items:center;gap:18px;padding:0 20px;height:54px}
.brand{font:400 26px/1 var(--px);color:var(--gold);letter-spacing:.02em;white-space:nowrap;text-decoration:none}.brand span{color:var(--mut);margin-left:8px}
.bar input{flex:1;max-width:420px;height:34px;padding:0 12px;border:2px solid var(--line);background:var(--panel);color:var(--tx);font:inherit;font-size:14px;outline:none}.bar input:focus{border-color:#6a5a2a}
.bar .play{margin-left:auto;font:400 20px/1 var(--px);color:#1a1208;background:var(--gold);padding:8px 16px;text-decoration:none;letter-spacing:.03em}.bar .play:hover{background:#ffd988}
.wrap{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1180px;margin:0 auto;gap:0 36px;padding:0 20px}
aside{position:sticky;top:54px;align-self:start;max-height:calc(100vh - 54px);overflow:auto;padding:24px 0 30px}
aside h4{margin:18px 0 6px;font:400 17px/1 var(--px);color:var(--mut);letter-spacing:.06em;text-transform:uppercase}aside h4:first-child{margin-top:0}
aside a{display:block;padding:5px 10px;margin:0 0 1px;border-left:3px solid transparent;color:#b8bed2;text-decoration:none;font-size:14px}aside a:hover{color:#fff;background:var(--panel)}aside a.on{color:var(--gold);border-left-color:var(--gold);background:var(--panel)}
.cls{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.cls button{flex:1 1 auto;padding:6px 8px;border:2px solid var(--line);background:var(--panel);color:#b8bed2;font:inherit;font-size:13px;cursor:pointer}.cls button.on{border-color:var(--gold);color:var(--gold)}
main{min-width:0;padding:28px 0 70px}
section{margin-bottom:46px;scroll-margin-top:72px}
h2{margin:0 0 14px;padding-bottom:8px;font:400 34px/1 var(--px);color:var(--gold);letter-spacing:.02em;border-bottom:2px solid var(--line)}
h3{margin:0 0 4px;font-size:15px;color:#fff}h3.cl{margin:22px 0 10px;font:400 22px/1 var(--px);color:var(--blue);letter-spacing:.03em}
p{margin:4px 0}.intro,.mut{color:var(--mut)}.intro{max-width:760px;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.card{background:var(--panel);border:2px solid var(--line);padding:12px}
.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:8px}.row:last-child{margin-bottom:0}
.row img{flex:none;background:#0c0c18;border:1px solid var(--line);padding:4px}
.map{display:block;width:100%;border:2px solid var(--line);margin-bottom:10px}
table{border-collapse:collapse;width:100%;font-size:14px;margin:4px 0 14px}
th{padding:8px 10px;text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);border-bottom:2px solid var(--line);white-space:nowrap}
td{padding:8px 10px;border-bottom:1px solid var(--line2);vertical-align:top}tbody tr:hover td,table tr:hover td{background:#14142a}
td small{color:var(--mut)}td img{vertical-align:middle}.scroll{overflow-x:auto}
.hide{display:none!important}#none{display:none;color:var(--mut);margin-top:20px}
footer{border-top:2px solid var(--line);color:var(--mut);font-size:13px;padding:20px;text-align:center}
@media(max-width:860px){.wrap{display:block;padding:0 14px}aside{position:static;max-height:none;padding:14px 0 0;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}aside h4{display:none}aside a{display:inline-block;border-left:0;border-bottom:3px solid transparent;padding:4px 2px}aside a.on{background:none}.cls{width:100%}.bar{padding:0 12px}.bar .play{padding:8px 10px}.brand span{display:none}h2{font-size:30px}}
</style></head><body>
<div class="bar"><a class="brand" href="#">GUARDIANS OF GOLD<span>WIKI</span></a><input id="q" type="search" placeholder="Pesquisar (arma, monstro, conquista...)"><a class="play" href="index.html">JOGAR</a></div>
<div class="wrap"><aside>${NAV.map(g => `<h4>${g[0]}</h4>${g[1].map(n => `<a href="#${n[0]}">${n[1]}</a>`).join('')}`).join('')}
<h4>Classe</h4><div class="cls"><button class="on" data-c="">Todas</button>${Object.keys(D.classes).map(k => `<button data-c="${k}">${D.classes[k].name}</button>`).join('')}</div></aside>
<main>${H.join('')}<p id="none">Sem resultados.</p></main></div>
<footer>Todos os números desta página são lidos diretamente dos ficheiros do jogo. Versão ${D.build} (BETA).</footer>
<script>
const q=document.getElementById('q');let cl='';
function f(){const t=q.value.trim().toLowerCase();let n=0;
document.querySelectorAll('[data-s]').forEach(e=>{const h=t&&!e.dataset.s.includes(t);e.classList.toggle('hide',h);if(!h)n++});
document.querySelectorAll('[data-cls]').forEach(e=>e.classList.toggle('hide',!!cl&&e.dataset.cls!==cl));
document.getElementById('none').style.display=t&&!n?'block':'none'}
q.oninput=f;document.querySelectorAll('.cls button').forEach(b=>b.onclick=()=>{cl=b.dataset.c;document.querySelectorAll('.cls button').forEach(x=>x.classList.toggle('on',x===b));f()});
const links=[...document.querySelectorAll('aside a')],secs=links.map(a=>document.querySelector(a.getAttribute('href')));
function spy(){let cur=0;secs.forEach((s,i)=>{if(s&&s.getBoundingClientRect().top<140)cur=i});links.forEach((a,i)=>a.classList.toggle('on',i===cur))}
addEventListener('scroll',spy,{passive:true});spy();
</script></body></html>`;
fs.writeFileSync(path.join(__dirname, '..', '..', 'wiki.html'), html);
console.log('wiki.html', html.length);
