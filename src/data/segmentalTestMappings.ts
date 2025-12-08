// Segmental tests suggested based on global test compensations
// Updated to sync triggeredBy with actual compensation IDs

export interface SegmentalTest {
  id: string;
  name: string;
  bodyRegion: string;
  description: string;
  unit: string;
  cutoffValue?: number;
  isBilateral: boolean;
  instructions: string;
  // Which compensation IDs trigger this test suggestion
  triggeredBy: string[];
}

export const segmentalTests: SegmentalTest[] = [
  // ============================================
  // Ankle/Foot Tests
  // ============================================
  {
    id: 'ankle_dorsiflexion',
    name: 'Dorsiflexão de Tornozelo (Knee-to-Wall)',
    bodyRegion: 'Tornozelo',
    description: 'Avalia a amplitude de dorsiflexão do tornozelo em cadeia fechada',
    unit: 'cm',
    cutoffValue: 10,
    isBilateral: true,
    instructions: 'Posicione o pé paralelo à parede. Avance o joelho em direção à parede mantendo o calcanhar no solo. Meça a distância do hálux até a parede.',
    triggeredBy: [
      // OHS Lateral/Posterior
      'heels_rise', 'heels_rise_posterior', 'feet_eversion', 'feet_eversion_posterior',
      // SLS
      'foot_collapse',
    ],
  },
  {
    id: 'calf_flexibility',
    name: 'Flexibilidade de Panturrilha',
    bodyRegion: 'Tornozelo',
    description: 'Avalia o encurtamento do complexo gastrocnêmio-sóleo',
    unit: 'graus',
    cutoffValue: 20,
    isBilateral: true,
    instructions: 'Em decúbito dorsal, com joelho estendido, realize dorsiflexão passiva máxima. Meça o ângulo em relação à posição neutra.',
    triggeredBy: [
      // OHS
      'heels_rise', 'heels_rise_posterior', 'feet_abduction',
    ],
  },

  // ============================================
  // Hip Tests
  // ============================================
  {
    id: 'hip_flexor_length',
    name: 'Teste de Thomas Modificado',
    bodyRegion: 'Quadril',
    description: 'Avalia encurtamento de flexores do quadril (iliopsoas, reto femoral, TFL)',
    unit: 'graus',
    cutoffValue: 0,
    isBilateral: true,
    instructions: 'Paciente em decúbito dorsal na borda da maca. Flexione um quadril ao máximo e observe a posição da coxa contralateral. Avalie extensão do quadril e flexão do joelho.',
    triggeredBy: [
      // OHS Lateral
      'lumbar_hyperextension', 'trunk_forward_lean', 'spine_flexion',
      // SLS
      'trunk_forward_lean_sls', 'hip_hike',
      // Push-up
      'lumbar_extension', 'hips_drop', 'hip_elevation',
    ],
  },
  {
    id: 'hip_rotation',
    name: 'Rotação Interna/Externa do Quadril',
    bodyRegion: 'Quadril',
    description: 'Avalia amplitude de rotação do quadril em posição prona',
    unit: 'graus',
    cutoffValue: 45,
    isBilateral: true,
    instructions: 'Em decúbito ventral com joelho flexionado a 90°. Realize rotação interna e externa passivamente. Meça os ângulos de cada movimento.',
    triggeredBy: [
      // OHS Anterior/Posterior
      'knee_valgus', 'knee_varus', 'asymmetric_shift', 'trunk_rotation',
      // SLS
      'trunk_rotation_medial', 'trunk_rotation_lateral',
    ],
  },
  {
    id: 'ober_test',
    name: 'Teste de Ober (TFL/Banda IT)',
    bodyRegion: 'Quadril',
    description: 'Avalia encurtamento do TFL e banda iliotibial',
    unit: 'graus',
    cutoffValue: 0,
    isBilateral: true,
    instructions: 'Decúbito lateral. Estabilize a pelve e realize abdução + extensão do quadril, depois solte. A coxa deve cair abaixo da horizontal.',
    triggeredBy: [
      // OHS Anterior
      'knee_valgus', 'knee_varus',
      // SLS
      'hip_drop', 'hip_hike',
    ],
  },
  {
    id: 'hip_abduction_strength',
    name: 'Força de Abdutores do Quadril',
    bodyRegion: 'Quadril',
    description: 'Avalia força isométrica dos abdutores (glúteo médio)',
    unit: 'escala 0-5',
    cutoffValue: 4,
    isBilateral: true,
    instructions: 'Em decúbito lateral, realize abdução isométrica contra resistência manual. Gradue de 0 a 5 conforme escala de Oxford.',
    triggeredBy: [
      // OHS Anterior/Posterior
      'knee_valgus', 'asymmetric_shift',
      // SLS
      'hip_drop', 'hip_hike', 'instability', 'balance_loss',
    ],
  },

  // ============================================
  // Core/Spine Tests
  // ============================================
  {
    id: 'prone_instability',
    name: 'Teste de Instabilidade em Prono',
    bodyRegion: 'Lombar',
    description: 'Avalia a estabilidade segmentar lombar',
    unit: 'positivo/negativo',
    isBilateral: false,
    instructions: 'Paciente em prono sobre a maca com pernas para fora. Realize pressão sobre processos espinhosos com e sem ativação de extensores. Dor que alivia com ativação muscular indica instabilidade.',
    triggeredBy: [
      // OHS Lateral/Posterior
      'lumbar_hyperextension', 'asymmetric_shift', 'spine_flexion',
      // Push-up
      'lumbar_extension', 'hips_drop', 'hip_elevation',
    ],
  },
  {
    id: 'trunk_endurance_flexor',
    name: 'Resistência de Flexores do Tronco',
    bodyRegion: 'Core',
    description: 'Avalia resistência isométrica dos flexores do tronco',
    unit: 'segundos',
    cutoffValue: 60,
    isBilateral: false,
    instructions: 'Posição de flexão parcial do tronco (60°) com joelhos e quadris flexionados a 90°. Mantenha a posição o máximo possível.',
    triggeredBy: [
      // OHS Lateral
      'lumbar_hyperextension',
      // Push-up
      'lumbar_extension', 'hips_drop', 'hip_elevation',
    ],
  },
  {
    id: 'trunk_endurance_lateral',
    name: 'Side Bridge (Ponte Lateral)',
    bodyRegion: 'Core',
    description: 'Avalia resistência da musculatura lateral do core',
    unit: 'segundos',
    cutoffValue: 45,
    isBilateral: true,
    instructions: 'Apoie-se no cotovelo e pés, mantendo o corpo alinhado. Sustente a posição o máximo possível de cada lado.',
    triggeredBy: [
      // OHS Posterior
      'asymmetric_shift', 'trunk_rotation',
      // SLS
      'hip_drop', 'hip_hike', 'trunk_rotation_medial', 'trunk_rotation_lateral',
      // Push-up
      'misalignment',
    ],
  },

  // ============================================
  // Shoulder/Scapula Tests
  // ============================================
  {
    id: 'shoulder_flexion',
    name: 'Flexão Ativa do Ombro',
    bodyRegion: 'Ombro',
    description: 'Avalia amplitude de flexão do ombro',
    unit: 'graus',
    cutoffValue: 170,
    isBilateral: true,
    instructions: 'Em pé ou sentado, eleve os braços ativamente acima da cabeça. Observe compensações e meça a amplitude máxima.',
    triggeredBy: [
      // OHS Lateral
      'arms_fall_forward',
      // Push-up
      'scapular_winging', 'shoulder_protraction', 'shoulder_retraction_insufficient',
    ],
  },
  {
    id: 'pec_minor_length',
    name: 'Comprimento do Peitoral Menor',
    bodyRegion: 'Ombro',
    description: 'Avalia encurtamento do peitoral menor',
    unit: 'cm',
    cutoffValue: 2.5,
    isBilateral: true,
    instructions: 'Em decúbito dorsal relaxado, meça a distância do acrômio até a maca. Compare bilateralmente.',
    triggeredBy: [
      // OHS Lateral
      'arms_fall_forward',
      // Push-up
      'scapular_winging', 'shoulder_protraction', 'elbow_flare',
    ],
  },
  {
    id: 'scapular_dyskinesis',
    name: 'Avaliação de Discinese Escapular',
    bodyRegion: 'Escápula',
    description: 'Observação dinâmica do movimento escapular',
    unit: 'tipo (I-IV)',
    isBilateral: true,
    instructions: 'Observe a escápula durante flexão e abdução ativa de ombro com peso leve (1-2kg). Classifique o padrão de discinese.',
    triggeredBy: [
      // OHS Lateral
      'arms_fall_forward',
      // Push-up
      'scapular_winging', 'shoulder_protraction', 'shoulder_retraction_insufficient',
    ],
  },
  {
    id: 'serratus_strength',
    name: 'Força do Serrátil Anterior',
    bodyRegion: 'Escápula',
    description: 'Avalia a força do serrátil anterior em protração',
    unit: 'escala 0-5',
    cutoffValue: 4,
    isBilateral: true,
    instructions: 'Em posição de push-up plus ou em pé empurrando parede. Realize protração máxima contra resistência. Grade de 0-5.',
    triggeredBy: [
      // Push-up
      'scapular_winging', 'shoulder_retraction_insufficient',
    ],
  },

  // ============================================
  // Cervical Tests
  // ============================================
  {
    id: 'cervical_flexion_endurance',
    name: 'Resistência de Flexores Cervicais Profundos',
    bodyRegion: 'Cervical',
    description: 'Avalia a resistência dos flexores cervicais profundos',
    unit: 'segundos',
    cutoffValue: 30,
    isBilateral: false,
    instructions: 'Em decúbito dorsal, realize flexão craniocervical (queixo no peito) e eleve levemente a cabeça da maca. Mantenha o máximo possível.',
    triggeredBy: [
      // Push-up
      'head_forward',
    ],
  },
  {
    id: 'upper_trap_length',
    name: 'Comprimento do Trapézio Superior',
    bodyRegion: 'Cervical',
    description: 'Avalia encurtamento do trapézio superior',
    unit: 'graus',
    cutoffValue: 45,
    isBilateral: true,
    instructions: 'Em sentado, estabilize o ombro e realize flexão lateral cervical contralateral passiva. Meça a amplitude.',
    triggeredBy: [
      // OHS Lateral
      'arms_fall_forward',
      // Push-up
      'head_forward', 'scapular_winging', 'shoulder_protraction',
    ],
  },

  // ============================================
  // Knee Tests (NEW)
  // ============================================
  {
    id: 'single_leg_squat_control',
    name: 'Controle de Flexão de Joelho',
    bodyRegion: 'Joelho',
    description: 'Avalia controle excêntrico do quadríceps e estabilidade do joelho',
    unit: 'qualitativo',
    isBilateral: true,
    instructions: 'Realize agachamento unilateral lento observando tremor, controle e profundidade alcançada.',
    triggeredBy: [
      // SLS
      'knee_flexion_insufficient', 'tremor', 'instability',
    ],
  },
];

// Get suggested tests based on detected compensations
export function getSuggestedTests(compensationIds: string[]): SegmentalTest[] {
  if (!compensationIds || compensationIds.length === 0) return [];

  const suggested = segmentalTests.filter(test =>
    test.triggeredBy.some(trigger => compensationIds.includes(trigger))
  );

  // Remove duplicates and sort by body region
  const uniqueTests = Array.from(new Map(suggested.map(t => [t.id, t])).values());
  return uniqueTests.sort((a, b) => a.bodyRegion.localeCompare(b.bodyRegion));
}

// Group tests by body region
export function groupTestsByRegion(tests: SegmentalTest[]): Record<string, SegmentalTest[]> {
  return tests.reduce((acc, test) => {
    if (!acc[test.bodyRegion]) {
      acc[test.bodyRegion] = [];
    }
    acc[test.bodyRegion].push(test);
    return acc;
  }, {} as Record<string, SegmentalTest[]>);
}
