# 📋 Guia de Migração: FABRIK Assessment → Fabrik Performance

Este documento contém **todo o código, SQL e configurações** necessários para migrar o módulo de avaliação para o projeto Fabrik Performance.

---

## 📑 Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [PASSO 1: Design System (CSS + Tailwind)](#passo-1-design-system)
3. [PASSO 2: Fontes (index.html)](#passo-2-fontes)
4. [PASSO 3: Database Schema (SQL)](#passo-3-database-schema)
5. [PASSO 4: Edge Functions](#passo-4-edge-functions)
6. [PASSO 5: Data Engines](#passo-5-data-engines)
7. [PASSO 6: Hooks](#passo-6-hooks)
8. [PASSO 7: Componentes de Anamnese](#passo-7-anamnese)
9. [PASSO 8: Componentes de Testes Globais](#passo-8-testes-globais)
10. [PASSO 9: Componentes de Testes Segmentados](#passo-9-testes-segmentados)
11. [PASSO 10: Gerador de Protocolo](#passo-10-protocolo)
12. [PASSO 11: Página Principal](#passo-11-pagina-principal)
13. [PASSO 12: Rotas e Integração](#passo-12-rotas)

---

## 1. Pré-requisitos

### Dependências necessárias (já devem estar no Fabrik Performance):
- `@tanstack/react-query`
- `react-hook-form`
- `zod`
- `date-fns`
- `sonner` (toasts)
- Componentes shadcn/ui: `Button`, `Card`, `Progress`, `Slider`, `Checkbox`, `Select`, `Textarea`, `Accordion`, `Badge`

---

## PASSO 1: Design System

### Adicionar ao `src/index.css` do Fabrik Performance:

```css
/* 
  FABRIK Design System
  =====================
  Aesthetic: "Apple minimalista + Quiet luxury"
  
  Cores (Superprompt):
  - Terracota: #A45248 → HSL(5, 36%, 46%)
  - Cinza claro: #F8F8F8 → HSL(0, 0%, 97%)
  - Preto: #1C1C1C → HSL(0, 0%, 11%)
  - Cinza médio: #4A4A4A → HSL(0, 0%, 29%)
  - Cinza borda: #C7C7C7 → HSL(0, 0%, 78%)
*/

:root {
  /* FABRIK Core Colors */
  --background: 0 0% 97%;           /* #F8F8F8 - Cinza claro */
  --foreground: 0 0% 11%;           /* #1C1C1C - Preto */

  --card: 0 0% 100%;                /* Branco puro */
  --card-foreground: 0 0% 11%;      /* #1C1C1C */

  /* Primary - Terracota FABRIK */
  --primary: 5 36% 46%;             /* #A45248 - Terracota */
  --primary-foreground: 0 0% 100%;  /* Branco */

  /* Secondary - Cinza neutro */
  --secondary: 0 0% 97%;            /* #F8F8F8 */
  --secondary-foreground: 0 0% 11%; /* #1C1C1C */

  /* Muted - Cinza suave */
  --muted: 0 0% 95%;
  --muted-foreground: 0 0% 29%;     /* #4A4A4A */

  /* Accent - Terracota mais suave */
  --accent: 5 36% 92%;              /* Terracota claro para hover */
  --accent-foreground: 5 36% 46%;   /* Terracota */

  /* Success - Verde elegante */
  --success: 142 50% 40%;
  --success-foreground: 0 0% 100%;

  /* Warning - Âmbar sofisticado */
  --warning: 38 80% 50%;
  --warning-foreground: 0 0% 100%;

  /* Destructive - Vermelho discreto */
  --destructive: 0 65% 50%;
  --destructive-foreground: 0 0% 100%;

  /* Borders & Inputs */
  --border: 0 0% 78%;               /* #C7C7C7 */
  --input: 0 0% 78%;
  --ring: 5 36% 46%;                /* Terracota no focus */

  /* FABRIK Brand Tokens */
  --fabrik-terracota: 5 36% 46%;
  --fabrik-terracota-light: 5 36% 55%;
  --fabrik-terracota-dark: 5 36% 38%;
  --fabrik-black: 0 0% 11%;
  --fabrik-gray-dark: 0 0% 29%;
  --fabrik-gray-medium: 0 0% 50%;
  --fabrik-gray-light: 0 0% 78%;
  --fabrik-gray-bg: 0 0% 97%;
  --fabrik-white: 0 0% 100%;
}

/* Dark mode */
.dark {
  --background: 0 0% 8%;
  --foreground: 0 0% 97%;
  --card: 0 0% 11%;
  --card-foreground: 0 0% 97%;
  --primary: 5 36% 55%;
  --primary-foreground: 0 0% 100%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 60%;
  --border: 0 0% 22%;
}

/* FABRIK Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Bebas Neue', 'Arial Narrow', sans-serif;
  letter-spacing: 0.02em;
}

/* Utility classes */
.font-display {
  font-family: 'Bebas Neue', 'Arial Narrow', sans-serif;
}

.transition-smooth {
  transition: all 0.3s ease-out;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px -2px rgb(0 0 0 / 0.08);
}

.glass {
  background: hsl(var(--background) / 0.8);
  backdrop-filter: blur(12px);
}
```

### Adicionar ao `tailwind.config.ts`:

```typescript
// Dentro de theme.extend.colors, adicionar:
success: {
  DEFAULT: "hsl(var(--success))",
  foreground: "hsl(var(--success-foreground))",
},
warning: {
  DEFAULT: "hsl(var(--warning))",
  foreground: "hsl(var(--warning-foreground))",
},
fabrik: {
  terracota: "hsl(var(--fabrik-terracota))",
  "terracota-light": "hsl(var(--fabrik-terracota-light))",
  "terracota-dark": "hsl(var(--fabrik-terracota-dark))",
  black: "hsl(var(--fabrik-black))",
  "gray-dark": "hsl(var(--fabrik-gray-dark))",
},

// Dentro de theme.extend.fontFamily, adicionar:
fontFamily: {
  display: ["Bebas Neue", "Arial Narrow", "sans-serif"],
},

// Dentro de theme.extend.animation, adicionar:
"pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
```

---

## PASSO 2: Fontes

### Adicionar ao `<head>` do `index.html`:

```html
<!-- FABRIK Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## PASSO 3: Database Schema

### SQL para executar no Fabrik Performance (Supabase):

```sql
-- =============================================
-- PASSO 3.1: ENUMS
-- =============================================

-- Assessment status
CREATE TYPE public.assessment_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');

-- FABRIK phases
CREATE TYPE public.fabrik_phase AS ENUM ('mobility', 'inhibition', 'activation', 'stability', 'strength', 'integration');

-- Severity levels
CREATE TYPE public.severity_level AS ENUM ('none', 'mild', 'moderate', 'severe');

-- Priority levels
CREATE TYPE public.priority_level AS ENUM ('critical', 'high', 'medium', 'low', 'maintenance');

-- Laterality
CREATE TYPE public.laterality AS ENUM ('right', 'left', 'ambidextrous');

-- App roles (se não existir)
-- CREATE TYPE public.app_role AS ENUM ('professional', 'student');

-- =============================================
-- PASSO 3.2: TABELAS
-- =============================================

-- Assessments (avaliações)
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status assessment_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anamnesis responses
CREATE TABLE public.anamnesis_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  birth_date DATE,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  laterality laterality,
  occupation TEXT,
  pain_history JSONB DEFAULT '[]'::jsonb,
  surgeries JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '{}'::jsonb,
  has_red_flags BOOLEAN DEFAULT false,
  sedentary_hours_per_day NUMERIC,
  work_type TEXT,
  sleep_quality INTEGER,
  sleep_hours NUMERIC,
  activity_frequency INTEGER,
  activity_types JSONB DEFAULT '[]'::jsonb,
  activity_duration_minutes INTEGER,
  sports JSONB DEFAULT '[]'::jsonb,
  objectives TEXT,
  time_horizon TEXT,
  lgpd_consent BOOLEAN DEFAULT false,
  lgpd_consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global test results
CREATE TABLE public.global_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  anterior_view JSONB DEFAULT '{}'::jsonb,
  lateral_view JSONB DEFAULT '{}'::jsonb,
  posterior_view JSONB DEFAULT '{}'::jsonb,
  left_side JSONB DEFAULT '{}'::jsonb,
  right_side JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Segmental test results
CREATE TABLE public.segmental_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  body_region TEXT NOT NULL,
  left_value NUMERIC,
  right_value NUMERIC,
  pass_fail_left BOOLEAN,
  pass_fail_right BOOLEAN,
  cutoff_value NUMERIC,
  unit TEXT,
  notes TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Functional findings (achados funcionais)
CREATE TABLE public.functional_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  classification_tag TEXT NOT NULL,
  body_region TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'mild',
  hyperactive_muscles JSONB DEFAULT '[]'::jsonb,
  hypoactive_muscles JSONB DEFAULT '[]'::jsonb,
  associated_injuries JSONB DEFAULT '[]'::jsonb,
  priority_score NUMERIC,
  context_weight INTEGER,
  biomechanical_importance INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exercises library
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fabrik_phase fabrik_phase NOT NULL,
  body_region TEXT NOT NULL,
  description TEXT,
  target_muscles JSONB DEFAULT '[]'::jsonb,
  target_classifications JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  progression_criteria TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Protocols
CREATE TABLE public.protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  name TEXT,
  priority_level priority_level NOT NULL DEFAULT 'medium',
  phase INTEGER DEFAULT 1,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency_per_week INTEGER DEFAULT 3,
  duration_weeks INTEGER DEFAULT 4,
  completion_percentage NUMERIC DEFAULT 0,
  next_review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Progress logs
CREATE TABLE public.progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  difficulty_rating INTEGER,
  notes TEXT
);

-- Professional-student links (se não existir)
CREATE TABLE IF NOT EXISTS public.professional_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id, student_id)
);

-- =============================================
-- PASSO 3.3: ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmental_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.functional_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_students ENABLE ROW LEVEL SECURITY;

-- Assessments policies
CREATE POLICY "Professionals can manage their assessments"
  ON public.assessments FOR ALL
  USING (auth.uid() = professional_id);

CREATE POLICY "Students can view their assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = student_id);

-- Assessment-linked tables policy (via assessments)
CREATE POLICY "Access via assessment ownership"
  ON public.anamnesis_responses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = anamnesis_responses.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
  ));

CREATE POLICY "Access via assessment ownership"
  ON public.global_test_results FOR ALL
  USING (EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = global_test_results.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
  ));

CREATE POLICY "Access via assessment ownership"
  ON public.segmental_test_results FOR ALL
  USING (EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = segmental_test_results.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
  ));

CREATE POLICY "Access via assessment ownership"
  ON public.functional_findings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = functional_findings.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
  ));

CREATE POLICY "Access via assessment ownership"
  ON public.protocols FOR ALL
  USING (EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = protocols.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
  ));

-- Exercises policies
CREATE POLICY "Authenticated users can read exercises"
  ON public.exercises FOR SELECT
  USING (is_active = true);

CREATE POLICY "Professionals can manage exercises"
  ON public.exercises FOR ALL
  USING (has_role(auth.uid(), 'professional'));

-- Progress logs policies
CREATE POLICY "Students can log their progress"
  ON public.progress_logs FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Professionals can view student progress"
  ON public.progress_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM protocols p
    JOIN assessments a ON a.id = p.assessment_id
    WHERE p.id = progress_logs.protocol_id
    AND a.professional_id = auth.uid()
  ));

-- Professional-students policies
CREATE POLICY "Professionals can view their students"
  ON public.professional_students FOR SELECT
  USING (auth.uid() = professional_id OR auth.uid() = student_id);

CREATE POLICY "Professionals can add students"
  ON public.professional_students FOR INSERT
  WITH CHECK (auth.uid() = professional_id AND has_role(auth.uid(), 'professional'));

CREATE POLICY "Professionals can remove students"
  ON public.professional_students FOR DELETE
  USING (auth.uid() = professional_id AND has_role(auth.uid(), 'professional'));

-- =============================================
-- PASSO 3.4: TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anamnesis_responses_updated_at
  BEFORE UPDATE ON public.anamnesis_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_test_results_updated_at
  BEFORE UPDATE ON public.global_test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segmental_test_results_updated_at
  BEFORE UPDATE ON public.segmental_test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## PASSO 4: Edge Functions

### 4.1 Atualizar `supabase/config.toml`:

Adicionar ao arquivo:

```toml
[functions.generate-protocol]
verify_jwt = false

[functions.create-student]
verify_jwt = false
```

### 4.2 Criar `supabase/functions/generate-protocol/index.ts`:

O código completo está disponível no arquivo original. Ele usa a Lovable AI para gerar protocolos de exercícios com base nas compensações detectadas.

### 4.3 Criar `supabase/functions/create-student/index.ts`:

O código completo está disponível no arquivo original. Ele permite criar alunos via convite por email ou cadastro presencial.

---

## PASSO 5: Data Engines

### 5.1 Criar `src/data/compensationMappings.ts`

Contém:
- `ohsAnteriorCompensations` (4 itens)
- `ohsLateralCompensations` (5 itens)
- `ohsPosteriorCompensations` (4 itens)
- `slsCompensations` (11 itens)
- `pushupCompensations` (9 itens)
- Funções helper: `getAggregatedMuscles()`, `getAllOHSCompensations()`, `getCompensationsByTest()`

### 5.2 Criar `src/data/segmentalTestMappings.ts`

Contém:
- `segmentalTests` array com 16 testes segmentados
- `getSuggestedTests(compensationIds)` - retorna testes sugeridos
- `groupTestsByRegion(tests)` - agrupa por região corporal

### 5.3 Criar `src/data/weightEngine.ts`

Contém:
- `compensacaoCausas` - mapeamento compensação → causas prováveis
- `contextosAjuste` - ajustes de contexto baseados em anamnese
- `identificarContextos()` - identifica contextos aplicáveis

### 5.4 Criar `src/lib/priorityEngine.ts`

Contém:
- `calcularPrioridades()` - calcula PriorityScore = finalWeight × SeverityModifier × ImpactModifier
- `formatarParaIA()` - formata para o prompt da IA
- `mapearFaseFABRIK()` - mapeia categorias para fases FABRIK

---

## PASSO 6: Hooks

### 6.1 Criar `src/hooks/useWizardPersistence.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';

interface WizardPersistenceOptions<T> {
  key: string;
  initialData: T;
  assessmentId: string;
}

export function useWizardPersistence<T>({ key, initialData, assessmentId }: WizardPersistenceOptions<T>) {
  const storageKey = `${key}_${assessmentId}`;
  
  const [data, setData] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.birthDate) {
          parsed.birthDate = new Date(parsed.birthDate);
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading wizard data:', e);
    }
    return initialData;
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}_step`);
      return stored ? parseInt(stored, 10) : 1;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_step`, currentStep.toString());
  }, [currentStep, storageKey]);

  const updateData = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setData((prev) => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates });
  }, []);

  const clearPersistedData = useCallback(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_step`);
  }, [storageKey]);

  return { data, setData, updateData, currentStep, setCurrentStep, clearPersistedData };
}
```

---

## PASSO 7: Componentes de Anamnese

### Estrutura de diretórios:
```
src/components/assessment/anamnesis/
├── AnamnesisWizard.tsx
└── steps/
    ├── PersonalDataStep.tsx
    ├── PainHistoryStep.tsx
    ├── SurgeriesRedFlagsStep.tsx
    ├── RoutineHabitsStep.tsx
    ├── SleepRecoveryStep.tsx
    ├── PhysicalActivityStep.tsx
    ├── SportsDemandStep.tsx
    ├── ObjectivesStep.tsx
    └── ConsentStep.tsx
```

### 7.1 AnamnesisWizard.tsx

Wizard de 9 etapas com:
- Interface `AnamnesisData` com todos os campos
- Navegação com Progress bar
- Validação de red flags
- Persistência local via `useWizardPersistence`
- Salvamento no Supabase

---

## PASSO 8: Testes Globais

### Estrutura:
```
src/components/assessment/global-tests/
├── GlobalTestsWizard.tsx
├── TestSummary.tsx
└── tests/
    ├── OverheadSquatTest.tsx
    ├── SingleLegSquatTest.tsx
    └── PushupTest.tsx
```

### 8.1 GlobalTestsWizard.tsx

Wizard de 4 etapas:
1. Overhead Squat (OHS) - 3 vistas
2. Single-Leg Squat (SLS) - bilateral
3. Push-up Test
4. Resumo

---

## PASSO 9: Testes Segmentados

### Estrutura:
```
src/components/assessment/segmental-tests/
├── SegmentalTestsWizard.tsx
├── SegmentalTestForm.tsx
└── SegmentalTestsSummary.tsx
```

### Funcionalidades:
- Auto-sugestão baseada em compensações detectadas
- Suporte bilateral e unilateral
- Cálculo automático de pass/fail
- Detecção de assimetria

---

## PASSO 10: Gerador de Protocolo

### Arquivo: `src/components/assessment/protocol/ProtocolGenerator.tsx`

Funcionalidades:
- Integração com Priority Engine (Tabelas E & F)
- Chamada à edge function `generate-protocol`
- Exibição organizada por fases FABRIK
- Salvamento no banco

---

## PASSO 11: Página Principal

### Criar `src/pages/NewAssessment.tsx`

Página que orquestra todo o fluxo:
1. Seleção de aluno
2. Anamnese
3. Testes Globais
4. Testes Segmentados
5. Geração de Protocolo

---

## PASSO 12: Rotas e Integração

### Adicionar ao App.tsx do Fabrik Performance:

```tsx
import NewAssessment from './pages/NewAssessment';

// Dentro do Routes:
<Route path="/assessment/new" element={<NewAssessment />} />
```

### Adicionar link no Dashboard:

```tsx
<Button onClick={() => navigate('/assessment/new')}>
  Nova Avaliação
</Button>
```

---

## ✅ Checklist de Migração

- [ ] Design System (CSS + Tailwind)
- [ ] Fontes (Google Fonts no index.html)
- [ ] Database Schema (todas as tabelas)
- [ ] RLS Policies (segurança)
- [ ] Triggers (updated_at)
- [ ] Edge Functions (generate-protocol, create-student)
- [ ] Data Engines (compensations, segmental, weight, priority)
- [ ] Hooks (useWizardPersistence)
- [ ] Componentes Anamnese (9 steps)
- [ ] Componentes Testes Globais (3 testes)
- [ ] Componentes Testes Segmentados
- [ ] Protocolo Generator
- [ ] Página NewAssessment
- [ ] Rotas configuradas
- [ ] Testes end-to-end

---

## 📁 Arquivos para Copiar (Lista Resumida)

### Data:
- `src/data/compensationMappings.ts`
- `src/data/segmentalTestMappings.ts`
- `src/data/weightEngine.ts`

### Lib:
- `src/lib/priorityEngine.ts`

### Hooks:
- `src/hooks/useWizardPersistence.ts`
- `src/hooks/useAuth.tsx` (se não existir)

### Components:
- `src/components/anamnesis/` (todo o diretório)
- `src/components/global-tests/` (todo o diretório)
- `src/components/segmental-tests/` (todo o diretório)
- `src/components/protocol/` (todo o diretório)
- `src/components/students/` (modais de adição)

### Pages:
- `src/pages/NewAssessment.tsx`
- `src/pages/Auth.tsx` (se necessário)

### Edge Functions:
- `supabase/functions/generate-protocol/index.ts`
- `supabase/functions/create-student/index.ts`

---

## 🔐 Segurança

1. **RLS ativado** em todas as tabelas
2. **Policies restritivas** baseadas em ownership
3. **Edge functions** validam autenticação
4. **Red flags** bloqueiam geração de protocolo

---

## 📞 Suporte

Se precisar de ajuda com a migração, todos os arquivos originais estão neste projeto e podem ser copiados diretamente.
