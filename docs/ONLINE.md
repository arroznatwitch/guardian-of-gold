# Conta online, save na nuvem e ranking

Com o servidor configurado, o jogo passa a ser **100% online**:

- É preciso **conta (nick + palavra-passe)** para jogar.
- O **save vive na conta** (nuvem). Podes continuar no telemóvel ou noutro PC, e **Terminar sessão apaga o save local** do dispositivo.
- Há **ranking** de nível, mobs mortos, ouro, bosses, raids e recorde de waves por mapa.
- Na lista vês a **classe** de cada jogador e, ao clicar nele, o **perfil**: skin, arma (com +N e estrelas), atributos, equipamento e estatísticas.
- O jogo em si continua a correr no teu browser; o servidor guarda a conta, o save e o ranking.

O primeiro login envia para a conta o progresso que já tinhas neste dispositivo (se a conta já tiver um save, perguntamos qual manter). Este guia usa o **Supabase** (plano gratuito chega).

Se deixares `ONLINE_URL` vazio, o jogo funciona offline, sem contas nem ranking.

## 1. Criar o projeto

1. Cria uma conta em <https://supabase.com> e um projeto novo (escolhe uma região na Europa).
2. Abre **SQL Editor**, cola o conteúdo de [`server/supabase.sql`](../server/supabase.sql) e carrega em **Run**. Podes voltar a corrê-lo sempre que o ficheiro mudar (é idempotente): **corre-o antes de publicares uma versão nova do jogo** que dependa de funções novas.

## 2. Ligar o jogo

1. Em **Project Settings > API** copia o **Project URL** e a chave **anon / publishable**.
2. No `index.html`, procura esta linha e preenche-a:

```js
const ONLINE_URL = 'https://O-TEU-PROJETO.supabase.co', ONLINE_KEY = 'a-tua-chave-anon-ou-publishable';
```

A chave anon/publishable é pública por desenho e pode estar no código. **Nunca uses a `service_role` / `secret`.** Ela dá acesso total à base de dados.

## 3. Como a segurança funciona

| Ameaça | Defesa |
|---|---|
| Ver a palavra-passe | Nunca sai do dispositivo. O browser calcula PBKDF2-SHA256 (210 000 iterações, sal = nick) e só envia o resultado. |
| Fuga da base de dados | Guarda-se `bcrypt(custo 12)` desse resultado, com sal aleatório. Não há palavras-passe em claro nem emails. |
| Adivinhar palavras-passe | Bloqueio progressivo por conta depois de 5 falhas (30 s, 60 s, 2 min... até 1 h). |
| Descobrir que nicks existem | O login responde igual (e demora o mesmo) quer o nick exista ou não. |
| Roubo de sessão | Token aleatório de 256 bits; no servidor fica só o SHA-256. Expira em 30 dias e cada conta tem no máximo 5 sessões. |
| Acesso direto às tabelas | Ficam num schema privado (`gog`) que a API não expõe, com RLS ligado e sem permissões para `anon`. Só se chega aos dados pelas funções do SQL. |
| SQL injection | Funções com parâmetros tipados; os nomes de colunas vêm de uma lista fixa. |
| Save na nuvem | Só se grava com sessão válida e `rev` igual à do servidor (controlo de versão). Se a conta foi usada noutro dispositivo, o jogo pergunta qual save manter. Limite de 600 KB por save. |
| Perfil público | Só se mostram dados de jogo (skin, arma, atributos, equipamento e estatísticas). O servidor reconstrói a build com campos fixos e valores limitados; texto livre do cliente nunca é guardado. |
| Registos em massa | No máximo 30 registos de contas novas por 10 minutos (global). |
| Batota nas pontuações | Os valores só sobem, e cada envio só aceita aumentos plausíveis para o tempo passado. Saves que usaram trapaças locais não enviam. |
| XSS | Os nicks só aceitam letras, números e `_`, e são desenhados no canvas (nunca como HTML). |

O ficheiro [`server/test-sql.mjs`](../server/test-sql.mjs) testa estas regras (50 verificações) contra uma base de dados Postgres em memória:

```bash
cd server && npm i @electric-sql/pglite && node test-sql.mjs
```

## Perfil da conta: sexo e país

Ao criar a conta escolhe-se o **sexo** (Masculino ou Feminino) e o **país**. O sexo só muda o aspeto: cada skin tem uma versão feminina. O país aparece como **bandeira** no ranking, no perfil público e no cabeçalho do acampamento.

Os dois podem ser alterados em **Editar perfil** (clicando no boneco, no canto do acampamento). O **nick nunca muda**. A primeira bandeira é grátis; **mudar de bandeira custa 100 diamantes** (cobrados no jogo, como o resto da progressão). O servidor valida os valores (`m` ou `f`; código de país com 2 letras) e a função `gog_set_profile` só funciona com sessão válida.

## Vários personagens por conta (um por classe)

Uma conta pode ter **até 3 personagens, um por classe** (Cavaleiro, Arqueiro e Mago), cada um com **o seu nick, o seu save e o seu lugar no ranking**. O primeiro personagem é o principal e define a palavra-passe da conta: os outros entram com essa mesma palavra-passe (também se pode entrar com o nick de qualquer um deles).

- Cria-se e troca-se de personagem no separador **Perfil** do acampamento (ou no botão "Personagens" do menu).
- A **classe de um personagem fica fixa** a partir do primeiro save. O servidor recusa um save de outra classe (`wrong_class`) e recusa uma classe que a conta já usa (`class_taken`).
- O **sexo e o país** valem para a conta toda. Desativar um nick (`gog.set_active`) desativa a conta inteira, com todos os personagens.
- **Segurança do save:** antes de trocar, o personagem atual é guardado na nuvem (se falhar, a troca não acontece). O save do browser só é usado se pertencer ao personagem que entrou (id do personagem); o de outro personagem fica de lado e nunca passa para outro.

## Guildas

Sem chat. Uma guilda tem no máximo 10 membros e só há líder e membros. Para criar é preciso nível 40, 15 000 de ouro e 100 diamantes (o servidor confere o ouro e os diamantes no save guardado na nuvem; o jogo desconta-os a seguir). Para entrar basta nível 10, e quem sai ou é expulso espera 24 horas.

- **Pontos automáticos:** cada gravação de save validada pelo anti-batota dá à guilda 1 ponto por mob, 10 por boss e 60 por raid concluída do membro. O nível vai até 40 (cerca de 6 milhões de pontos no total) e cada nível dá 1 ponto de melhoria ao líder.
- **Melhorias** (só o líder, cada uma até ao nível 10): XP +1% por nível (máx. +10%), ouro +1,5% (máx. +15%), chance de drop +0,25% relativo (máx. +2,5%) e atributos +0,5% (máx. +5%). O jogo aplica estes valores lidos do servidor; não ficam no save.
- **Nomes:** o filtro `gog._text_ok` recusa palavras ofensivas em inglês e português (troca números e símbolos por letras e junta letras repetidas). Aplica-se a nomes e tags de guildas, aos nomes dos pets e aos nicks novos. Para ver as guildas: `select * from gog.guilds;`. Para desfazer uma guilda: `delete from gog.guilds where id = 1;`.

## Pets no perfil público

A build pública inclui o pet equipado (`build.pet`: `dog`, `chicken` ou `bird`, nível 1 a 30 e nome). O servidor só aceita esses três ids, limita o nível a 30 e remove do nome tudo o que não seja letras, números, espaço, `_` ou `-` (máximo 12 caracteres). Um pet acima do nível 30 num save conta como valor impossível (anti-batota).

## Anti-batota (o servidor valida o save)

Cada vez que o jogo guarda na nuvem (`gog_save_put`), o servidor confere o save antes de o aceitar:

- **Saltos impossíveis** face ao save anterior, tendo em conta o tempo passado: nível, mobs, bosses, ouro, ouro gasto, diamantes, ondas, raids, fusões, prestígio.
- **Diamantes**: só podem subir por subir de nível (a cada 10), abrir baús, receber conquistas (máx. 75 cada) e pelo código promocional.
- **Conquistas**: cada conquista nova tem de ser justificada pelo próprio save (por exemplo, `kills10000` exige 10 000 mobs mortos).
- **Títulos**: só se aceita um título que venha de uma conquista recebida (ou o `beta`, se o código foi usado). O título mostrado no Ranking vem do save verificado, nunca do pedido de ranking.
- Uma conta nova só pode começar com um personagem novo (nível 1 ou 2, ouro e diamantes quase a zero).

O que acontece:

- O save é **recusado** (o jogo mostra um aviso e tenta outra vez ao fim de 1 minuto: se foi um falso alarme, passa quando o tempo permitir o salto).
- Fica uma linha em `gog.violations`. Repetições seguidas em menos de 10 minutos contam como uma só.
- Valores **impossíveis** (mais de 1 000 000 de ouro, mais de 60 000 diamantes, nível acima de 400, ondas acima de 2000...) **desativam a conta logo**. Nos outros casos, a **3.ª ocorrência** desativa a conta (todos os personagens).

Para ver as ocorrências e reativar uma conta desativada por engano, no SQL Editor:

```sql
select v.at, p.nick, v.kind from gog.violations v join gog.players p on p.id = v.root order by v.at desc limit 50;
select gog.set_active('nick', true);   -- reativa
delete from gog.violations where root = (select id from gog.players where nick_key = lower('nick'));   -- limpa o historico
```

Limites: quem altera os valores aos poucos, ou só durante a sessão (por exemplo, vida e dano na consola), não é apanhado. A vida e o dano do combate não passam pelo servidor.

## Códigos promocionais e títulos

Os códigos vivem na tabela `gog.promo` (código, diamantes e título) e são validados no servidor por `gog_redeem`. Cada código só se usa **uma vez por conta** (os personagens extra partilham o uso do principal). O código `beta` dá o título **Beta Tester** e 10 diamantes. Para criar outro código:

```sql
insert into gog.promo (code, gems, title) values ('meucodigo', 25, null);
```

O título escolhido vai na build pública (`build.title`, só um código curto) e aparece no Ranking e no perfil público.

## O save local pertence a uma conta

O save guardado no browser fica ligado ao **id da conta** (`uid`), não ao nick. Se entrares com **outra conta** (ou criares uma conta nova, mesmo com o mesmo nick depois de a base de dados ser limpa), o save antigo **não é usado**: fica guardado à parte (`bladehunter_orphan`) e a conta nova começa com um personagem novo. Além disso, o servidor só aceita como primeiro save de uma conta um **personagem novo** (nível 1 ou 2, com muito pouco ouro). Assim ninguém leva o progresso de uma conta para outra.

## Desativar e reativar contas (administrador)

Os jogadores **não podem apagar a conta**. Uma conta nunca é eliminada: fica **inativa** e pode ser reativada. Uma conta inativa não consegue entrar (mesmo com a palavra-passe certa), as sessões abertas deixam de valer, desaparece do ranking e dos perfis e o nick continua reservado.

No **SQL Editor** do Supabase:

```sql
select gog.set_active('nick_do_jogador', false);  -- desativar (por exemplo, conta roubada)
select gog.set_active('nick_do_jogador', true);   -- reativar
```

Devolve `deactivated`, `reactivated` ou `not_found`. A função só existe no schema privado `gog`, por isso o jogo e a chave pública não a conseguem chamar. A função antiga `gog_delete` é removida quando corres o `server/supabase.sql`.

## 4. Limites que convém saber

- **Contas por rede:** no máximo **5 contas por IP**. O servidor usa o cabeçalho `cf-connecting-ip` (ou o último `x-forwarded-for`) e guarda apenas um HMAC do IP, nunca o IP em claro. Apagar uma conta liberta a vaga. Quem está atrás da mesma rede (casa, escola) partilha o limite.
- **Backups:** ver `docs/BACKUP.md`.

- **"Impossível de hackear" não existe.** Esta combinação protege bem contra os ataques comuns, mas a segurança final depende também de palavras-passe fortes. O jogo exige 8 a 64 caracteres.
- **Não há recuperação de palavra-passe** (não guardamos emails). Quem a perder cria outra conta.
- **Batota:** o jogo corre no browser do jogador. O save na nuvem é o que o browser envia, por isso quem souber mexer em pedidos pode alterar o próprio save. O ranking tem limites de plausibilidade, mas só um servidor que corresse o jogo todo evitava a batota por completo.
- **Sem internet não se joga** (com o servidor configurado). O progresso recente é guardado no dispositivo e enviado quando a ligação voltar.
- **Plano gratuito:** o Supabase pausa projetos sem atividade durante cerca de 7 dias. Basta reativar no painel.
- Os registos da API do Supabase podem guardar endereços IP. O jogo em si não guarda IP, email nem dados pessoais: só nick, hash, o save do jogo e as estatísticas.

## 5. Moderação

No **SQL Editor**:

```sql
-- apagar uma conta (e as sessões dela)
delete from gog.players where nick_key = 'nick_em_minusculas';
-- ver os últimos registos
select nick, created_at, level from gog.players order by created_at desc limit 20;
```
