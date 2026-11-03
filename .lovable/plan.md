# Revisão crítica — Etapa 5a (somente leitura, nada foi alterado)

Este documento é a revisão pedida, não um plano de execução. Aprovar não dispara nenhuma mudança.

## 1. Algo impede publicar as telas agora?

Não encontrei bloqueio.

- **Certeza:** `types.ts` já tem `red_flags_version`, `clear_quick_session_red_flags` e os outros RPCs; as telas novas chamam só funções que existem no banco (M1 aplicada).
- **Certeza:** `redFlagGate.ts` é puro (sem imports Deno/URL) e tem teste em `tests/domain/redFlagGate.test.ts`. A função no ar responde 401 sem token, como esperado.
- **Suposição:** build OK. O log de build não registra nenhuma entrada nesta sessão, e eu não rodei o build.
- **Janela entre publicar e aplicar a M2 (certeza):** nessa janela, a trava do protocolo rápido existe só na tela. A M1 só calcula a versão (`quick_session_red_flags_version`, linhas 403-424). Isso é coerente com o desenho, mas é uma janela real.

## 2. Algum caminho para gerar ou salvar protocolo com red flag sem liberação?

**Avaliação completa — não encontrei caminho (certeza, pela leitura):**
- Geração: `generate-protocol/index.ts:308` consulta `assessment_red_flag_status` com o token do próprio usuário. Sem `assessmentId` a resposta é 400, sem ser o dono é 403, com bloqueio é 409. A IA não é chamada nesses casos.
- Gravação: `save_assessment_protocol` trava a avaliação e depois a anamnese com `FOR UPDATE` (M1, linhas 208-245). `guard_protocol_write` só deixa o dono da tabela gravar e confere de novo (linhas 299-330). `functional_findings` não aceita escrita de cliente.
- Versionamento: uma flag nova gera uma versão nova, e a liberação vale só para a sua versão. Desmarcar uma flag não reabre a liberação antiga para outra flag.
- Cache em `assessment_drafts` (step `protocol`): só aparece depois de reler o status (`ProtocolGenerator.tsx:186-193` e `348-355`). Ressalva: esse cache é escrito pelo cliente. Ele serve só para exibir; salvar continua travado no banco.

**Protocolo rápido:**
- Antes da M2, `status='completed'` e `intervention_applied` são gravados sem nenhuma checagem no banco (`QuickProtocolWizardV2.tsx:272-284`, `QuickProtocolWizard.tsx:220`). Um cliente antigo ainda em cache, ou uma chamada direta à API, completa uma sessão com flag. A M2 fecha isso.
- Depois da M2, o fluxo fica fechado. A trigger única calcula a versão e aplica a regra na mesma linha (M2, linhas 21-56).

**Fora do escopo, mas vale saber (suposição):** `analyze-movement` não tem trava de red flag. Ela não gera protocolo, mas gasta IA em aluno com flag não liberada. No protocolo rápido isso não acontece, porque a liberação vem antes da captura.

## 3. Experiência do profissional

1. **Anamnese depois de concluir (certeza):** `guard_anamnesis_red_flags` recusa editar a anamnese de avaliação concluída. O único lugar que grava a anamnese é `AnamnesisWizard.tsx:341` (upsert). Se o profissional reabrir o wizard numa avaliação concluída, ele recebe um erro genérico de salvar. Sugestão: modo leitura ou mensagem clara.
2. **Triagem rápida com falha na liberação (certeza):** `startQuickSession.ts` cria a sessão e depois chama `clear_quick_session_red_flags`. Se essa chamada falhar, a sessão fica `in_progress` com a flag ativa e a tela volta ao cartão. O reaproveitamento por `sessionId` resolve o caso. Mas, se o profissional fechar nesse momento, fica uma sessão órfã em andamento.
3. **Cartão de liberação** (`RedFlagClearance.tsx:27`): o título "Red flags na anamnese — ..." fica longo com várias flags. Sugestão: título curto e flags em chips, no mesmo padrão da triagem. O contador de caracteres não aparece: o profissional só sabe que faltam caracteres porque o botão fica desabilitado.
4. **Sem confirmação antes de liberar:** "Liberar e gerar protocolo" grava uma liberação imutável e dispara uma geração paga em um clique. Considerar um passo de confirmação.
5. **Revogação só no fluxo completo:** no protocolo rápido não há revogação na tela. O banco permite (`revoke_red_flag_clearance`). Pode ser intencional.
6. **Pré-existente, fora da 5a:** `ProtocolGenerator.tsx:153` usa o emoji 💡, contra a regra do projeto de usar só ícones Lucide.
7. **Contagem de caracteres (certeza):** `justificationOk` conta code points e apara os mesmos caracteres que o servidor (`btrim` de espaço, \t, \r, \n). Está consistente.

## 4. Risco de aplicar a M2 depois de publicar

- **Dono das funções (certeza):** `red_flags_cleared` pertence a `postgres`. A precondição da M2 exige `current_user` = dono. As migrações daqui rodam como esse papel, e a M1 passou pela mesma checagem. Risco baixo.
- **Papel `sandbox_exec` (certeza que existe; o efeito do REVOKE é suposição):** a M2 revoga INSERT/UPDATE/DELETE dele. Não consegui ler as concessões atuais. Se a permissão tiver sido dada por outro papel, o REVOKE do `postgres` não tem efeito, e a pós-condição aborta a migração inteira com segurança (rollback completo). Nesse caso a M2 não aplica e precisa de ajuste. Não fica nada pela metade.
- **Sessões antigas sem triagem (certeza, pelos dados):** hoje existem 2 sessões com `red_flags` nulo, 1 `completed` e 1 `in_progress`.
  - A concluída: qualquer UPDATE futuro nela falha com `triage_missing`, porque o status continua `completed`. Nenhuma tela atualiza sessões concluídas hoje.
  - A em andamento: nunca vai poder ser concluída. A tela atual cria uma sessão nova, então o efeito prático é uma sessão abandonada.
  - Sugestão: aceitar, ou arquivar essa sessão antes da M2.
- **Clientes antigos em cache (suposição):** quem estiver com a tela antiga aberta na hora da M2 recebe `triage_missing` ao criar sessão. Basta recarregar.
- **Ordem das triggers (certeza):** `assign_server_row_id` roda antes de `guard_quick_session_red_flags`, que roda antes de `guard_quick_session_update`, por ordem alfabética. A M2 remove a trigger de versão da M1. Sem conflito.

## Conclusão

Pode publicar as telas. Aplique a M2 logo em seguida, para encurtar a janela do protocolo rápido. Antes da M2, decida o que fazer com a sessão antiga em andamento. Os pontos de experiência (1, 3 e 4) são melhorias, não bloqueios.
