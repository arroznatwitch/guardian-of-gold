<div align="center">

<img src="docs/img/logo.svg" width="72" alt="Logo">

# Guardians of Gold

Jogo de ação e RPG em pixel-art que corre no browser, sem instalação.

[Jogar](https://arroznatwitch.github.io/guardian-of-gold/) &nbsp;·&nbsp; [Wiki](https://arroznatwitch.github.io/guardian-of-gold/wiki.html) &nbsp;·&nbsp; [Documentação online](docs/ONLINE.md)

![Versão](https://img.shields.io/badge/versão-1.3--BETA-555?style=flat-square)
![Tecnologia](https://img.shields.io/badge/HTML%20%7C%20JavaScript%20%7C%20Canvas-555?style=flat-square)
![Dependências](https://img.shields.io/badge/dependências-nenhuma-555?style=flat-square)

<br>

<img src="docs/img/menu.jpg" width="760" alt="Ecrã inicial do Guardians of Gold">

</div>

<br>

## Visão geral

O jogador escolhe uma classe e alterna entre dois modos: **Campanha**, com ondas infinitas de inimigos para ganhar nível, ouro e equipamento, e **Raids**, combates contra bosses de dificuldade crescente. A progressão assenta em equipamento, armas e atributos, e há uma conta opcional com save na nuvem e ranking.

O jogo é um único ficheiro HTML. Os gráficos são desenhados por código e a música é sintetizada em tempo real, pelo que não há imagens, sons nem bibliotecas externas.

<p align="center">
  <img src="docs/img/screen-character.jpg" width="32%" alt="Personagem">
  <img src="docs/img/screen-weapons.jpg" width="32%" alt="Armas">
  <img src="docs/img/screen-enchant.jpg" width="32%" alt="Encantamentos">
</p>

## Funcionalidades

- **Três classes** (Cavaleiro, Arqueiro e Mago), cada uma com uma habilidade especial e cinco armas com habilidades próprias.
- **Campanha** com ondas infinitas, um semi-boss a cada 5 ondas, um boss e uma horda a cada 10 e seis mapas que se desbloqueiam por progressão. Em cada mapa, ao chegares à onda 30, podes dar **prestígio** (até 5 estrelas): os monstros ficam mais fortes e o nível recomendado sobe 10 por estrela, até ao nível 120 no Abismo Final.
- **Raids** com seis bosses e cinco dificuldades, até ao Inferno. Cada dificuldade abre depois de concluídas todas as raids da anterior.
- **Equipamento** em quatro ranhuras e cinco raridades, com refino, encantamentos especiais e evolução por pedras obtidas em raids.
- **Armas** melhoráveis na Bigorna (até +12) e por Fusão (até 3 estrelas).
- **Contas online** com save na nuvem, ranking por categoria e perfis públicos.
- **Idiomas:** Português (Portugal) e English (UK).

## Como jogar

Abre o jogo em [arroznatwitch.github.io/guardian-of-gold](https://arroznatwitch.github.io/guardian-of-gold/) ou, para correr localmente, descarrega o repositório e abre o `index.html` num browser atual (Chrome, Edge ou Firefox).

| Ação | Controlo |
|---|---|
| Mover | `W` `A` `S` `D` ou setas |
| Atacar | Rato ou `Espaço` |
| Especial da classe | `Q` ou botão direito |
| Habilidade da arma | `E` |
| Esquiva | `Shift` |
| Auto-ataque / Velocidade x2 / Pausa | `T` / `G` / `Esc` |

As teclas podem ser alteradas em **Opções > Teclas**.

## Estrutura do repositório

| Caminho | Descrição |
|---|---|
| `index.html` | O jogo completo. |
| `wiki.html` | Wiki estática com armas, equipamento, raids e inimigos. |
| `docs/` | Guias: [`ONLINE.md`](docs/ONLINE.md) (contas, save e ranking) e [`BACKUP.md`](docs/BACKUP.md) (backups). |
| `server/` | Esquema SQL do servidor (Supabase) e respetivos testes. |
| `tools/` | Simulador com bot usado para afinar o equilíbrio. |
| `.github/workflows/` | Backup diário encriptado da base de dados. |

## Estado do projeto

O jogo encontra-se em **beta**. O equilíbrio continua a ser ajustado e podem existir erros. Problemas e sugestões podem ser reportados em [Issues](https://github.com/arroznatwitch/guardian-of-gold/issues).
