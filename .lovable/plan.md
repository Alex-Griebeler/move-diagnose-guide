

## Plano: Camada de Análise Objetiva + Quality Gate + Governança de Incerteza

### Visão Geral

Adicionar 4 camadas ao pipeline de análise existente, sem quebrar o fluxo manual:

```text
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Quality Gate │ → │ Pose/TFJS    │ → │ Fusão        │ → │ Score +      │
│ (bloqueante) │    │ (landmarks)  │    │ (IA+Obj)     │    │ Persistência │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Fase 1: Módulos Base + Quality Gate

**Arquivos novos:**

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/clinical/clinicalThresholds.ts` | Thresholds versionados (resolução, brilho, contraste, nitidez, pose confidence, agreement score) |
| `src/lib/clinical/mediaQuality.ts` | Avalia qualidade de imagem/frame via Canvas API (luminância média, contraste RMS, resolução, detecção de blur via Laplacian simplificado) |
| `src/lib/clinical/poseBiomechanics.ts` | Wrapper lazy de BlazePose/TFJS + extração de métricas por teste/vista |
| `src/lib/clinical/biomechanicalScoring.ts` | Score determinístico por vista + fusão de evidências + status de confiabilidade |
| `src/lib/clinical/types.ts` | Tipos compartilhados (ViewReliabilityStatus, EvidenceMetadata, ObjectiveMetrics, etc.) |

**`clinicalThresholds.ts`** — Arquivo único versionado:
```typescript
export const CLINICAL_THRESHOLDS = {
  version: '1.0.0',
  mediaQuality: {
    minResolution: { width: 640, height: 480 },
    minBrightness: 40,  // 0-255 luminância média
    maxBrightness: 230,
    minContrast: 25,     // RMS contrast
    minSharpness: 15,    // Laplacian variance proxy
  },
  pose: {
    minPoseConfidence: 0.5,
    minLandmarkVisibility: 0.4,
  },
  fusion: {
    minAgreementScore: 0.3,
    minAiConfidence: 0.6,
    autoApplyThreshold: 0.7, // agreement + confidence
  },
  biomechanical: {
    // peso por compensação (reutiliza weightEngine)
  },
} as const;
```

**`mediaQuality.ts`** — Análise client-side via Canvas:
- Recebe `HTMLImageElement | HTMLVideoElement | ImageBitmap`
- Calcula: `brightness` (avg luminance), `contrast` (RMS), `sharpness` (Laplacian variance via 3x3 kernel sobre downsampled grayscale), `resolution`
- Retorna `{ passed: boolean, score: number, issues: string[] }`
- Se `!passed` → status = `blocked_quality`, UI mostra motivos

### Fase 2: Pose/Landmarks (BlazePose Lazy)

**`poseBiomechanics.ts`:**
- `loadPoseModel()` — lazy import de `@mediapipe/tasks-vision` (ou `@tensorflow-models/pose-detection` com BlazePose)
- Dependência adicionada: `@mediapipe/tasks-vision` (~2MB lazy)
- Métricas por teste/vista:

```text
OHS Anterior:  valgusAngle (knee-ankle-hip), footOrientation
OHS Lateral:   trunkLeanAngle (shoulder-hip vs vertical), kneeFlexion
SLS Anterior:  valgusProxy, trunkLean
SLS Posterior:  pelvicDrop (hip-hip angle vs horizontal)
Push-up Lat:   hipSagRatio (shoulder-hip-ankle alignment)
Push-up Post:  elbowFlareAngle (shoulder-elbow-wrist)
```

- Cada métrica tem threshold em `clinicalThresholds.ts`
- Retorna: `{ poseConfidence, objectiveMetrics, objectiveFindings }`

### Fase 3: Fusão + Status de Confiabilidade

**`biomechanicalScoring.ts`:**

```typescript
type ViewReliabilityStatus = 'ready' | 'blocked_quality' | 'indeterminate';

function fuseEvidence(
  aiResult: AnalysisResult | null,
  objectiveFindings: string[],
  qualityResult: QualityResult,
  poseConfidence: number
): EvidenceMetadata {
  // 1. Se quality !passed → blocked_quality
  // 2. Se AI confidence < 0.6 OU pose confidence < 0.5 
  //    OU agreement < 0.3 → indeterminate
  // 3. Caso contrário → ready
  
  const agreementScore = intersection / union; // Jaccard
  
  // Score biomecânico = Σ(peso_compensação × confidence × qualityScore)
  // Usa pesos do weightEngine.ts existente
}
```

**Regras de auto-aplicação:**
- `ready` + `agreementScore >= 0.7` → auto-aplica compensações no formulário
- `indeterminate` → NÃO auto-aplica; exige revisão manual
- `blocked_quality` → análise bloqueada; UI mostra motivo

### Fase 4: UI — Indicadores de Status

**Modificar `AutoGlobalTest.tsx`:**

Adicionar ao pipeline de `handleAnalyze`:
1. Extrair frame (já existe)
2. **NOVO:** Rodar `assessMediaQuality(frame)` → se blocked, parar e mostrar UI
3. **NOVO:** Rodar `analyzePose(frame, testType, viewType)` → métricas objetivas
4. Chamar AI (existente)
5. **NOVO:** Rodar `fuseEvidence(aiResult, poseFindings, quality, poseConf)`
6. Aplicar resultado baseado em status

**UI por vista:**
- Badge de status no pill da vista: 🟢 ready / 🟡 indeterminate / 🔴 blocked
- Card de quality issues quando bloqueado (ícones + texto: "Iluminação insuficiente", "Imagem borrada", "Resolução baixa")
- Banner amarelo para `indeterminate`: "Baixa concordância entre análises — revise manualmente"
- Scores expostos discretamente: `qualityScore`, `biomechanicalScore`, `reliability`

### Fase 5: Persistência para Auditoria

**Modificar `GlobalTestsWizard.tsx` (`handleSubmit`):**

Incluir metadados no JSON de cada vista salvo em `global_test_results`:

```typescript
// Dentro de anterior_view / lateral_view / etc.
{
  compensations: [...],         // existente
  mediaUrls: {...},             // existente
  // NOVOS campos de auditoria:
  evidenceMetadata: {
    status: 'ready' | 'blocked_quality' | 'indeterminate',
    evidenceVersion: '1.0.0',
    qualityScore: 0.85,
    qualityPassed: true,
    qualityIssues: [],
    aiConfidence: 0.92,
    poseConfidence: 0.78,
    biomechanicalScore: 7.2,
    detectedCompensations: ['knee_valgus'],
    autoAppliedCompensations: ['knee_valgus'],
    objectiveAgreementScore: 0.8,
    objectiveFindings: ['knee_valgus'],
    objectiveMetrics: { valgusAngle: 12.3 },
    indeterminateReasons: [],
    computedAt: '2026-03-12T...',
  }
}
```

Backward compatible: campos opcionais; drafts antigos sem esses campos continuam funcionando.

### Fase 6: Integração com Priorização/Protocolo

**Modificar `src/lib/testPrioritization.ts` e `ProtocolGenerator.tsx`:**

- Ao agregar compensações de `global_test_results`, verificar `evidenceMetadata.status`:
  - `ready` → usar normalmente (com severidade inferida)
  - `indeterminate` → incluir com flag, peso reduzido (×0.5)
  - `blocked_quality` → ignorar completamente
- Se `evidenceMetadata` não existe (draft legado) → comportamento atual mantido

### Dependências NPM

```
@mediapipe/tasks-vision  (lazy loaded, ~2MB)
```

### Arquivos Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `src/lib/clinical/types.ts` | **Criar** |
| `src/lib/clinical/clinicalThresholds.ts` | **Criar** |
| `src/lib/clinical/mediaQuality.ts` | **Criar** |
| `src/lib/clinical/poseBiomechanics.ts` | **Criar** |
| `src/lib/clinical/biomechanicalScoring.ts` | **Criar** |
| `src/components/global-tests/AutoGlobalTest.tsx` | **Modificar** (pipeline + UI) |
| `src/components/global-tests/GlobalTestsWizard.tsx` | **Modificar** (persistência metadata) |
| `src/hooks/useMovementAnalysis.ts` | **Modificar** (integrar quality gate + pose) |
| `src/lib/testPrioritization.ts` | **Modificar** (filtrar por status) |
| `src/components/protocol/ProtocolGenerator.tsx` | **Modificar** (respeitar status) |

### Riscos e Mitigações

1. **Performance mobile**: BlazePose lazy + Web Worker se necessário. Quality gate é Canvas puro (~10ms).
2. **Precisão pose em celular**: Thresholds conservadores iniciais; calibração clínica posterior.
3. **Tamanho bundle**: Lazy import de MediaPipe (~2MB); não afeta carregamento inicial.
4. **Regressão de fluxo manual**: Toda a camada é opt-in; se sem mídia, fluxo manual idêntico ao atual.

### Implementação em Fases

Dado o tamanho, sugiro implementar em 3 mensagens:
1. **Módulos base**: `types.ts`, `clinicalThresholds.ts`, `mediaQuality.ts`, `biomechanicalScoring.ts` + quality gate no UI
2. **Pose/landmarks**: `poseBiomechanics.ts` + integração no pipeline + fusão de evidências
3. **Persistência + priorização**: Metadata em `global_test_results` + filtro no engine de protocolo

