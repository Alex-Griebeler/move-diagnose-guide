# Testes

`bun run test` roda tudo (Vitest, configuração em `vitest.config.ts`, separada do `vite.config.ts`).
A CI (`.github/workflows/ci.yml`) roda os testes em toda PR e em todo push no `main`.

## `tests/domain/`: regras de cálculo, sem banco

- `draftSanitizer.test.ts`: a limpeza do rascunho (`src/lib/draftSanitizer.ts`) comparada com uma cópia literal da implementação antiga do hook. Fora de `Date`, o resultado tem de ser idêntico. A única diferença intencional é o F-01 (Etapa 3a): `Date` vira ISO, e `restoreDraftDate` só aceita essa ISO de volta.
- `dateGuards.test.ts`: `validDate` e `toDateOnlyOrNull` (`src/lib/dateGuards.ts`), que impedem um `Invalid Date` de chegar a `format` ou `toISOString`.
- `savedMedia.test.ts`: `splitSavedMedia` (`src/lib/savedMedia.ts`) devolve cada foto ou vídeo salvo à vista ou ao teste de origem, pelo nome que o `MediaUploader` dá ao arquivo, e guarda à parte o que não reconhece (F-04, Etapa 3c).
- `weightEngine.test.ts` e `priorityEngine.test.ts`: pesos (tabela A), ajustes de contexto (tabela E) e prioridade (tabela F). Os valores esperados estão escritos no próprio teste, com a conta em comentário.
- `findingsContract.test.ts` (Etapa 3d): as faixas de `functional_findings`, lidas da migration da 3d, contêm todo peso de base, toda soma de ajustes de contexto e todo `priority_score` que o motor consegue calcular (B-13).
- `protocolSave.test.ts` (Etapa 3d): `buildProtocolSave` (`src/lib/protocolSave.ts`) monta a chamada de `save_assessment_protocol` com o valor do motor de pesos. Um caso real dá peso de base 4 e de contexto 6, que só cabem nas faixas novas do banco (B-13).
- `protocolResponse.test.ts` (Etapa 3d): `parseGeneratedProtocol` (`src/lib/protocolResponse.ts`) aceita a resposta do gerador, completa os campos opcionais e recusa as que a tela não consegue mostrar ou gravar.
- `protocolCache.test.ts` (Etapa 3d): a chave do pedido (`src/lib/protocolCache.ts`) é a mesma para o mesmo pedido em qualquer ordem de chaves, e o protocolo guardado só volta com a mesma chave e se ainda passar na validação (F-15).
- `poseFindings.test.ts` (passo 0): com a trava `POSE_OBJECTIVE_FINDINGS_ENABLED` desligada, nenhuma das 13 regras da pose devolve achado, nem com métricas que antes disparavam cada uma (o teste traz a regra antiga para provar). Vale também para regra nova ou limiar 0 vindos do `localStorage` ou do perfil do backend.
- `fuseEvidence.test.ts` (passo 0): a fusão não aplica compensação em nenhuma combinação, não calcula concordância e não transforma achado da pose em sugestão. A pose continua conferindo a captura (timeout, quadros válidos, confiança). Sem pose comparável, achado da IA com confiança abaixo de 70% deixa a vista "indeterminate". O snapshot marca `poseObjectiveFindingsEnabled: false` nas três fontes de configuração, mesmo quando o perfil do backend troca a versão.
- `segmentalCutoff.test.ts` (passo 0): `passesCutoff` e `cutoffLabel` (`src/data/segmentalTestMappings.ts`). Peitoral menor passa com até 2,5 cm, os outros testes com corte continuam "valor ≥ corte", e Thomas e Ober dizem na instrução o sinal do ângulo.
- `thresholdSources.ts` é apoio, não teste: troca a fonte dos limiares clínicos (padrão, `localStorage` ou perfil do backend, com Supabase falso).

## `tests/ui/`: componentes e telas, em jsdom

Cada arquivo declara `// @vitest-environment jsdom` (o padrão continua Node) e chama `cleanup` depois de cada teste. Supabase, autenticação e etapas vizinhas são falsos, com dados sintéticos. Os testes não acessam a rede e não usam o banco real.

- `useWizardPersistence.test.tsx`: o hook real retoma a data do rascunho e a grava como ISO (F-01). Sem rascunho, abre com os dados já enviados e só grava rascunho depois de uma mudança; com rascunho, não lê os enviados; uma leitura com erro marca `loadFailed` (F-04).
- `personalDataStep*.test.tsx` e `anamnesisWizard.submit.test.tsx`: uma data inválida não derruba a tela nem o envio (F-01).
- `segmentalTestsWizard.test.tsx`: cada teste segmentar ganha uma instância nova, então a foto não passa para o seguinte (F-03). Prova a fronteira de montagem, não o upload.
- `addStudentModal.route.test.tsx`: a URL do cadastro presencial abre a nova avaliação no `App` real, que tem a tabela de rotas real e páginas stub (F-08).
- `assessmentPages.test.tsx`: um nome com `%` na URL não derruba as páginas de avaliação. A detecção da etapa e a lista de alunos rodam uma vez só (proteção dos ajustes de `exhaustive-deps` da 3c). O `useAuth` falso devolve sempre o mesmo usuário, como o real.
- `errorBoundary.test.tsx`: aviso por etapa (zerado ao trocar de etapa) e aviso no `App`, que fica dentro do tema.
- `globalTestsWizard.state.test.tsx`: nos globais, a marcação manual e a evidência da análise são gravadas e chegam à entrada do protocolo, e o que muda durante a análise não é sobrescrito (F-02). O `ProtocolGenerator` real lê as linhas gravadas; a IA do protocolo não é chamada. Passo 0: a análise "pronta" só sugere; a compensação entra quando o profissional toca nela, e analisar de novo mantém o que ele confirmou.
- `segmentalTestsWizard.state.test.tsx`: o resultado bilateral quantitativo grava os dois lados, que chegam à entrada do protocolo (F-07). Passo 0: o segmentar não oferece nem chama a IA; peitoral menor com 1,5 cm passa, e um rascunho com o booleano da regra antiga é regravado certo.
- `quickProtocolV2.aiFallback.test.tsx` (passo 0, E8): no protocolo rápido de joelho, a IA que falha (em qualquer vista, ou com exceção) mostra um aviso e leva ao primeiro teste manual, sem chamar as vistas seguintes. Uma resposta sem compensações também leva aos testes, e sem confiança a tela mostra 0% (antes, 70%); com compensações, vai aos testes confirmatórios, como antes. O teste avança os 500 ms entre as vistas com timers falsos.
- `anamnesisWizard.reload.test.tsx`, `globalTestsWizard.reload.test.tsx` e `segmentalTestsWizard.flow.test.tsx` (Etapa 3c):
  - ao voltar a uma etapa já enviada, a tela mostra o que foi salvo, e reenviar regrava o mesmo conteúdo por `upsert` (F-04);
  - o rascunho continua valendo sobre o enviado;
  - se o salvo não puder ser lido, concluir não grava por cima dele;
  - no segmentar, "Pular" não apaga nada e concluir com teste sem resultado pede confirmação (F-05); abrir outra avaliação antes não apaga o rascunho desta, e as sugestões que chegam depois não o sobrescrevem (F-06);
  - no segmentar (passo 0), o passa/falha gravado vem do valor contra o corte da linha salva, na direção do teste; sem teste conhecido, fica o booleano que veio.
- `protocolGenerator.test.tsx` (Etapa 3d):
  - salvar faz uma chamada só a `save_assessment_protocol`, sem gravar direto nas tabelas; se ela falhar, nada fica gravado e dá para tentar de novo (B-13);
  - voltar à etapa com os mesmos testes reaproveita o protocolo guardado; mudar um teste, "Regenerar" ou um protocolo guardado inválido geram de novo; StrictMode, sair e voltar no meio da geração, uma geração que termina enquanto a etapa volta a carregar e duas cargas ao mesmo tempo não geram duas vezes; sair da etapa antes de gerar não gera, e trocar de avaliação não mostra resposta atrasada (F-15);
  - uma resposta inválida do gerador ou um erro ao ler a anamnese vão para a tela de erro; uma fase desconhecida aparece e bloqueia o salvar;
  - o corpo do pedido ao gerador continua com as mesmas chaves.
- `helpers.tsx` e `supabaseFake.ts` são apoio, não testes. O `supabaseFake` só aceita escrita quando o teste passa um array para registrá-la (com operação, opções e filtros); sem ele, qualquer escrita lança. `rpc` também é registrada assim. Uma tabela pode ser função dos filtros `eq`; se a função lançar, a consulta responde `{ data: null, error }`, como o supabase-js. Para simular falha de escrita, o teste passa `fail` com chaves `"tabela.operação"` ou `"nome.rpc"`.

## `tests/db/`: banco em PGlite

`harness.ts` cria um PostgreSQL em memória (PGlite) com os papéis, `auth` e `storage` mínimos do Supabase e aplica todas as migrations de `supabase/migrations/`, em ordem (`makeDb({ skip })` deixa migrations de fora pelo nome). Nenhum dado real: só ids e e-mails sintéticos (`*.invalid`).

- `bloco1.test.ts`, `r9.test.ts` e `collision.test.ts` rodam os cenários de `scenarios/`, portados sem mudar a lógica dos scripts de replay do bloco 1 (`codex-review/bloco1-banco-acesso/replay/`, fora deste repositório). Cada teste exige 0 falhas, o mesmo número de checagens e a mesma lista de rótulos da saída de referência (`fixtures/*.labels.txt`). As checagens manuais (pré-condições) também contam. Eles rodam sem as migrations que mudam regras que essas checagens conferem (`CHANGES_BLOCO1_RULES` em `harness.ts`; hoje, a da Etapa 3d); cada uma dessas tem teste próprio.
- `rollback.test.ts`: depois de aplicar o bloco 1 e o rollback (`supabase/rollbacks/`), o schema volta a ser idêntico ao de antes. Também roda sem `CHANGES_BLOCO1_RULES`.
- `etapa3c.test.ts`: unicidade de `anamnesis_responses(assessment_id)` e `segmental_test_results(assessment_id, test_name)`:
  - sem a migration, o reenvio duplica e o `upsert` por chave falha;
  - com duplicado no banco, a migration aborta sem criar nada e sem apagar linha;
  - com ela, o reenvio atualiza a linha salva e a avaliação concluída continua fechada;
  - o rollback tira as duas constraints sem apagar dados.
- `etapa3d.test.ts`: `save_assessment_protocol` e as faixas novas de peso (B-13):
  - grava protocolo, achados e conclusão juntos, ou nada; repetir devolve o mesmo protocolo;
  - só o profissional dono de uma avaliação aberta consegue; os outros recebem o mesmo erro;
  - ninguém grava direto em `protocols` nem em `functional_findings`; o autor ainda apaga a avaliação aberta, com o que estiver nela;
  - com protocolo duplicado, com avaliação aberta que já tem protocolo ou achados, ou com outra policy de escrita, a migration aborta sem mudar nada; depois dela, a faixa aceita peso 4 e contexto 6 e recusa 5 e 7;
  - o rollback volta o schema ao de antes e aborta se já houver peso fora da faixa antiga.
- `schema.test.ts`: retrato das policies, funções, triggers, RLS e constraints UNIQUE. Toda migration nova muda o arquivo `__snapshots__/schema.test.ts.snap`. Rode `bun x vitest run -u tests/db/schema.test.ts` e revise o diff do snapshot na PR.

Os fixtures foram gerados por `work/etapa2/gerar-fixtures.mjs` (fora do repositório), que confere o sha256 de cada saída de referência antes de extrair.

## `tests/integration/race/`: teste manual, fora da CI

`race.sh` prova num PostgreSQL real (o PGlite tem uma conexão só) que a trava da seção i) da migration do bloco 1 impede duas inserções simultâneas com o mesmo id em `assessments` e `quick_protocol_sessions`. Ele cria um cluster descartável e apaga tudo no fim. Precisa de `initdb`, `pg_ctl` e `psql`; o padrão é o Postgres.app, e outro caminho se passa em `PG_BIN`.

```bash
PG_BIN=/caminho/do/postgres/bin tests/integration/race/race.sh
```

O resultado esperado está em `race.out`:

- **Com a trava:** a segunda inserção espera e falha, e nenhuma colisão fica gravada.
- **Sem a trava:** a colisão acontece.

## Ruleset do `main` (`.github/rulesets/main.json`)

O GitHub NÃO aplica esse arquivo sozinho. Ele é a proposta de "CI obrigatória":

- todo merge no `main` passa a ser por PR, com `check` e `edge` verdes;
- o bot do Lovable (app `lovable-dev`, id 818760) continua fazendo push direto.

Só é aplicado à mão, pela API, depois do "sim" do Alex:

```bash
gh api -X POST repos/Alex-Griebeler/move-diagnose-guide/rulesets --input .github/rulesets/main.json
```

Para reverter, apague a ruleset (`gh api -X DELETE repos/Alex-Griebeler/move-diagnose-guide/rulesets/<id>`).
