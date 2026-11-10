# Ranking online (opcional)

O jogo funciona totalmente sem servidor. Se quiseres um **ranking online** (nível, mobs mortos, ouro, bosses, raids e recorde de waves por mapa), é preciso um pequeno servidor. Este guia usa o **Supabase** (plano gratuito chega).

Enquanto não configurares nada, o separador **Ranking** do jogo limita-se a dizer que o servidor não está ligado.

## 1. Criar o projeto

1. Cria uma conta em <https://supabase.com> e um projeto novo (escolhe uma região na Europa).
2. Abre **SQL Editor**, cola o conteúdo de [`server/supabase.sql`](../server/supabase.sql) e carrega em **Run**. Corre-o uma só vez.

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
| Registos em massa | No máximo 30 registos de contas novas por 10 minutos (global). |
| Batota nas pontuações | Os valores só sobem, e cada envio só aceita aumentos plausíveis para o tempo passado. Saves que usaram trapaças locais não enviam. |
| XSS | Os nicks só aceitam letras, números e `_`, e são desenhados no canvas (nunca como HTML). |

O ficheiro [`server/test-sql.mjs`](../server/test-sql.mjs) testa estas regras (30 verificações) contra uma base de dados Postgres em memória:

```bash
cd server && npm i @electric-sql/pglite && node test-sql.mjs
```

## 4. Limites que convém saber

- **"Impossível de hackear" não existe.** Esta combinação protege bem contra os ataques comuns, mas a segurança final depende também de palavras-passe fortes. O jogo exige 8 a 64 caracteres.
- **Não há recuperação de palavra-passe** (não guardamos emails). Quem a perder cria outra conta.
- **Batota:** o jogo corre no browser do jogador, por isso quem souber mexer em pedidos consegue enviar valores *plausíveis* mas falsos. Só um servidor que corresse o jogo todo evitava isso.
- **Plano gratuito:** o Supabase pausa projetos sem atividade durante cerca de 7 dias. Basta reativar no painel.
- Os registos da API do Supabase podem guardar endereços IP. O jogo em si não guarda IP, email nem dados pessoais: só nick, hash, classe e estatísticas.

## 5. Moderação

No **SQL Editor**:

```sql
-- apagar uma conta (e as sessões dela)
delete from gog.players where nick_key = 'nick_em_minusculas';
-- ver os últimos registos
select nick, created_at, level from gog.players order by created_at desc limit 20;
```
