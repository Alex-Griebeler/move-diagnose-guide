# Testes

`bun run test` roda tudo (Vitest, configuração em `vitest.config.ts`, separada do `vite.config.ts`).
A CI (`.github/workflows/ci.yml`) roda os testes em toda PR e em todo push no `main`.

## `tests/domain/`: regras de cálculo, sem banco

- `draftSanitizer.test.ts`: a limpeza do rascunho (`src/lib/draftSanitizer.ts`) comparada com uma cópia literal da implementação antiga do hook. O teste marcado como temporário documenta o defeito F-01 (`Date` vira `{}`) e será substituído pela Etapa 3.
- `weightEngine.test.ts` e `priorityEngine.test.ts`: pesos (tabela A), ajustes de contexto (tabela E) e prioridade (tabela F). Os valores esperados estão escritos no próprio teste, com a conta em comentário.

## `tests/db/`: banco em PGlite

`harness.ts` cria um PostgreSQL em memória (PGlite) com os papéis, `auth` e `storage` mínimos do Supabase e aplica todas as migrations de `supabase/migrations/`, em ordem. Nenhum dado real: só ids e e-mails sintéticos (`*.invalid`).

- `bloco1.test.ts`, `r9.test.ts` e `collision.test.ts` rodam os cenários de `scenarios/`, portados sem mudar a lógica dos scripts de replay do bloco 1 (`codex-review/bloco1-banco-acesso/replay/`, fora deste repositório). Cada teste exige 0 falhas, o mesmo número de checagens e a mesma lista de rótulos da saída de referência (`fixtures/*.labels.txt`). As checagens manuais (pré-condições) também contam.
- `rollback.test.ts`: depois de aplicar o bloco 1 e o rollback (`supabase/rollbacks/`), o schema volta a ser idêntico ao de antes.
- `schema.test.ts`: retrato das policies, funções, triggers e RLS. Toda migration nova muda o arquivo `__snapshots__/schema.test.ts.snap`. Rode `bun x vitest run -u tests/db/schema.test.ts` e revise o diff do snapshot na PR.

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
