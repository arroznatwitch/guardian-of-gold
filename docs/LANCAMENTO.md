# Lançamento público: o que há e o que falta fazer

## Ordem dos scripts no Supabase (SQL Editor)
1. `server/update-security.sql`
2. `server/update-server-shop.sql`
3. `server/update-security2.sql`
4. `server/update-launch.sql` (relatos, estatísticas e moderação)
5. Torna-te administrador (o nick em minúsculas): `insert into gog.admins (nick_key) values ('o_teu_nick') on conflict do nothing;`
6. Uma semana depois de toda a gente atualizar: `server/enforce-server-shop.sql`

Todos são idempotentes (podes correr duas vezes).

## O que foi acrescentado
- **Privacidade e termos:** `privacy.html` e `terms.html` (PT e EN), aviso de dados guardados na primeira visita e ligações no menu e nas opções.
- **Painel de moderação:** `admin.html` (violações, relatos, contas desativadas, estatísticas, procurar jogador, desativar/reativar, repor save, apagar progresso, apagar conta para RGPD). O servidor confere sempre a sessão de administrador.
- **Telemóvel:** joystick à esquerda, botões de esquiva/habilidade/especial/pausa à direita, ataque e mira automáticos, menus por toque e teclado do sistema nos campos de texto. Aviso para rodar o ecrã.
- **Arranque:** ecrã «A carregar» e, se um ficheiro falhar ou o jogo não arrancar em 25 s, uma mensagem com botão para recarregar.
- **Reportar problema:** nas Opções e no menu. O jogador escolhe o que envia.
- **Estatísticas anónimas:** contadores por dia (abertura, login, missão, etc.), sem identificadores; respeita «Do Not Track».
- **Pasta limpa:** os ficheiros de trabalho foram para `_arquivo/` (ignorada pelo Git).

## O que tens de rever tu
- Lê `privacy.html` e `terms.html`: são um modelo baseado no que o jogo faz hoje, não aconselhamento jurídico. O contacto é o GitHub (issues); se preferires um email, troca no texto.
- Liga os backups no Supabase.
- Se um dia vendares algo, atualiza os termos (hoje dizem que o jogo não vende nada).
- O tipo de letra vem do Google Fonts (a Google vê o IP). Se quiseres evitar isso, hospeda a fonte no próprio site.
