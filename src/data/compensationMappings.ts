// Compensation to muscle mapping based on FABRIK methodology (Table A)
// Updated with precise data from clinical assessment tables

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
    hyperactiveMuscles: ['Piriforme', 'Sóleo', 'Gastrocnêmio lateral', 'Bíceps femoral (cabeça curta)'],
    hypoactiveMuscles: ['Gastrocnêmio medial', 'Grácil', 'Sartório', 'Poplíteo'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia do Aquiles', 'Síndrome da banda iliotibial'],
  },
  {
    id: 'feet_eversion',
    label: 'Eversão dos pés (pronação/arco colapsa)',
    hyperactiveMuscles: ['Fibulares (curto e longo)', 'Gastrocnêmio lateral', 'Bíceps femoral', 'TFL'],
    hypoactiveMuscles: ['Tibial posterior', 'Flexor longo dos dedos', 'Tibial anterior', 'Glúteo médio'],
    associatedInjuries: ['Fascite plantar', 'Síndrome do estresse tibial medial', 'Tendinopatia tibial posterior'],
  },
  {
    id: 'knee_valgus',
    label: 'Joelhos valgos (cavam para dentro)',
    hyperactiveMuscles: ['Adutores', 'TFL', 'Vasto lateral', 'Gastrocnêmio lateral'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'VMO', 'Vasto medial oblíquo'],
    associatedInjuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA', 'Condromalácia'],
  },
  {
    id: 'knee_varus',
    label: 'Joelhos varos (arqueados para fora)',
    hyperactiveMuscles: ['Piriforme', 'Bíceps femoral', 'TFL', 'Glúteo mínimo', 'Adutores'],
    hypoactiveMuscles: ['Glúteo máximo', 'Vasto medial'],
    associatedInjuries: ['Sobrecarga lateral do joelho', 'Síndrome da banda iliotibial', 'Artrose lateral'],
  },
];

// Vista Lateral
export const ohsLateralCompensations: CompensationMapping[] = [
  {
    id: 'trunk_forward_lean',
    label: 'Inclinação excessiva do tronco para frente',
    hyperactiveMuscles: ['Sóleo', 'Gastrocnêmio', 'Flexores do quadril', 'Eretores da espinha'],
    hypoactiveMuscles: ['Glúteo máximo', 'Core anterior', 'Transverso abdominal'],
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
    label: 'Calcanhares sobem',
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
];

// ============================================
// Single-Leg Squat (SLS) Compensations
// ============================================

export const slsCompensations: CompensationMapping[] = [
  {
    id: 'knee_valgus',
    label: 'Valgismo de joelho',
    hyperactiveMuscles: ['Adutores', 'TFL', 'Vasto lateral', 'Gastrocnêmio lateral'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'VMO', 'Tibial posterior'],
    associatedInjuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA'],
  },
  {
    id: 'hip_drop',
    label: 'Queda do quadril contralateral (Trendelenburg)',
    hyperactiveMuscles: ['Quadrado lombar (lado de apoio)', 'TFL', 'Piriforme'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo mínimo', 'Core lateral', 'Oblíquos'],
    associatedInjuries: ['Síndrome da banda iliotibial', 'Tendinopatia glútea', 'Bursite trocantérica'],
  },
  {
    id: 'instability',
    label: 'Instabilidade geral',
    hyperactiveMuscles: ['TFL', 'Quadríceps (superficial)', 'Fibulares'],
    hypoactiveMuscles: ['Glúteo médio', 'Core estabilizador', 'Estabilizadores do tornozelo', 'Tibial posterior'],
    associatedInjuries: ['Entorses de tornozelo recorrentes', 'Risco lesão LCA', 'Instabilidade patelar'],
  },
  {
    id: 'tremor',
    label: 'Tremor durante o movimento',
    hyperactiveMuscles: ['Musculatura superficial em fadiga', 'Quadríceps', 'TFL'],
    hypoactiveMuscles: ['Estabilizadores profundos', 'Core', 'Glúteo médio', 'Multífidos'],
    associatedInjuries: ['Risco elevado de lesão por instabilidade', 'Fadiga muscular precoce'],
  },
  {
    id: 'foot_collapse',
    label: 'Pé colapsa (arco cai)',
    hyperactiveMuscles: ['Fibulares', 'Gastrocnêmio lateral', 'Extensor longo dos dedos'],
    hypoactiveMuscles: ['Tibial posterior', 'Flexor longo dos dedos', 'Intrínsecos do pé', 'Tibial anterior'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia tibial posterior', 'Síndrome do estresse tibial'],
  },
  {
    id: 'balance_loss',
    label: 'Perda de equilíbrio',
    hyperactiveMuscles: ['Flexores dos dedos', 'Musculatura superficial', 'Gastrocnêmio'],
    hypoactiveMuscles: ['Glúteo médio', 'Core', 'Proprioceptores do tornozelo', 'Estabilizadores profundos'],
    associatedInjuries: ['Entorses recorrentes', 'Risco elevado de quedas', 'Instabilidade crônica'],
  },
];

// ============================================
// Push-up Test Compensations
// ============================================

export const pushupCompensations: CompensationMapping[] = [
  {
    id: 'scapular_winging',
    label: 'Escápula alada (scapular winging)',
    hyperactiveMuscles: ['Peitoral menor', 'Romboides (em excesso)', 'Levantador da escápula'],
    hypoactiveMuscles: ['Serrátil anterior', 'Trapézio inferior', 'Trapézio médio'],
    associatedInjuries: ['Discinese escapular', 'Impacto do ombro', 'Tendinopatia do manguito rotador'],
  },
  {
    id: 'hips_drop',
    label: 'Quadril cai (hips drop)',
    hyperactiveMuscles: ['Eretores da espinha lombar', 'Flexores do quadril', 'Latíssimo do dorso'],
    hypoactiveMuscles: ['Transverso abdominal', 'Oblíquos', 'Glúteo máximo', 'Reto abdominal'],
    associatedInjuries: ['Dor lombar', 'Espondilolistese', 'Hiperlordose funcional'],
  },
  {
    id: 'lumbar_extension',
    label: 'Lombar estende (hiperlordose)',
    hyperactiveMuscles: ['Eretores da espinha lombar', 'Latíssimo do dorso', 'Psoas'],
    hypoactiveMuscles: ['Core anterior', 'Reto abdominal', 'Oblíquos', 'Transverso abdominal'],
    associatedInjuries: ['Dor lombar', 'Hérnia discal', 'Espondilolistese'],
  },
  {
    id: 'elbow_flare',
    label: 'Flare de cotovelos (cotovelos abrem)',
    hyperactiveMuscles: ['Peitoral maior (fibras esternais)', 'Deltóide anterior', 'Subescapular'],
    hypoactiveMuscles: ['Tríceps', 'Serrátil anterior', 'Rotadores externos do ombro', 'Infraespinhal'],
    associatedInjuries: ['Impacto do ombro', 'Tendinopatia do manguito rotador', 'Bursite subacromial'],
  },
  {
    id: 'misalignment',
    label: 'Desalinhamento corporal (assimetria)',
    hyperactiveMuscles: ['Musculatura dominante unilateral', 'Quadrado lombar', 'Oblíquo externo'],
    hypoactiveMuscles: ['Core estabilizador', 'Oblíquos', 'Estabilizadores escapulares', 'Multífidos'],
    associatedInjuries: ['Disfunção postural', 'Desequilíbrios musculares', 'Dor lombar assimétrica'],
  },
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
