# Backups da base de dados

O plano gratuito do Supabase não faz backups automáticos. Este repositório tem um workflow do GitHub Actions (`.github/workflows/backup.yml`) que **todos os dias às 03:17 UTC** faz uma cópia do schema `gog` (contas, saves, ranking), **encripta-a** e guarda-a durante **30 dias**.

## Configurar (uma vez)

1. No Supabase abre **Connect** e copia o endereço **Session pooler** (o direto só funciona por IPv6 e o GitHub não tem IPv6). Substitui `[YOUR-PASSWORD]` pela palavra-passe da base de dados.
2. No GitHub: **Settings → Secrets and variables → Actions → New repository secret** e cria:
   - `SUPABASE_DB_URL` com esse endereço completo;
   - `BACKUP_PASSPHRASE` com uma frase longa que só tu sabes. **Guarda-a num gestor de palavras-passe**: sem ela não consegues abrir os backups.
3. **Actions → Backup → Run workflow** para testar. O ficheiro aparece em *Artifacts* no fim da execução.

Nunca coloques a palavra-passe da base de dados no código nem em ficheiros do repositório: só nos *secrets*.

## Porque é encriptado

O repositório é público e os artifacts podem ser descarregados por quem tenha acesso de leitura. O dump contém os hashes das palavras-passe, por isso nunca é guardado em claro.

## Restaurar

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in gog-20260101.dump.enc -out gog.dump
pg_restore --no-owner --clean --if-exists -d "<endereco da base de dados>" gog.dump
```

Corre primeiro `server/supabase.sql` numa base nova (cria o schema e as funções) e depois o `pg_restore` só dos dados, se preferires: `pg_restore --data-only --schema=gog ...`.

Como o workflow liga à base de dados todos os dias, serve também para o projeto não ser pausado por inatividade.
