/**
 * Quick Protocol Mappings - FABRIK Mini Protocolos
 * Definições dos testes e critérios para avaliação rápida
 */

// ============================================================================
// PROTOCOL TYPES
// ============================================================================

export type ProtocolType = 'knee_pain' | 'hip_pain' | 'low_back_pain';

export type TestId =
  // Knee tests
  | 'ankle_mobility'
  | 'hip_rotation'
  | 'hip_stability'
  | 'ankle_stability'
  | 'squat_control'
  // Hip tests
  | 'hip_flexion'
  | 'hip_rotation_test'
  | 'hip_sls_stability'
  | 'posterior_chain'
  | 'hip_control'
  // Low back tests
  | 'lumbar_flexion'
  | 'lumbar_extension'
  | 'hinge_test'
  | 'low_back_posterior_chain'
  | 'core_stability';

// ============================================================================
// TEST DEFINITIONS
// ============================================================================

export interface QuickTestOption {
  id: string;
  label: string;
  isPositive: boolean;
}

export interface QuickTestDefinition {
  id: TestId;
  name: string;
  description: string;
  instructions: string[];
  layer: 'mobility' | 'stability' | 'motor_control';
  segment: string;
  isBilateral: boolean;
  options: QuickTestOption[];
  videoUrl?: string;
}

// ============================================================================
// KNEE PROTOCOL TESTS
// ============================================================================

export const KNEE_PROTOCOL_TESTS: QuickTestDefinition[] = [
  {
    id: 'ankle_mobility',
    name: 'Wall Test',
    description: 'Avalia a mobilidade de dorsiflexão do tornozelo',
    layer: 'mobility',
    segment: 'ankle',
    isBilateral: true,
    instructions: [
      'Posicione o pé a ~10cm da parede',
      'Mantenha o calcanhar no chão',
      'Tente tocar o joelho na parede',
      'Observe a amplitude e compare os lados'
    ],
    options: [
      { id: 'normal', label: 'Normal', isPositive: false },
      { id: 'limited', label: 'Limitado', isPositive: true },
      { id: 'asymmetric', label: 'Assimetria importante', isPositive: true }
    ]
  },
  {
    id: 'hip_rotation',
    name: 'IR/ER Sentado',
    description: 'Avalia a rotação interna e externa do quadril',
    layer: 'mobility',
    segment: 'hip',
    isBilateral: true,
    instructions: [
      'Sente com joelhos e quadris a 90°',
      'Mantenha as costas retas',
      'Rotacione a coxa internamente (pé para fora)',
      'Rotacione externamente (pé para dentro)',
      'Compare amplitude entre os lados'
    ],
    options: [
      { id: 'ir_normal_er_normal', label: 'IR e ER normais', isPositive: false },
      { id: 'ir_limited', label: 'IR limitada', isPositive: true },
      { id: 'er_limited', label: 'ER limitada', isPositive: true },
      { id: 'asymmetric', label: 'Assimetria importante', isPositive: true }
    ]
  },
  {
    id: 'hip_stability',
    name: 'Single-Leg Squat Parcial',
    description: 'Avalia a estabilidade do quadril durante apoio unilateral',
    layer: 'stability',
    segment: 'hip',
    isBilateral: true,
    instructions: [
      'Fique em apoio unilateral',
      'Desça lentamente em mini-agachamento',
      'Observe o alinhamento do joelho',
      'Observe se a pelve mantém nível',
      'Repita do outro lado'
    ],
    options: [
      { id: 'clean', label: 'Movimento limpo', isPositive: false },
      { id: 'valgus', label: 'Valgo presente', isPositive: true },
      { id: 'pelvic_drop', label: 'Queda de pelve', isPositive: true },
      { id: 'instability', label: 'Instabilidade global', isPositive: true }
    ]
  },
  {
    id: 'ankle_stability',
    name: 'Single-Leg Balance',
    description: 'Avalia a estabilidade do pé e tornozelo em apoio unilateral',
    layer: 'stability',
    segment: 'ankle',
    isBilateral: true,
    instructions: [
      'Fique em um pé por ~10 segundos',
      'Braços relaxados ao lado do corpo',
      'Observe estabilidade e arco do pé',
      'Repita do outro lado'
    ],
    options: [
      { id: 'stable', label: 'Estável', isPositive: false },
      { id: 'unstable', label: 'Instável', isPositive: true },
      { id: 'arch_collapse', label: 'Arco colapsa', isPositive: true },
      { id: 'excessive_tremor', label: 'Tremor excessivo', isPositive: true }
    ]
  },
  {
    id: 'squat_control',
    name: 'Squat Control Test',
    description: 'Avalia o controle neuromotor durante agachamento',
    layer: 'motor_control',
    segment: 'kinetic_chain',
    isBilateral: false,
    instructions: [
      'Realize um agachamento lento e controlado',
      'Pause por 2 segundos na posição mais baixa',
      'Suba de forma controlada',
      'Observe organização do movimento'
    ],
    options: [
      { id: 'clean', label: 'Movimento limpo', isPositive: false },
      { id: 'disorganized', label: 'Descida desorganizada', isPositive: true },
      { id: 'knee_deviation', label: 'Joelho desvia', isPositive: true },
      { id: 'poor_base', label: 'Base inadequada', isPositive: true },
      { id: 'trunk_lean', label: 'Tronco inclina excessivamente', isPositive: true }
    ]
  }
];

// ============================================================================
// HIP PROTOCOL TESTS
// ============================================================================

export const HIP_PROTOCOL_TESTS: QuickTestDefinition[] = [
  {
    id: 'hip_flexion',
    name: 'Knee-to-Chest Test',
    description: 'Avalia a mobilidade de flexão do quadril',
    layer: 'mobility',
    segment: 'hip_flexion',
    isBilateral: true,
    instructions: [
      'Deite de costas com pernas estendidas',
      'Traga um joelho em direção ao peito',
      'Observe amplitude e sensação de bloqueio',
      'Compare os lados'
    ],
    options: [
      { id: 'normal', label: 'Amplitude normal', isPositive: false },
      { id: 'limited', label: 'Amplitude limitada', isPositive: true },
      { id: 'pinch', label: 'Pinch anterior', isPositive: true },
      { id: 'asymmetric', label: 'Assimetria', isPositive: true }
    ]
  },
  {
    id: 'hip_rotation_test',
    name: 'IR/ER Rotation Test',
    description: 'Avalia a mobilidade de rotação do quadril',
    layer: 'mobility',
    segment: 'hip_rotation',
    isBilateral: true,
    instructions: [
      'Sente ou deite com quadril a 90°',
      'Rotacione internamente (IR)',
      'Rotacione externamente (ER)',
      'Compare amplitude e conforto'
    ],
    options: [
      { id: 'normal', label: 'IR e ER normais', isPositive: false },
      { id: 'ir_limited', label: 'IR baixa', isPositive: true },
      { id: 'er_limited', label: 'ER baixa', isPositive: true },
      { id: 'asymmetric', label: 'Assimetria', isPositive: true },
      { id: 'end_range_pain', label: 'Dor final de amplitude', isPositive: true }
    ]
  },
  {
    id: 'hip_sls_stability',
    name: 'Single-Leg Squat',
    description: 'Avalia a estabilidade do quadril (glúteo médio/máximo)',
    layer: 'stability',
    segment: 'hip',
    isBilateral: true,
    instructions: [
      'Fique em apoio unilateral',
      'Desça em mini-agachamento',
      'Observe valgo, queda de pelve, instabilidade',
      'Repita do outro lado'
    ],
    options: [
      { id: 'clean', label: 'Movimento limpo', isPositive: false },
      { id: 'valgus', label: 'Valgo dinâmico', isPositive: true },
      { id: 'pelvic_drop', label: 'Pelve cai', isPositive: true },
      { id: 'instability', label: 'Instabilidade global', isPositive: true }
    ]
  },
  {
    id: 'posterior_chain',
    name: 'Single-Leg Bridge',
    description: 'Avalia estabilidade da cadeia posterior',
    layer: 'stability',
    segment: 'posterior_chain',
    isBilateral: true,
    instructions: [
      'Deite de costas, uma perna dobrada',
      'Estenda a outra perna',
      'Eleve o quadril em ponte unilateral',
      'Observe ativação e estabilidade'
    ],
    options: [
      { id: 'clean', label: 'Movimento limpo', isPositive: false },
      { id: 'glute_weak', label: 'Glúteo não ativa', isPositive: true },
      { id: 'hamstring_dominant', label: 'Isquios dominam', isPositive: true },
      { id: 'unstable', label: 'Instabilidade', isPositive: true },
      { id: 'posterior_pain', label: 'Dor posterior', isPositive: true }
    ]
  },
  {
    id: 'hip_control',
    name: 'Squat/Hinge Control Test',
    description: 'Avalia o controle neuromotor do quadril',
    layer: 'motor_control',
    segment: 'kinetic_chain',
    isBilateral: false,
    instructions: [
      'Realize o movimento que causou dor (squat ou hinge)',
      'Execute lentamente e com controle',
      'Observe organização e compensações',
      'Note se há perda de eixo'
    ],
    options: [
      { id: 'clean', label: 'Padrão limpo', isPositive: false },
      { id: 'axis_loss', label: 'Perda de eixo', isPositive: true },
      { id: 'trunk_dominant', label: 'Tronco toma controle', isPositive: true },
      { id: 'compensations', label: 'Compensações evidentes', isPositive: true }
    ]
  }
];

// ============================================================================
// LOW BACK PROTOCOL TESTS
// ============================================================================

export const LOW_BACK_PROTOCOL_TESTS: QuickTestDefinition[] = [
  {
    id: 'lumbar_flexion',
    name: 'Toe Touch Control',
    description: 'Avalia mobilidade posterior, ritmo lombar-pelve e sensibilidade de flexão',
    layer: 'mobility',
    segment: 'lumbar_spine',
    isBilateral: false,
    instructions: [
      'Em pé, pés na largura do quadril',
      'Flexione lentamente tentando tocar os dedos no chão',
      'Observe amplitude, ritmo lombo-pélvico e simetria',
      'Note se há dor ou arredondamento precoce da lombar'
    ],
    options: [
      { id: 'clean', label: 'Toca o chão facilmente', isPositive: false },
      { id: 'limited', label: 'Flexão limitada', isPositive: true },
      { id: 'early_rounding', label: 'Lombar arredonda cedo', isPositive: true },
      { id: 'pain', label: 'Dor ao flexionar', isPositive: true },
      { id: 'asymmetric', label: 'Assimetria perceptível', isPositive: true }
    ]
  },
  {
    id: 'lumbar_extension',
    name: 'Back Extension Test',
    description: 'Avalia sensibilidade à extensão, controle posterior e irritabilidade',
    layer: 'mobility',
    segment: 'lumbar_spine',
    isBilateral: false,
    instructions: [
      'Em pé, mãos na lombar',
      'Estenda a coluna para trás lentamente',
      'Observe amplitude e conforto',
      'Note se há compressão ou dor'
    ],
    options: [
      { id: 'normal', label: 'Extensão normal', isPositive: false },
      { id: 'limited', label: 'Extensão limitada', isPositive: true },
      { id: 'pain', label: 'Dor na lombar', isPositive: true },
      { id: 'compression', label: 'Compressão desconfortável', isPositive: true }
    ]
  },
  {
    id: 'hinge_test',
    name: 'Hinge Pattern Test',
    description: 'Principal teste para distinguir erro técnico de déficit de estabilidade',
    layer: 'motor_control',
    segment: 'kinetic_chain',
    isBilateral: false,
    instructions: [
      'Faça um RDL com bastão ou sem carga',
      'Mantenha coluna neutra durante todo movimento',
      'Observe se o quadril recua antes do tronco descer',
      'Note ativação do core e posição lombar'
    ],
    options: [
      { id: 'clean', label: 'Movimento limpo', isPositive: false },
      { id: 'lumbar_rounds', label: 'Lombar arredonda', isPositive: true },
      { id: 'trunk_first', label: 'Tronco desce antes do quadril', isPositive: true },
      { id: 'hip_no_pushback', label: 'Quadril não recua', isPositive: true },
      { id: 'core_inactive', label: 'Core não ativa', isPositive: true }
    ]
  },
  {
    id: 'low_back_posterior_chain',
    name: 'Single-Leg Deadlift',
    description: 'Identifica falha profunda de posterior/glúteo máximo',
    layer: 'stability',
    segment: 'posterior_chain',
    isBilateral: true,
    instructions: [
      'Em pé, apoio unilateral',
      'Faça um airplane leve ou single-leg deadlift',
      'Observe estabilidade e ativação de glúteo',
      'Repita do outro lado'
    ],
    options: [
      { id: 'clean', label: 'Movimento limpo', isPositive: false },
      { id: 'unstable', label: 'Instável', isPositive: true },
      { id: 'hip_rotation', label: 'Rotação excessiva de quadril', isPositive: true },
      { id: 'glute_inactive', label: 'Glúteo não ativa', isPositive: true },
      { id: 'pain', label: 'Dor', isPositive: true }
    ]
  },
  {
    id: 'core_stability',
    name: 'Dead Bug Test',
    description: 'Avalia estabilidade do core de forma simples e reveladora',
    layer: 'stability',
    segment: 'core',
    isBilateral: false,
    instructions: [
      'Deite de costas, joelhos e quadris a 90°',
      'Pressione a lombar contra o chão',
      'Estenda braço e perna opostos lentamente',
      'Mantenha por 10 segundos, observe estabilidade'
    ],
    options: [
      { id: 'clean', label: 'Execução limpa', isPositive: false },
      { id: 'back_lifts', label: 'Costas saem do chão', isPositive: true },
      { id: 'coordination_fail', label: 'Falha de coordenação', isPositive: true },
      { id: 'excessive_tremor', label: 'Tremor excessivo', isPositive: true },
      { id: 'core_unstable', label: 'Core instável', isPositive: true }
    ]
  }
];

// ============================================================================
// PROTOCOL METADATA
// ============================================================================

export interface ProtocolMeta {
  id: string;
  type: ProtocolType;
  name: string;
  shortName: string;
  estimatedTime: number;
  focus: string[];
  targetCondition: string;
  description: string;
  icon: string;
  color: string;
}

export const PROTOCOL_METAS: Record<ProtocolType, ProtocolMeta> = {
  knee_pain: {
    id: 'KNEE_UNIVERSAL_5MIN',
    type: 'knee_pain',
    name: 'Mini Protocolo FABRIK – Dor no Joelho',
    shortName: 'Dor no Joelho',
    estimatedTime: 5,
    focus: ['mobilidade', 'estabilidade', 'controle_neuromotor'],
    targetCondition: 'knee_pain',
    description: 'Avaliação rápida para identificar qual camada da pirâmide de performance está falhando e causando sobrecarga no joelho.',
    icon: '🦵',
    color: 'amber'
  },
  hip_pain: {
    id: 'HIP_UNIVERSAL_5MIN',
    type: 'hip_pain',
    name: 'Mini Protocolo FABRIK – Dor no Quadril',
    shortName: 'Dor no Quadril',
    estimatedTime: 5,
    focus: ['mobilidade', 'estabilidade', 'controle_neuromotor'],
    targetCondition: 'hip_pain',
    description: 'Avaliação rápida para identificar qual camada da pirâmide de performance está falhando e causando sobrecarga no quadril.',
    icon: '🦴',
    color: 'purple'
  },
  low_back_pain: {
    id: 'LOW_BACK_UNIVERSAL_5MIN',
    type: 'low_back_pain',
    name: 'Mini Protocolo FABRIK – Dor Lombar',
    shortName: 'Dor Lombar',
    estimatedTime: 5,
    focus: ['mobilidade', 'estabilidade', 'controle_neuromotor'],
    targetCondition: 'low_back_pain',
    description: 'Avaliação rápida para identificar se a dor lombar é causada por mobilidade limitada, estabilidade insuficiente ou controle neuromotor deficiente.',
    icon: '🦴',
    color: 'red'
  }
};

// Legacy export for backward compatibility
export const KNEE_PROTOCOL_META = PROTOCOL_METAS.knee_pain;

// Legacy export - maps to KNEE tests
export const QUICK_PROTOCOL_TESTS = KNEE_PROTOCOL_TESTS;

// ============================================================================
// RETEST OPTIONS
// ============================================================================

export const RETEST_OPTIONS = [
  { id: 'improved_much', label: 'Dor reduziu bastante', emoji: '😊' },
  { id: 'improved_little', label: 'Dor reduziu um pouco', emoji: '🙂' },
  { id: 'no_change', label: 'Sem mudança', emoji: '😐' },
  { id: 'worse', label: 'Dor piorou', emoji: '😟' }
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTestsForProtocol(protocolType: ProtocolType): QuickTestDefinition[] {
  switch (protocolType) {
    case 'knee_pain':
      return KNEE_PROTOCOL_TESTS;
    case 'hip_pain':
      return HIP_PROTOCOL_TESTS;
    case 'low_back_pain':
      return LOW_BACK_PROTOCOL_TESTS;
    default:
      return KNEE_PROTOCOL_TESTS;
  }
}

export function getProtocolMeta(protocolType: ProtocolType): ProtocolMeta {
  return PROTOCOL_METAS[protocolType] || PROTOCOL_METAS.knee_pain;
}

export function getTestById(testId: TestId, protocolType?: ProtocolType): QuickTestDefinition | undefined {
  if (protocolType) {
    const tests = getTestsForProtocol(protocolType);
    return tests.find(t => t.id === testId);
  }
  // Search all protocols
  return [...KNEE_PROTOCOL_TESTS, ...HIP_PROTOCOL_TESTS, ...LOW_BACK_PROTOCOL_TESTS].find(t => t.id === testId);
}

export function getTestsByLayer(layer: 'mobility' | 'stability' | 'motor_control', protocolType?: ProtocolType): QuickTestDefinition[] {
  const tests = protocolType ? getTestsForProtocol(protocolType) : [...KNEE_PROTOCOL_TESTS, ...HIP_PROTOCOL_TESTS, ...LOW_BACK_PROTOCOL_TESTS];
  return tests.filter(t => t.layer === layer);
}

export function getLayerLabel(layer: 'mobility' | 'stability' | 'motor_control'): string {
  const labels = {
    mobility: 'Mobilidade',
    stability: 'Estabilidade',
    motor_control: 'Controle Neuromotor'
  };
  return labels[layer];
}

export function getLayerIcon(layer: 'mobility' | 'stability' | 'motor_control'): string {
  const icons = {
    mobility: '🔄',
    stability: '⚖️',
    motor_control: '🧠'
  };
  return icons[layer];
}
