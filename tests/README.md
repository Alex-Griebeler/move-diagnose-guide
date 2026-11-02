# Testes

`bun run test` roda tudo (Vitest, configuração em `vitest.config.ts`, separada do `vite.config.ts`).
A CI (`.github/workflows/ci.yml`) roda os testes em toda PR e em todo push no `main`.

## `tests/domain/`: regras de cálculo, sem banco

- `draftSanitizer.test.ts`: a limpeza do rascunho (`src/lib/draftSanitizer.ts`) comparada com uma cópia literal da implementação antiga do hook. Fora de `Date`, o resultado tem de ser idêntico. A única diferença intencional é o F-01 (Etapa 3a): `Date` vira ISO, e `restoreDraftDate` só aceita essa ISO de volta.
- `dateGuards.test.ts`: `validDate` e `toDateOnlyOrNull` (`src/lib/dateGuards.ts`), que impedem um `Invalid Date` de chegar a `format` ou `toISOString`.
- `savedMedia.test.ts`: `splitSavedMedia` (`src/lib/savedMedia.ts`) devolve cada foto ou vídeo salvo à vista ou ao teste de origem, pelo nome que o `MediaUploader` dá ao arquivo, e guarda à parte o que não reconhece (F-04, Etapa 3c).
- `weightEngine.test.ts` e `priorityEngine.test.ts`: pesos (tabela A), ajustes de contexto (tabela E) e prioridade (tabela F). Os valores esperados estão escritos no próprio teste, com a conta em comentário.

## `tests/ui/`: componentes e telas, em jsdom

Cada arquivo declara `// @vitest-environment jsdom` (o padrão continua Node) e chama `cleanup` depois de cada teste. Supabase, autenticação e etapas vizinhas são falsos, com dados sintéticos. Os testes não acessam a rede e não usam o banco real.

- `useWizardPersistence.test.tsx`: o hook real retoma a data do rascunho e a grava como ISO (F-01). Sem rascunho, abre com os dados já enviados e só grava rascunho depois de uma mudança; com rascunho, não lê os enviados; uma leitura com erro marca `loadFailed` (F-04).
- `personalDataStep*.test.tsx` e `anamnesisWizard.submit.test.tsx`: uma data inválida não derruba a tela nem o envio (F-01).
- `segmentalTestsWizard.test.tsx`: cada teste segmentar ganha uma instância nova, então a foto não passa para o seguinte (F-03). Prova a fronteira de montagem, não o upload.
- `addStudentModal.route.test.tsx`: a URL do cadastro presencial abre a nova avaliação no `App` real, que tem a tabela de rotas real e páginas stub (F-08).
- `assessmentPages.test.tsx`: um nome com `%` na URL não derruba as páginas de avaliação. A detecção da etapa e a lista de alunos rodam uma vez só (proteção dos ajustes de `exhaustive-deps` da 3c). O `useAuth` falso devolve sempre o mesmo usuário, como o real.
- `errorBoundary.test.tsx`: aviso por etapa (zerado ao trocar de etapa) e aviso no `App`, que fica dentro do tema.
- `globalTestsWizard.state.test.tsx`: nos globais, a marcação manual e a evidência da análise são gravadas e chegam à entrada do protocolo, e o que muda durante a análise não é sobrescrito (F-02). O `ProtocolGenerator` real lê as linhas gravadas; a IA do protocolo não é chamada.
- `segmentalTestsWizard.state.test.tsx`: a análise bilateral quantitativa grava os dois lados, que chegam à entrada do protocolo (F-07).
- `anamnesisWizard.reload.test.tsx`, `globalTestsWizard.reload.test.tsx` e `segmentalTestsWizard.flow.test.tsx` (Etapa 3c):
  - ao voltar a uma etapa já enviada, a tela mostra o que foi salvo, e reenviar regrava o mesmo conteúdo por `upsert` (F-04);
  - o rascunho continua valendo sobre o enviado;
  - se o salvo não puder ser lido, concluir não grava por cima dele;
  - no segmentar, "Pular" não apaga nada e concluir com teste sem resultado pede confirmação (F-05); abrir outra avaliação antes não apaga o rascunho desta, e as sugestões que chegam depois não o sobrescrevem (F-06).
- `helpers.tsx` e `supabaseFake.ts` são apoio, não testes. O `supabaseFake` só aceita escrita quando o teste passa um array para registrá-la (com operação, opções e filtros); sem ele, qualquer escrita lança. Uma tabela pode ser função dos filtros `eq`; se a função lançar, a consulta responde `{ data: null, error }`, como o supabase-js.

## `tests/db/`: banco em PGlite

`harness.ts` cria um PostgreSQL em memória (PGlite) com os papéis, `auth` e `storage` mínimos do Supabase e aplica todas as migrations de `supabase/migrations/`, em ordem (`makeDb({ skip })` deixa migrations de fora pelo nome). Nenhum dado real: só ids e e-mails sintéticos (`*.invalid`).

- `bloco1.test.ts`, `r9.test.ts` e `collision.test.ts` rodam os cenários de `scenarios/`, portados sem mudar a lógica dos scripts de replay do bloco 1 (`codex-review/bloco1-banco-acesso/replay/`, fora deste repositório). Cada teste exige 0 falhas, o mesmo número de checagens e a mesma lista de rótulos da saída de referência (`fixtures/*.labels.txt`). As checagens manuais (pré-condições) também contam.
- `rollback.test.ts`: depois de aplicar o bloco 1 e o rollback (`supabase/rollbacks/`), o schema volta a ser idêntico ao de antes.
- `etapa3c.test.ts`: unicidade de `anamnesis_responses(assessment_id)` e `segmental_test_results(assessment_id, test_name)`:
  - sem a migration, o reenvio duplica e o `upsert` por chave falha;
  - com duplicado no banco, a migration aborta sem criar nada e sem apagar linha;
  - com ela, o reenvio atualiza a linha salva e a avaliação concluída continua fechada;
  - o rollback tira as duas constraints sem apagar dados.
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
