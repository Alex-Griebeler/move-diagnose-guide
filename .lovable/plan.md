

## Plano de Execução: Fase 3 — Rigor Científico com Addendum

### Escopo

1 migração SQL + 8 arquivos TypeScript modificados/criados. Implementação em mensagem única.

---

### 1. Migração SQL (idempotente)

Criar `supabase/migrations/20260312120000_clinical_governance_tables.sql`:

```sql
-- organizations + organization_members (bootstrap existing users)
-- clinical_threshold_profiles (org-scoped, unique active per org)
-- clinical_threshold_audit_log
-- is_org_member() with SET search_path = 'public'
-- activate_threshold_profile() with role check + FOR UPDATE lock + SET search_path
-- Bootstrap: create default org, assign all existing profiles as members
```

Key decisions:
- All functions use `SET search_path = 'public'` (security)
- `activate_threshold_profile()` validates `has_role(auth.uid(), 'professional')` before activating
- Bootstrap creates a "Default" organization and enrolls all existing `profiles` as members
- Unique partial index `ON (organization_id) WHERE is_active = true`
- RLS uses `is_org_member()` for SELECT, role check for INSERT/UPDATE

---

### 2. `src/lib/clinical/types.ts` — Expand types

Add optional temporal fields to `PoseResult`:
- `frameCountRequested?`, `frameCountUsed?`, `processingMs?`
- `frameQualityPassRate?`, `temporalStabilityScore?`, `temporalTimeoutFallback?`

Add `CaptureContext`, `ModelInfo` interfaces.

Expand `EvidenceMetadata` with optional:
- `thresholdProfileId?`, `modelInfo?`, `captureContext?`
- `predictedCompensations: string[]` (keep `detectedCompensations` as deprecated alias)
- `adjudicatedCompensations?: string[]`

---

### 3. `src/lib/clinical/clinicalThresholds.ts` — Safety bounds + async refresh

- Add `SAFETY_BOUNDS` with `[min, max]` per parameter
- Add `scoreWeights` and `temporalAnalysis` config to `ClinicalThresholdsConfig`
- Bump `evidenceVersion` to `2026.03.v3`
- In-memory cache: `getClinicalThresholds()` stays synchronous
- Add `refreshClinicalThresholdsFromBackend(): Promise<void>` — fetches active profile, updates cache, logs source
- Add `getThresholdSource(): 'defaults' | 'localStorage' | 'backend'`
- `saveClinicalThresholdOverrides()` clamps within safety bounds
- `getThresholdSnapshot()` returns full snapshot including weights and temporal config

---

### 4. `src/lib/clinical/mediaQuality.ts` — Remove hardcoded weights

- Replace `0.25, 0.25, 0.3, 0.2` with `getClinicalThresholds().scoreWeights`
- Replace `thresholds.minContrast * 2` with `thresholds.minContrast` (meeting threshold = score 1.0, capped)

---

### 5. `src/lib/clinical/poseBiomechanics.ts` — Temporal video analysis

Add `analyzeVideoTemporal(video, testType, viewType)`:
- Reads `temporalAnalysis` config (default 7 frames, max 10, timeout 8s, downscale 480px)
- Samples N frames uniformly, runs `analyzePose` per frame
- Aggregation: median for numeric metrics, union for compensation flags
- Timeout (8s): fallback to single mid-frame with `temporalTimeoutFallback: true`
- Returns `PoseResult` with temporal fields populated
- `temporalStabilityScore` = 1 - coefficient of variation of key metrics

---

### 6. `src/lib/clinical/biomechanicalScoring.ts` — Temporal + predicted/adjudicated

- Accept optional `captureContext` in `fuseEvidence()`
- When `poseResult.temporalTimeoutFallback === true` → force `indeterminate`
- When `poseResult.frameQualityPassRate < minFrameQualityPassRate` → force `indeterminate`
- Populate `predictedCompensations` in evidence metadata (union of AI + pose)
- Keep `detectedCompensations` as deprecated copy
- Populate `modelInfo` with tolerant values (`'unknown'` when version unavailable)
- Populate `captureContext` in metadata

---

### 7. `src/lib/clinical/clinicalValidationMetrics.ts` — Preconditions guard

Add:
```typescript
function validateMetricsPreconditions(cm: ConfusionMatrix, universeSize: number): {
  valid: boolean; reasons: string[];
}
```
- `total = tp + tn + fp + fn` (includes TN)
- Requires `tp + fn >= 3`, `universeSize >= 5`, `total > 0`

---

### 8. `src/components/global-tests/AutoGlobalTest.tsx` — Temporal pipeline

In `handleAnalyze`:
- Detect video → use `analyzeVideoTemporal()` instead of single-frame
- Build `captureContext` based on source type
- After fusion: populate `predictedCompensations` in evidence
- On manual toggle: track as `adjudicatedCompensations`
- Show temporal metrics (frameCount, stabilityScore) in scores bar
- Remove inline kappa display; show "Métricas indisponíveis" without adjudicated ground-truth

---

### 9. `src/components/clinical/ThresholdCalibrationPanel.tsx` — Safety bounds + source

- Import `SAFETY_BOUNDS` and `getThresholdSource`
- Show min/max range per field
- Disable save when out of bounds (red indicator)
- Show source: "Backend" / "Local (fallback)" / "Padrão"
- Show `evidenceVersion`

---

### 10. `src/components/global-tests/GlobalTestsWizard.tsx` — Evidence bundle

In `handleSubmit`: include `predictedCompensations`, `captureContext`, `modelInfo` in persisted evidence metadata. All optional — backward compatible.

---

### Backward Compatibility

- All new fields optional in types and persistence
- Legacy data without `evidenceMetadata` treated as `ready`
- `detectedCompensations` kept as deprecated alias
- `getClinicalThresholds()` remains synchronous; `refreshFromBackend()` is opt-in async
- No import path changes

### Ressalvas Resolvidas

1. Bootstrap org/members for existing users in migration
2. `SET search_path = 'public'` on all SECURITY DEFINER functions
3. `activate_threshold_profile()` checks role before activation
4. Temporal timeout → forced `indeterminate` (never `ready`)
5. `validateMetricsPreconditions` uses `tp+tn+fp+fn` for total

