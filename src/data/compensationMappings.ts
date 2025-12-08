// Compensation to muscle mapping based on FABRIK methodology (Table A)

export interface CompensationMapping {
  id: string;
  label: string;
  hyperactiveMuscles: string[];
  hypoactiveMuscles: string[];
  associatedInjuries: string[];
}

// Overhead Squat (OHS) Compensations
export const ohsAnteriorCompensations: CompensationMapping[] = [
  {
    id: 'feet_turn_out',
    label: 'Pés giram para fora',
    hyperactiveMuscles: ['Sóleo', 'Gastrocnêmio lateral', 'Bíceps femoral (cabeça curta)'],
    hypoactiveMuscles: ['Gastrocnêmio medial', 'Grácil', 'Sartório', 'Poplíteo'],
    associatedInjuries: ['Fascite plantar', 'Tendinopatia do tendão de Aquiles', 'Síndrome da banda iliotibial'],
  },
  {
    id: 'feet_flatten',
    label: 'Pés eversão/achatam (arco)',
    hyperactiveMuscles: ['Fibulares', 'Gastrocnêmio lateral', 'Bíceps femoral'],
    hypoactiveMuscles: ['Tibial posterior', 'Flexor longo dos dedos', 'Tibial anterior'],
    associatedInjuries: ['Fascite plantar', 'Síndrome do estresse tibial medial', 'Tendinopatia tibial posterior'],
  },
  {
    id: 'knees_cave_in',
    label: 'Joelhos valgos (cavam para dentro)',
    hyperactiveMuscles: ['Adutores', 'TFL', 'Vasto lateral'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'VMO', 'Vasto medial'],
    associatedInjuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA', 'Condromalácia'],
  },
];

export const ohsLateralCompensations: CompensationMapping[] = [
  {
    id: 'excessive_forward_lean',
    label: 'Inclinação excessiva do tronco para frente',
    hyperactiveMuscles: ['Sóleo', 'Gastrocnêmio', 'Quadríceps', 'Flexores do quadril'],
    hypoactiveMuscles: ['Glúteo máximo', 'Eretores da espinha', 'Core (estabilizadores)'],
    associatedInjuries: ['Dor lombar', 'Impacto femoroacetabular', 'Tendinopatia patelar'],
  },
  {
    id: 'lumbar_hyperextension',
    label: 'Hiperextensão lombar (arco excessivo)',
    hyperactiveMuscles: ['Eretores da espinha lombar', 'Latíssimo do dorso', 'Flexores do quadril'],
    hypoactiveMuscles: ['Transverso abdominal', 'Oblíquos internos', 'Glúteo máximo', 'Isquiotibiais'],
    associatedInjuries: ['Espondilolistese', 'Dor lombar', 'Hérnia discal'],
  },
  {
    id: 'heels_rise',
    label: 'Calcanhares sobem',
    hyperactiveMuscles: ['Sóleo', 'Gastrocnêmio'],
    hypoactiveMuscles: ['Tibial anterior', 'Flexores profundos do tornozelo'],
    associatedInjuries: ['Tendinopatia do tendão de Aquiles', 'Fascite plantar'],
  },
  {
    id: 'arms_fall_forward',
    label: 'Braços caem para frente',
    hyperactiveMuscles: ['Peitoral maior', 'Latíssimo do dorso', 'Redondo maior'],
    hypoactiveMuscles: ['Trapézio médio e inferior', 'Romboides', 'Serrátil anterior', 'Manguito rotador'],
    associatedInjuries: ['Impacto do ombro', 'Síndrome do desfiladeiro torácico'],
  },
];

export const ohsPosteriorCompensations: CompensationMapping[] = [
  {
    id: 'asymmetric_shift',
    label: 'Shift pélvico assimétrico',
    hyperactiveMuscles: ['Quadrado lombar (lado do shift)', 'Adutores (lado oposto)', 'TFL'],
    hypoactiveMuscles: ['Glúteo médio (lado oposto)', 'Oblíquos', 'Multífidos'],
    associatedInjuries: ['Disfunção sacroilíaca', 'Dor lombar unilateral', 'Síndrome do piriforme'],
  },
  {
    id: 'feet_eversion',
    label: 'Eversão dos pés',
    hyperactiveMuscles: ['Fibulares', 'Gastrocnêmio lateral'],
    hypoactiveMuscles: ['Tibial posterior', 'Tibial anterior'],
    associatedInjuries: ['Fascite plantar', 'Síndrome do estresse tibial medial'],
  },
];

// Single-Leg Squat (SLS) Compensations
export const slsCompensations: CompensationMapping[] = [
  {
    id: 'knee_valgus',
    label: 'Valgismo de joelho',
    hyperactiveMuscles: ['Adutores', 'TFL', 'Vasto lateral'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo máximo', 'VMO'],
    associatedInjuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA'],
  },
  {
    id: 'hip_drop',
    label: 'Queda do quadril contralateral (Trendelenburg)',
    hyperactiveMuscles: ['Quadrado lombar (lado de apoio)', 'TFL'],
    hypoactiveMuscles: ['Glúteo médio', 'Glúteo mínimo', 'Core lateral'],
    associatedInjuries: ['Síndrome da banda iliotibial', 'Tendinopatia glútea', 'Bursite trocantérica'],
  },
  {
    id: 'trunk_rotation',
    label: 'Rotação do tronco',
    hyperactiveMuscles: ['Oblíquo externo (lado rotação)', 'Rotadores do quadril'],
    hypoactiveMuscles: ['Oblíquo interno', 'Transverso abdominal', 'Multífidos'],
    associatedInjuries: ['Disfunção sacroilíaca', 'Dor lombar'],
  },
  {
    id: 'trunk_lateral_lean',
    label: 'Inclinação lateral do tronco',
    hyperactiveMuscles: ['Quadrado lombar', 'TFL'],
    hypoactiveMuscles: ['Glúteo médio', 'Core estabilizador'],
    associatedInjuries: ['Síndrome da banda iliotibial', 'Dor lombar'],
  },
  {
    id: 'excessive_forward_lean',
    label: 'Inclinação excessiva do tronco para frente',
    hyperactiveMuscles: ['Flexores do quadril', 'Eretores da espinha'],
    hypoactiveMuscles: ['Glúteo máximo', 'Core anterior'],
    associatedInjuries: ['Impacto femoroacetabular', 'Dor lombar'],
  },
];

// Push-up Test Compensations
export const pushupCompensations: CompensationMapping[] = [
  {
    id: 'lumbar_lordosis',
    label: 'Lordose lombar excessiva (quadril cai)',
    hyperactiveMuscles: ['Eretores da espinha lombar', 'Flexores do quadril', 'Latíssimo do dorso'],
    hypoactiveMuscles: ['Transverso abdominal', 'Oblíquos', 'Glúteo máximo', 'Reto abdominal'],
    associatedInjuries: ['Dor lombar', 'Espondilolistese'],
  },
  {
    id: 'hip_hike',
    label: 'Elevação do quadril (quadril sobe)',
    hyperactiveMuscles: ['Reto abdominal', 'Flexores do quadril', 'Oblíquos'],
    hypoactiveMuscles: ['Estabilizadores escapulares', 'Tríceps', 'Peitoral'],
    associatedInjuries: ['Dor no ombro', 'Impacto escapular'],
  },
  {
    id: 'scapular_winging',
    label: 'Escápula alada',
    hyperactiveMuscles: ['Peitoral menor', 'Romboides (em excesso)', 'Levantador da escápula'],
    hypoactiveMuscles: ['Serrátil anterior', 'Trapézio inferior'],
    associatedInjuries: ['Discinese escapular', 'Impacto do ombro', 'Tendinopatia do manguito rotador'],
  },
  {
    id: 'shoulder_protraction',
    label: 'Protração excessiva dos ombros',
    hyperactiveMuscles: ['Peitoral maior', 'Peitoral menor', 'Serrátil anterior (em excesso)'],
    hypoactiveMuscles: ['Romboides', 'Trapézio médio', 'Trapézio inferior'],
    associatedInjuries: ['Síndrome do desfiladeiro torácico', 'Dor cervical'],
  },
  {
    id: 'cervical_hyperextension',
    label: 'Hiperextensão cervical (cabeça para cima)',
    hyperactiveMuscles: ['Extensores cervicais superiores', 'Levantador da escápula', 'Trapézio superior'],
    hypoactiveMuscles: ['Flexores cervicais profundos', 'Longus colli', 'Longus capitis'],
    associatedInjuries: ['Cervicalgia', 'Cefaleia tensional', 'Síndrome do chicote'],
  },
  {
    id: 'head_forward',
    label: 'Cabeça projetada para frente',
    hyperactiveMuscles: ['Suboccipitais', 'Esternocleidomastóideo', 'Escalenos'],
    hypoactiveMuscles: ['Flexores cervicais profundos', 'Trapézio inferior'],
    associatedInjuries: ['Cervicalgia', 'Cefaleia tensional', 'Disfunção temporomandibular'],
  },
];

// Helper function to get all unique muscles from selected compensations
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
