<div align="center">

<img src="docs/img/menu.jpg" width="720" alt="Guardians of Gold">

# Guardians of Gold

**RPG de ação em pixel-art, direto no browser.**<br>
Farma ondas infinitas, vence raids brutais e constrói o teu guardião.

<a href="https://arroznatwitch.github.io/guardian-of-gold/"><img src="https://img.shields.io/badge/▶%20JOGAR%20AGORA-f5c542?style=for-the-badge&labelColor=1b1b2f&color=f5c542" alt="Jogar agora"></a>
&nbsp;
<a href="https://arroznatwitch.github.io/guardian-of-gold/wiki.html"><img src="https://img.shields.io/badge/WIKI-5aa8ff?style=for-the-badge&labelColor=1b1b2f&color=5aa8ff" alt="Wiki"></a>

<img src="https://img.shields.io/badge/versão-1.3--BETA-b06aff?style=flat-square&labelColor=1b1b2f" alt="Versão 1.3-BETA">
<img src="https://img.shields.io/badge/HTML%20%C2%B7%20JS%20%C2%B7%20Canvas-sem%20depend%C3%AAncias-4cc46a?style=flat-square&labelColor=1b1b2f" alt="Sem dependências">
<img src="https://img.shields.io/badge/PT--PT%20%C2%B7%20EN--UK-idiomas-ff9a2a?style=flat-square&labelColor=1b1b2f" alt="Idiomas">

</div>

<br>

## O jogo

Escolhe uma classe, entra no acampamento e decide como queres jogar: **Farm** infinito para subir de nível e juntar equipamento, ou **Raids** contra bosses cada vez mais exigentes. Tudo é pixel-art desenhada por código e a música é sintetizada no momento, por isso o jogo inteiro cabe num único ficheiro e não precisa de instalação.

<p align="center">
  <img src="docs/img/screen-character.jpg" width="32%" alt="Personagem">
  <img src="docs/img/screen-weapons.jpg" width="32%" alt="Armas">
  <img src="docs/img/screen-enchant.jpg" width="32%" alt="Encantar">
</p>

## Destaques

| | |
|---|---|
| **3 classes** | Cavaleiro, Arqueiro e Mago, cada um com especial próprio e 5 armas com habilidades únicas. |
| **Farm infinito** | Ondas que crescem sem parar, um boss a cada 5 e uma horda a cada 10, em 6 mapas que se desbloqueiam a progredir. |
| **Raids** | 6 bosses em 5 dificuldades, até ao Inferno. Cada dificuldade só abre depois de vencer todas as anteriores. |
| **Equipamento** | 4 peças em 5 raridades, com refino, encantamentos especiais e evolução por pedras. |
| **Armas** | Bigorna até +12 e Fusão até 3★ para melhorar dano e habilidades. |
| **Conta online** | Save na nuvem, ranking por categorias e perfis públicos com a build de cada jogador. |

<p align="center">
  <img src="docs/img/map-0.jpg" width="15%" alt=""> <img src="docs/img/map-1.jpg" width="15%" alt=""> <img src="docs/img/map-2.jpg" width="15%" alt=""> <img src="docs/img/map-3.jpg" width="15%" alt=""> <img src="docs/img/map-4.jpg" width="15%" alt=""> <img src="docs/img/map-5.jpg" width="15%" alt="">
</p>

## Classes

| | Classe | Estilo |
|:---:|---|---|
| <img src="docs/img/skin-knight-0.png" width="48" alt=""> | **Cavaleiro** | Tanque corpo-a-corpo: muita vida, golpes pesados e menos dano recebido. |
| <img src="docs/img/skin-archer-0.png" width="48" alt=""> | **Arqueiro** | Ataque à distância, rápido e ágil, mas frágil. |
| <img src="docs/img/skin-mage-0.png" width="48" alt=""> | **Mago** | Magia com efeitos especiais: fogo, gelo, raios, arcano e sombra. |

## Controlos

| | |
|---|---|
| **Mover** | `W` `A` `S` `D` ou setas |
| **Atacar** | rato ou `Espaço` |
| **Especial da classe** | `Q` ou botão direito |
| **Habilidade da arma** | `E` |
| **Esquiva** | `Shift` |
| **Auto-ataque · Velocidade x2 · Pausa** | `T` · `G` · `Esc` |

Podes mudar todas as teclas em **Opções > Teclas**.

## Jogar

- **Online:** <https://arroznatwitch.github.io/guardian-of-gold/>
- **Localmente:** descarrega o repositório e abre o `index.html` no Chrome, Edge ou Firefox.

O jogo está em **beta**: podem existir bugs e o equilíbrio ainda vai mudar. Se encontrares algo, abre uma *Issue*.

## Para quem quer mexer

| | |
|---|---|
| [`index.html`](index.html) | O jogo inteiro (HTML, CSS e JavaScript puros, em canvas). |
| [`wiki.html`](wiki.html) | Wiki com armas, equipamento, raids e inimigos, com pesquisa. |
| [`docs/ONLINE.md`](docs/ONLINE.md) | Como ligar as contas, o save na nuvem e o ranking (Supabase). |
| [`docs/BACKUP.md`](docs/BACKUP.md) | Backups diários encriptados da base de dados. |
| [`server/`](server) | SQL do servidor e os seus testes. |
| [`tools/balance-sim.js`](tools/balance-sim.js) | Simulador com um bot para afinar o equilíbrio. |

<br>

<div align="center">

Feito com carinho, sem frameworks nem dependências.

</div>
