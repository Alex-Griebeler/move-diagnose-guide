

## Ajustes Residuais Fase 3 — Plano de Execução

Explorei todos os arquivos envolvidos e confirmei que existem 3 duplicatas reais na tabela `global_test_results` (assessment `de885ff1...` com 3 registros cada para ohs/sls/pushup). Nenhuma UNIQUE constraint existe ainda.

---

### 1. Migration SQL — Dedup com ROW_NUMBER + Unique + Policies Idempotentes

**Arquivo:** `supabase/migrations/20260312140000_phase3_residual_fixes.sql`

Deduplicação usando `ROW_NUMBER()` mantendo o registro mais recente por `updated_at DESC, created_at DESC`:

```sql
DELETE FROM global_test_results WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY assessment_id, test_name
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn FROM global_test_results
  ) ranked WHERE rn > 1
);
```

Seguido de unique constraint com guard `IF NOT EXISTS` e todas as 8 policies de governança envolvidas em `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE ...) THEN CREATE POLICY ...; END IF; END $$;`.

---

### 2. GlobalTestsWizard — Upsert Resiliente

**Arquivo:** `src/components/global-tests/GlobalTestsWizard.tsx` (linhas 190-254)

Adicionar helper `resilientUpsert` antes de `handleSubmit`:
- Tenta `.upsert(payload, { onConflict: 'assessment_id,test_name' })`
- Se erro `42P10` (constraint inexistente): fallback para `delete` + `insert`
- Se outro erro: throw

Substituir os 3 `.insert(...)` (ohs, sls, pushup) por chamadas a `resilientUpsert(...)`. Payloads idênticos.

---

### 3. AutoGlobalTest — adjudicatedCompensations no toggle

**Arquivo:** `src/components/global-tests/AutoGlobalTest.tsx`

**Linha 20-24:** Adicionar imports de `getClinicalThresholds` e `getThresholdSnapshot` de `@/lib/clinical/clinicalThresholds`.

**Linha 374-379:** Expandir `toggleCompensation` para:
1. Atualizar compensations (como hoje)
2. Buscar `evidenceMetadata[currentView.id]` existente
3. Se existir: spread + `adjudicatedCompensations: updated`
4. Se não existir: criar metadata mínima com `evidenceVersion` de `getClinicalThresholds()`, `thresholdSnapshot` de `getThresholdSnapshot()`, status `indeterminate`, reason `manual_selection_only`
5. Chamar `handleUpdateEvidence(currentViewId, updatedEvidence)`

---

### 4. clinicalThresholds — cachedProfileId + snapshot completo

**Arquivo:** `src/lib/clinical/clinicalThresholds.ts`

- **Linha 178:** Adicionar `let cachedProfileId: string | null = null;`
- **Linha 241:** Em `resetClinicalThresholdOverrides()`: adicionar `cachedProfileId = null;`
- **Linha 255-257:** Em `getClinicalThresholds()` quando `!overrides` (defaults): `cachedProfileId = null;`
- **Linha 261:** Em `getClinicalThresholds()` quando localStorage: `cachedProfileId = null;`
- **Linha 320:** Em `refreshClinicalThresholdsFromBackend()` após `currentSource = 'backend'`: `cachedProfileId = (profile as any).id;`
- **Linha 353-363:** Em `getThresholdSnapshot()`: adicionar `poseObjective: t.poseObjective` e `thresholdProfileId: cachedProfileId`

---

### Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/20260312140000_...sql` | Criar |
| `src/components/global-tests/GlobalTestsWizard.tsx` | Modificar (linhas 190-254) |
| `src/components/global-tests/AutoGlobalTest.tsx` | Modificar (linhas 20-24, 374-379) |
| `src/lib/clinical/clinicalThresholds.ts` | Modificar (6 pontos cirúrgicos) |

