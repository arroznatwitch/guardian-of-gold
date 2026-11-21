# Publicar uma versão nova

Fazes merge no `main` e a GitHub Action **Deploy** (`.github/workflows/deploy.yml`) trata do resto:

1. **Testes:** confirma que a versão é igual em `js/00-core.js`, no `index.html` e no `version.json`, e corre os testes SQL (`server/test-sql.mjs`, também com as migrações).
2. **Migrações:** aplica no Supabase as migrações de `server/migrations/` que ainda não correram. Cada uma corre numa transação e fica registada em `gog.migrations`.
3. **Site:** publica no GitHub Pages.

Se o passo 1 ou o 2 falharem, o site **não** é publicado. Assim nunca fica um jogo novo com um servidor velho.

Os jogadores que estão no acampamento, no menu ou nas opções recebem a versão nova em cerca de 2 minutos: o jogo vê o `version.json`, grava e recarrega sozinho. A meio de uma missão espera que voltes ao acampamento.

## Configurar (uma vez)

1. **Secret `SUPABASE_DB_URL`** (o mesmo do backup, ver `docs/BACKUP.md`): GitHub → Settings → Secrets and variables → Actions.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions** (em vez de "Deploy from a branch").

## Mudar o servidor (SQL)

- Cria um ficheiro novo em `server/migrations/` com o número seguinte: `006-o-que-muda.sql` (só minúsculas, números e hífens).
- Escreve-o para poder correr mais do que uma vez sem estragar nada (`create or replace`, `if not exists`...).
- Faz a mesma mudança no `server/supabase.sql`, que é a base completa para uma instalação nova.
- Uma migração que já correu **nunca** se edita: faz uma nova.
- Para alterar uma função que outros patches também mudaram (ex.: `gog_save_put`), injeta só a linha nova com `pg_get_functiondef` + `replace`, como em `005-min-build.sql`.

## Obrigar toda a gente a usar a versão nova

Numa migração:

```sql
update gog.config set v = '81' where k = 'min_build';
```

O servidor passa a recusar saves de versões mais antigas com `update`, e o jogo recarrega logo para a versão nova. Usa isto quando uma mudança do servidor não funciona com o jogo antigo (por exemplo, os `enforce-*.sql`): já não precisas de esperar que toda a gente atualize.

## Versão nova do jogo

Sobe o número em três sítios: `GAME_BUILD` em `js/00-core.js`, todos os `?v=` do `index.html` e o `version.json`. Confirma com `node tools/check-build.js`.
