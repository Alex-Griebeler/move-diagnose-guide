// Compensation to muscle mapping based on FABRIK methodology (Table A)
// Updated with precise data from clinical assessment tables (Novas_tabelas_app_movimento)

export interface CompensationMapping {
  id: string;
  label: string;
  hyperactiveMuscles: string[];
  hypoactiveMuscles: string[];
  associatedInjuries: string[];
}

// ============================================
// Overhead Squat (OHS) Compensations
// ============================================

// Vista Anterior
export const ohsAnteriorCompensations: CompensationMapping[] = [
  {
    id: 'feet_abduction',
    label: 'Pés abduzidos (giram para fora)',
    hyperactiveMuscles: ['Piriforme', 'Rotadores laterais do quadril', 'Sóleo', 'Gastrocnêmio lateral', 'Bíceps femoral (cabeça curta)'],
    hypoactiveMuscles: ['Rotadores mediais do quadril', 'Gastrocnêmio medial', 'Grácil', 'Sartório', 'Poplíteo'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia do Aquiles', 'Síndrome da banda iliotibial'],
  },
  {
    id: 'feet_eversion',
    label: 'Queda do arco plantar',
    hyperactiveMuscles: ['Fibulares (curto e longo)', 'Gastrocnêmio lateral', 'Bíceps femoral', 'TFL'],
    hypoactiveMuscles: ['Tibial posterior', 'Flexor longo dos dedos', 'Tibial anterior', 'Glúteo médio'],
    associatedInjuries: ['Fascite plantar', 'Síndrome do estresse tibial medial', 'Tendinopatia tibial posterior'],
  },
  {
    id: 'knee_valgus',
    label: 'Valgo dinâmico de joelho',
    hyperactiveMuscles: ['Adutores', 'TFL', 'Gastrocnêmio lateral', 'Vasto lateral', 'Bíceps femoral (cabeça curta)'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'Vasto medial oblíquo (VMO)', 'Rotadores laterais do quadril'],
    associatedInjuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA', 'Condromalácia'],
  },
  {
    id: 'knee_varus',
    label: 'Joelhos varos (arqueados para fora)',
    hyperactiveMuscles: ['Tensor da fáscia lata (TFL)', 'Piriforme', 'Glúteo mínimo', 'Bíceps femoral', 'Adutores (em algumas cadeias)'],
    hypoactiveMuscles: ['Glúteo máximo', 'Glúteo médio (porção posterior)', 'Vasto medial'],
    associatedInjuries: ['Sobrecarga lateral do joelho', 'Síndrome da banda iliotibial', 'Artrose lateral'],
  },
];

// Vista Lateral
export const ohsLateralCompensations: CompensationMapping[] = [
  {
    id: 'trunk_forward_lean',
    label: 'Inclinação excessiva do tronco para frente',
    hyperactiveMuscles: ['Sóleo', 'Gastrocnêmio', 'Flexores do quadril (iliopsoas, reto femoral)', 'Abdominais (reto abdominal)'],
    hypoactiveMuscles: ['Glúteo máximo', 'Eretores da espinha torácica', 'Core estabilizador'],
    associatedInjuries: ['Dor lombar', 'Impacto femoroacetabular', 'Tendinopatia patelar'],
  },
  {
    id: 'lumbar_hyperextension',
    label: 'Hiperextensão lombar (arco excessivo)',
    hyperactiveMuscles: ['Eretores da espinha lombar', 'Latíssimo do dorso', 'Psoas', 'Reto femoral'],
    hypoactiveMuscles: ['Transverso abdominal', 'Oblíquos internos', 'Glúteo máximo', 'Isquiotibiais'],
    associatedInjuries: ['Espondilolistese', 'Dor lombar', 'Hérnia discal', 'Estenose lombar'],
  },
  {
    id: 'spine_flexion',
    label: 'Flexão da coluna (arredonda/butt wink)',
    hyperactiveMuscles: ['Isquiotibiais', 'Glúteo máximo (encurtado)', 'Reto abdominal'],
    hypoactiveMuscles: ['Eretores da espinha lombar', 'Multífidos', 'Flexores do quadril'],
    associatedInjuries: ['Hérnia discal', 'Dor lombar', 'Disfunção sacroilíaca', 'Protrusão discal'],
  },
  {
    id: 'heels_rise',
    label: 'Déficit de dorsiflexão do tornozelo',
    hyperactiveMuscles: ['Sóleo', 'Gastrocnêmio', 'Flexores plantares'],
    hypoactiveMuscles: ['Tibial anterior', 'Dorsiflexores do tornozelo'],
    associatedInjuries: ['Tendinopatia do Aquiles', 'Fascite plantar', 'Instabilidade anterior do joelho'],
  },
  {
    id: 'arms_fall_forward',
    label: 'Braços caem para frente',
    hyperactiveMuscles: ['Peitoral maior', 'Latíssimo do dorso', 'Redondo maior', 'Subescapular'],
    hypoactiveMuscles: ['Trapézio médio e inferior', 'Romboides', 'Serrátil anterior', 'Manguito rotador'],
    associatedInjuries: ['Impacto do ombro', 'Síndrome do desfiladeiro torácico', 'Cifose torácica'],
  },
];

// Vista Posterior
export const ohsPosteriorCompensations: CompensationMapping[] = [
  {
    id: 'asymmetric_shift',
    label: 'Shift pélvico assimétrico',
    hyperactiveMuscles: ['Quadrado lombar (lado do shift)', 'Adutores (lado oposto)', 'TFL', 'Piriforme'],
    hypoactiveMuscles: ['Glúteo médio (lado oposto)', 'Oblíquos', 'Multífidos', 'Core estabilizador'],
    associatedInjuries: ['Disfunção sacroilíaca', 'Dor lombar unilateral', 'Síndrome do piriforme'],
  },
  {
    id: 'trunk_rotation',
    label: 'Rotação do tronco',
    hyperactiveMuscles: ['Oblíquo externo (lado dominante)', 'Latíssimo do dorso', 'Quadrado lombar'],
    hypoactiveMuscles: ['Oblíquo interno', 'Multífidos', 'Core estabilizador', 'Transverso abdominal'],
    associatedInjuries: ['Disfunção sacroilíaca', 'Dor lombar assimétrica', 'Escoliose funcional'],
  },
  {
    id: 'feet_eversion_posterior',
    label: 'Queda do arco plantar (vista posterior)',
    hyperactiveMuscles: ['Gastrocnêmio lateral', 'Bíceps femoral', 'TFL', 'Fibulares'],
    hypoactiveMuscles: ['Tibial posterior', 'Glúteo médio', 'Flexor longo dos dedos'],
    associatedInjuries: ['Lesões plantares', 'Lesões tibiais', 'Instabilidade de tornozelo'],
  },
];

// ============================================
// Single-Leg Squat (SLS) Compensations
// Separado por vista: Anterior, Lateral, Posterior
// ============================================

// SLS - Vista Anterior (observar de frente)
export const slsAnteriorCompensations: CompensationMapping[] = [
  {
    id: 'knee_valgus',
    label: 'Valgo dinâmico de joelho',
    hyperactiveMuscles: ['Adutores', 'TFL', 'Gastrocnêmio lateral', 'Vasto lateral', 'Bíceps femoral (cabeça curta)'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'Vasto medial oblíquo (VMO)', 'Rotadores laterais do quadril'],
    associatedInjuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA'],
  },
  {
    id: 'foot_collapse',
    label: 'Queda do arco plantar',
    hyperactiveMuscles: ['Fibulares', 'Gastrocnêmio lateral', 'Extensor longo dos dedos'],
    hypoactiveMuscles: ['Tibial posterior', 'Flexor longo dos dedos', 'Intrínsecos do pé', 'Tibial anterior'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia tibial posterior', 'Síndrome do estresse tibial'],
  },
  {
    id: 'feet_abduction_sls',
    label: 'Pés abduzidos (giram para fora)',
    hyperactiveMuscles: ['Piriforme', 'Rotadores laterais do quadril', 'Sóleo', 'Gastrocnêmio lateral', 'Bíceps femoral (cabeça curta)'],
    hypoactiveMuscles: ['Rotadores mediais do quadril', 'Gastrocnêmio medial', 'Grácil', 'Sartório', 'Poplíteo'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia do Aquiles', 'Síndrome da banda iliotibial'],
  },
  {
    id: 'trunk_rotation_medial_anterior',
    label: 'Rotação medial do tronco',
    hyperactiveMuscles: ['Oblíquos internos (mesmo lado)', 'Oblíquos externos', 'TFL'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'Core estabilizador'],
    associatedInjuries: ['Valgo persistente', 'Sobrecarga lombar'],
  },
  {
    id: 'trunk_rotation_lateral_anterior',
    label: 'Rotação lateral do tronco',
    hyperactiveMuscles: ['Oblíquos externos (lado oposto)', 'Quadrado lombar'],
    hypoactiveMuscles: ['Glúteo médio', 'Oblíquos internos', 'Core estabilizador'],
    associatedInjuries: ['Desequilíbrio rotacional', 'Dor lombar'],
  },
  {
    id: 'balance_loss',
    label: 'Perda de equilíbrio',
    hyperactiveMuscles: ['TFL', 'Quadríceps (superficial)', 'Fibulares', 'Flexores dos dedos', 'Musculatura superficial', 'Gastrocnêmio'],
    hypoactiveMuscles: ['Glúteo médio', 'Core estabilizador', 'Estabilizadores do tornozelo', 'Tibial posterior', 'Core', 'Proprioceptores do tornozelo', 'Estabilizadores profundos', 'Multífidos'],
    associatedInjuries: ['Entorses de tornozelo recorrentes', 'Risco lesão LCA', 'Instabilidade patelar', 'Risco elevado de quedas', 'Instabilidade crônica', 'Fadiga muscular precoce'],
  },
];

// SLS - Vista Lateral (observar de lado) - NOVA VISTA
// Compensações de plano sagital que NÃO são detectáveis da vista posterior
export const slsLateralCompensations: CompensationMapping[] = [
  {
    id: 'trunk_forward_lean_sls',
    label: 'Inclinação anterior do tronco',
    hyperactiveMuscles: ['Iliopsoas', 'Reto femoral', 'Eretores da espinha lombar'],
    hypoactiveMuscles: ['Glúteo máximo', 'Core anterior', 'Transverso abdominal'],
    associatedInjuries: ['Sobrecarga lombar', 'Impacto do quadril'],
  },
  {
    id: 'ankle_mobility_deficit_sls',
    label: 'Déficit de mobilidade de tornozelo',
    hyperactiveMuscles: ['Gastrocnêmio', 'Sóleo', 'Flexores plantares', 'Tibial posterior'],
    hypoactiveMuscles: ['Tibial anterior', 'Dorsiflexores do tornozelo'],
    associatedInjuries: ['Tendinopatia do Aquiles', 'Fascite plantar', 'Compensação proximal em joelho e quadril', 'Instabilidade anterior do joelho'],
  },
];

// SLS - Vista Posterior (observar por trás)
// APENAS compensações do plano frontal/transversal (detectáveis por trás)
export const slsPosteriorCompensations: CompensationMapping[] = [
  {
    id: 'hip_drop',
    label: 'Queda do quadril contralateral (Trendelenburg)',
    hyperactiveMuscles: ['Quadrado lombar (lado de apoio)', 'TFL', 'Piriforme', 'Adutores'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo mínimo', 'Core lateral', 'Oblíquos'],
    associatedInjuries: ['Síndrome da banda iliotibial', 'Tendinopatia glútea', 'Bursite trocantérica'],
  },
  {
    id: 'hip_hike',
    label: 'Elevação do quadril contralateral (hip hike)',
    hyperactiveMuscles: ['Quadrado lombar (lado oposto)', 'TFL', 'Glúteo mínimo', 'Adutores'],
    hypoactiveMuscles: ['Glúteo médio (mesmo lado)', 'Core estabilizador'],
    associatedInjuries: ['Compensações sacroilíacas', 'Dor lateral de quadril'],
  },
  {
    id: 'trunk_rotation_medial',
    label: 'Rotação medial do tronco',
    hyperactiveMuscles: ['Oblíquos internos (mesmo lado)', 'Oblíquos externos', 'TFL'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'Core estabilizador'],
    associatedInjuries: ['Valgo persistente', 'Sobrecarga lombar'],
  },
  {
    id: 'trunk_rotation_lateral',
    label: 'Rotação lateral do tronco',
    hyperactiveMuscles: ['Oblíquos externos (lado oposto)', 'Quadrado lombar'],
    hypoactiveMuscles: ['Glúteo médio', 'Oblíquos internos', 'Core estabilizador'],
    associatedInjuries: ['Desequilíbrio rotacional', 'Dor lombar'],
  },
  {
    id: 'foot_collapse_posterior',
    label: 'Queda do arco plantar (vista posterior)',
    hyperactiveMuscles: ['Fibulares', 'Gastrocnêmio lateral', 'Extensor longo dos dedos'],
    hypoactiveMuscles: ['Tibial posterior', 'Flexor longo dos dedos', 'Intrínsecos do pé', 'Tibial anterior'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia tibial posterior', 'Síndrome do estresse tibial'],
  },
  {
    id: 'feet_abduction_posterior',
    label: 'Pés abduzidos (vista posterior)',
    hyperactiveMuscles: ['Piriforme', 'Rotadores laterais do quadril', 'Sóleo', 'Gastrocnêmio lateral', 'Bíceps femoral (cabeça curta)'],
    hypoactiveMuscles: ['Rotadores mediais do quadril', 'Gastrocnêmio medial', 'Grácil', 'Sartório', 'Poplíteo'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia do Aquiles', 'Síndrome da banda iliotibial'],
  },
];

// SLS - Todas as compensações (para backward compatibility)
export const slsCompensations: CompensationMapping[] = [
  ...slsAnteriorCompensations,
  ...slsLateralCompensations,
  ...slsPosteriorCompensations,
];

// ============================================
// Push-up Test Compensations
// Vistas: Lateral (plano sagital) e Posterior (escápulas)
// ============================================

// Push-up - Vista Lateral (observar de lado) - NOVA VISTA
// Compensações de plano sagital que NÃO são detectáveis da vista posterior
export const pushupLateralCompensations: CompensationMapping[] = [
  {
    id: 'hip_elevation',
    label: 'Elevação do quadril (pike)',
    hyperactiveMuscles: ['Flexores quadril', 'Reto abdominal'],
    hypoactiveMuscles: ['Glúteos', 'Core estabilizador', 'Transverso abdominal'],
    associatedInjuries: ['Sobrecarga lombar', 'Déficit core'],
  },
  {
    id: 'hip_drop_pushup',
    label: 'Queda do quadril (push-up)',
    hyperactiveMuscles: ['Eretores lombares', 'Quadrado lombar'],
    hypoactiveMuscles: ['Core anterior', 'Glúteos', 'Transverso abdominal'],
    associatedInjuries: ['Dor lombar', 'Hiperlordose'],
  },
];

// Push-up - Vista Posterior (observar por trás)
// APENAS compensações escapulares e de ombro (detectáveis por trás)
export const pushupPosteriorCompensations: CompensationMapping[] = [
  {
    id: 'scapular_winging',
    label: 'Escápula alada (scapular winging)',
    hyperactiveMuscles: ['Peitoral menor', 'Romboides (em excesso)', 'Levantador da escápula', 'Trapézio superior'],
    hypoactiveMuscles: ['Serrátil anterior', 'Trapézio inferior', 'Trapézio médio'],
    associatedInjuries: ['Discinese escapular', 'Impacto do ombro', 'Tendinopatia do manguito rotador'],
  },
  {
    id: 'elbow_flare',
    label: 'Flare de cotovelos (cotovelos abrem)',
    hyperactiveMuscles: ['Peitoral maior (fibras esternais)', 'Deltóide anterior', 'Subescapular', 'Deltóide médio'],
    hypoactiveMuscles: ['Tríceps', 'Serrátil anterior', 'Rotadores externos do ombro', 'Infraespinhal'],
    associatedInjuries: ['Impacto do ombro', 'Tendinopatia do manguito rotador', 'Bursite subacromial'],
  },
  {
    id: 'shoulder_protraction',
    label: 'Protração excessiva dos ombros',
    hyperactiveMuscles: ['Peitoral menor', 'Serrátil anterior (dominância)', 'Peitoral maior'],
    hypoactiveMuscles: ['Trapézio médio', 'Romboides', 'Trapézio inferior'],
    associatedInjuries: ['Cifose torácica', 'Impacto do ombro', 'Síndrome do desfiladeiro torácico'],
  },
  {
    id: 'shoulder_retraction_insufficient',
    label: 'Retração escapular insuficiente',
    hyperactiveMuscles: ['Peitoral menor', 'Serrátil anterior'],
    hypoactiveMuscles: ['Romboides', 'Trapézio médio', 'Trapézio inferior'],
    associatedInjuries: ['Discinese escapular', 'Impacto do ombro'],
  },
];

// Push-up - Todas as compensações (para backward compatibility)
export const pushupCompensations: CompensationMapping[] = [
  ...pushupLateralCompensations,
  ...pushupPosteriorCompensations,
];

// ============================================
// Helper Functions
// ============================================

// Get all unique muscles from selected compensations
export function getAggregatedMuscles(compensations: CompensationMapping[], selectedIds: string[]) {
  const hyperactive = new Set<string>();
  const hypoactive = new Set<string>();
  const injuries = new Set<string>();

  compensations
    .filter((c) => selectedIds.includes(c.id))
    .forEach((c) => {
      c.hyperactiveMuscles.forEach((m) => hyperactive.add(m));
      c.hypoactiveMuscles.forEach((m) => hypoactive.add(m));
      c.associatedInjuries.forEach((i) => injuries.add(i));
    });

  return {
    hyperactiveMuscles: Array.from(hyperactive),
    hypoactiveMuscles: Array.from(hypoactive),
    associatedInjuries: Array.from(injuries),
  };
}

// Get all OHS compensations combined
export function getAllOHSCompensations(): CompensationMapping[] {
  return [...ohsAnteriorCompensations, ...ohsLateralCompensations, ...ohsPosteriorCompensations];
}

// Get all SLS compensations combined
export function getAllSLSCompensations(): CompensationMapping[] {
  return [...slsAnteriorCompensations, ...slsLateralCompensations, ...slsPosteriorCompensations];
}

// Get all compensations for a specific test
export function getCompensationsByTest(testName: 'ohs' | 'sls' | 'pushup'): CompensationMapping[] {
  switch (testName) {
    case 'ohs':
      return getAllOHSCompensations();
    case 'sls':
      return slsCompensations;
    case 'pushup':
      return pushupCompensations;
  }
}
