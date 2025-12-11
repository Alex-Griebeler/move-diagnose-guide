/**
 * Quick Protocol Engine - FABRIK Mini Protocolo
 * Motor de decisão determinístico para avaliação rápida de dor no joelho
 * 
 * Baseado na pirâmide de performance:
 * Mobilidade > Estabilidade > Controle Neuromotor
 */

// ============================================================================
// TYPES
// ============================================================================

export type DeficitType =
  | 'ankle_mobility_deficit'
  | 'hip_mobility_deficit'
  | 'hip_stability_deficit'
  | 'ankle_stability_deficit'
  | 'motor_control_deficit';

export type TestId =
  | 'ankle_mobility'
  | 'hip_rotation'
  | 'hip_stability'
  | 'ankle_stability'
  | 'squat_control';

export type TestResultStatus = 'normal' | 'limited' | 'asymmetric' | 'unstable' | 'pain';

export interface TestResult {
  testId: TestId;
  leftSide?: TestResultStatus | string;
  rightSide?: TestResultStatus | string;
  hasPain: boolean;
  isPositive: boolean;
  specificFindings?: string[];
}

export interface QuickProtocolTestResults {
  ankle_mobility?: TestResult;
  hip_rotation?: TestResult;
  hip_stability?: TestResult;
  ankle_stability?: TestResult;
  squat_control?: TestResult;
}

export interface Intervention {
  id: string;
  name: string;
  description: string;
  duration: string;
  category: 'release' | 'mobility' | 'activation' | 'technique';
}

export interface DecisionResult {
  primary: DeficitType | null;
  secondary: DeficitType[];
  interventions: Intervention[];
  explanation: string;
  recommendRetest: boolean;
}

export interface QuickProtocolSession {
  id?: string;
  studentId: string;
  professionalId: string;
  assessmentId?: string | null;
  protocolType: 'knee_pain';
  status: 'in_progress' | 'completed' | 'cancelled';
  testResults: QuickProtocolTestResults;
  primaryDeficit?: DeficitType | null;
  secondaryDeficits?: DeficitType[];
  interventionApplied?: Intervention[];
  retestResult?: 'improved_much' | 'improved_little' | 'no_change' | 'worse';
  retestFeedback?: string;
  createdAt?: string;
  completedAt?: string;
}

// ============================================================================
// PRIORITY ORDER (Mobilidade > Estabilidade > Controle Motor)
// ============================================================================

const PRIORITY_ORDER: DeficitType[] = [
  'ankle_mobility_deficit',
  'hip_mobility_deficit',
  'hip_stability_deficit',
  'ankle_stability_deficit',
  'motor_control_deficit'
];

// ============================================================================
// TEST TO DEFICIT MAPPING
// ============================================================================

const TEST_TO_DEFICIT: Record<TestId, DeficitType> = {
  ankle_mobility: 'ankle_mobility_deficit',
  hip_rotation: 'hip_mobility_deficit',
  hip_stability: 'hip_stability_deficit',
  ankle_stability: 'ankle_stability_deficit',
  squat_control: 'motor_control_deficit'
};

// ============================================================================
// INTERVENTIONS DATABASE
// ============================================================================

const INTERVENTIONS: Record<DeficitType, Intervention[]> = {
  ankle_mobility_deficit: [
    {
      id: 'calf_release',
      name: 'Liberação de Panturrilha',
      description: 'Liberar gastrocnêmio e sóleo com rolo ou bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'talocrural_mob',
      name: 'Mobilidade Talocrural',
      description: 'Mobilização em dorsiflexão com banda ou parede',
      duration: '10-15 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_mobility_deficit: [
    {
      id: 'tfl_release',
      name: 'Liberação TFL/Piriforme',
      description: 'Liberar tensor da fáscia lata e piriforme com bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'hip_90_90',
      name: 'Mobilidade 90/90',
      description: 'Alongamento dinâmico em posição 90/90 para rotação interna e externa',
      duration: '8-10 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_stability_deficit: [
    {
      id: 'glute_med_activation',
      name: 'Ativação Glúteo Médio',
      description: 'Clamshell com banda ou abdução lateral em decúbito',
      duration: '12-15 reps cada lado',
      category: 'activation'
    },
    {
      id: 'single_leg_stance',
      name: 'Apoio Unilateral Controlado',
      description: 'Ficar em um pé com controle de pelve, sem queda',
      duration: '20-30s cada lado',
      category: 'activation'
    }
  ],
  ankle_stability_deficit: [
    {
      id: 'tibialis_posterior',
      name: 'Ativação Tibial Posterior',
      description: 'Exercícios de inversão resistida ou short-foot',
      duration: '12-15 reps cada lado',
      category: 'activation'
    },
    {
      id: 'short_foot',
      name: 'Short-Foot',
      description: 'Encurtar o pé ativando arco plantar sem curvar dedos',
      duration: '10 reps x 5s cada lado',
      category: 'activation'
    }
  ],
  motor_control_deficit: [
    {
      id: 'squat_technique',
      name: 'Ajuste Técnico de Agachamento',
      description: 'Correção de base, alinhamento de joelho e distribuição de peso',
      duration: '5-8 reps lentas',
      category: 'technique'
    },
    {
      id: 'assisted_squat',
      name: 'Agachamento Assistido',
      description: 'Agachamento com suporte (TRX, barra) para padrão correto',
      duration: '8-10 reps controladas',
      category: 'technique'
    }
  ]
};

// ============================================================================
// EXPLANATIONS
// ============================================================================

const EXPLANATIONS: Record<DeficitType, string> = {
  ankle_mobility_deficit: 
    'Sua dor no joelho está relacionada à mobilidade reduzida do tornozelo. ' +
    'Quando o tornozelo não se movimenta bem, o joelho acaba recebendo mais carga durante movimentos como agachamento.',
  
  hip_mobility_deficit:
    'Seu quadril está restringindo o movimento e transferindo sobrecarga para o joelho. ' +
    'A limitação de rotação interna ou externa do quadril altera a mecânica do joelho.',
  
  hip_stability_deficit:
    'Seu quadril não está controlando bem o alinhamento do joelho durante o movimento. ' +
    'Isso causa valgo (joelho para dentro) e sobrecarga na articulação.',
  
  ankle_stability_deficit:
    'O pé e o tornozelo não estão oferecendo a base estável que o joelho precisa. ' +
    'Quando o arco plantar colapsa, o joelho sofre rotação interna excessiva.',
  
  motor_control_deficit:
    'Sua mobilidade e estabilidade estão adequadas, mas o padrão de movimento pode ser ajustado. ' +
    'Pequenas correções técnicas podem proteger melhor o joelho durante o exercício.'
};

// ============================================================================
// DECISION ENGINE
// ============================================================================

/**
 * Determina se um teste é positivo (indica déficit)
 */
export function isTestPositive(result: TestResult): boolean {
  if (result.hasPain) return true;
  if (result.isPositive) return true;
  
  const statuses = [result.leftSide, result.rightSide].filter(Boolean);
  return statuses.some(s => 
    s === 'limited' || 
    s === 'asymmetric' || 
    s === 'unstable' ||
    s === 'pain'
  );
}

/**
 * Motor de decisão principal - determinístico
 * Prioriza: Mobilidade > Estabilidade > Controle Motor
 */
export function calculateDecision(testResults: QuickProtocolTestResults): DecisionResult {
  const positiveTests: TestId[] = [];
  
  // Identificar todos os testes positivos
  for (const [testId, result] of Object.entries(testResults)) {
    if (result && isTestPositive(result)) {
      positiveTests.push(testId as TestId);
    }
  }
  
  // Se nenhum teste positivo, sem déficit identificado
  if (positiveTests.length === 0) {
    return {
      primary: null,
      secondary: [],
      interventions: [],
      explanation: 'Nenhum déficit significativo foi identificado nos testes. ' +
        'A dor pode ter outras causas que requerem avaliação mais aprofundada.',
      recommendRetest: false
    };
  }
  
  // Mapear testes para déficits
  const detectedDeficits = positiveTests.map(t => TEST_TO_DEFICIT[t]);
  
  // Ordenar por prioridade (mobilidade primeiro)
  const sortedDeficits = detectedDeficits.sort((a, b) => 
    PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b)
  );
  
  // Caso especial: motor_control só é primário se todos os outros forem negativos
  const mobilityAndStabilityTests: TestId[] = [
    'ankle_mobility', 'hip_rotation', 'hip_stability', 'ankle_stability'
  ];
  
  const hasOnlyMotorControl = 
    sortedDeficits.length === 1 && 
    sortedDeficits[0] === 'motor_control_deficit';
  
  const allMobilityStabilityNormal = mobilityAndStabilityTests.every(testId => {
    const result = testResults[testId];
    return !result || !isTestPositive(result);
  });
  
  // Determinar primário e secundários
  let primary: DeficitType;
  let secondary: DeficitType[];
  
  if (hasOnlyMotorControl && allMobilityStabilityNormal) {
    primary = 'motor_control_deficit';
    secondary = [];
  } else if (sortedDeficits[0] === 'motor_control_deficit' && sortedDeficits.length > 1) {
    // Motor control não é primário se há outros déficits
    primary = sortedDeficits[1];
    secondary = sortedDeficits.filter(d => d !== primary);
  } else {
    primary = sortedDeficits[0];
    secondary = sortedDeficits.slice(1);
  }
  
  // Buscar intervenções para o déficit primário
  const interventions = INTERVENTIONS[primary] || [];
  
  // Buscar explicação
  const explanation = EXPLANATIONS[primary] || '';
  
  return {
    primary,
    secondary,
    interventions,
    explanation,
    recommendRetest: true
  };
}

/**
 * Formata o nome do déficit para exibição
 */
export function formatDeficitName(deficit: DeficitType): string {
  const names: Record<DeficitType, string> = {
    ankle_mobility_deficit: 'Mobilidade de Tornozelo',
    hip_mobility_deficit: 'Mobilidade de Quadril',
    hip_stability_deficit: 'Estabilidade de Quadril',
    ankle_stability_deficit: 'Estabilidade de Pé/Tornozelo',
    motor_control_deficit: 'Controle Neuromotor'
  };
  return names[deficit] || deficit;
}

/**
 * Retorna a camada da pirâmide para um déficit
 */
export function getDeficitLayer(deficit: DeficitType): 'mobility' | 'stability' | 'motor_control' {
  if (deficit.includes('mobility')) return 'mobility';
  if (deficit.includes('stability')) return 'stability';
  return 'motor_control';
}

/**
 * Retorna cor/estilo para a camada
 */
export function getLayerStyle(layer: 'mobility' | 'stability' | 'motor_control'): {
  color: string;
  bgClass: string;
  label: string;
} {
  const styles = {
    mobility: {
      color: 'text-blue-500',
      bgClass: 'bg-blue-500/10',
      label: 'Mobilidade'
    },
    stability: {
      color: 'text-amber-500',
      bgClass: 'bg-amber-500/10',
      label: 'Estabilidade'
    },
    motor_control: {
      color: 'text-purple-500',
      bgClass: 'bg-purple-500/10',
      label: 'Controle Motor'
    }
  };
  return styles[layer];
}
