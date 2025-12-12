/**
 * Quick Protocol Engine - FABRIK Mini Protocolos
 * Motor de decisão determinístico para avaliação rápida
 * 
 * Baseado na pirâmide de performance:
 * Mobilidade > Estabilidade > Controle Neuromotor
 */

import type { ProtocolType, TestId } from '@/data/quickProtocolMappings';

// ============================================================================
// TYPES
// ============================================================================

export type DeficitType =
  // Knee deficits
  | 'ankle_mobility_deficit'
  | 'hip_mobility_deficit'
  | 'hip_stability_deficit'
  | 'ankle_stability_deficit'
  | 'motor_control_deficit'
  // Hip deficits
  | 'hip_flexion_mobility_deficit'
  | 'hip_rotation_mobility_deficit'
  | 'hip_abd_ext_stability_deficit'
  | 'posterior_chain_stability_deficit'
  | 'hip_motor_control_deficit'
  // Low back deficits
  | 'lumbar_flexion_mobility_deficit'
  | 'lumbar_extension_mobility_deficit'
  | 'core_stability_deficit'
  | 'posterior_chain_low_back_deficit'
  | 'low_back_motor_control_deficit'
  // Shoulder deficits
  | 'shoulder_flexion_mobility_deficit'
  | 'shoulder_rotation_mobility_deficit'
  | 'scapular_control_deficit'
  | 'posterior_shoulder_stability_deficit'
  | 'shoulder_motor_control_deficit'
  // Ankle deficits
  | 'ankle_dorsiflexion_mobility_deficit'
  | 'posterior_ankle_mobility_deficit'
  | 'foot_arch_stability_deficit'
  | 'lateral_ankle_stability_deficit'
  | 'ankle_motor_control_deficit'
  // Elbow deficits
  | 'wrist_mobility_deficit'
  | 'shoulder_rotation_elbow_deficit'
  | 'scapular_stability_deficit'
  | 'forearm_stability_deficit'
  | 'elbow_motor_control_deficit';

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
  [key: string]: TestResult | undefined;
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
  interventionSide?: 'left' | 'right' | 'bilateral';
  contralateralNote?: string;
}

export interface QuickProtocolSession {
  id?: string;
  studentId: string;
  professionalId: string;
  assessmentId?: string | null;
  protocolType: ProtocolType;
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
// PRIORITY ORDERS
// ============================================================================

const KNEE_PRIORITY_ORDER: DeficitType[] = [
  'ankle_mobility_deficit',
  'hip_mobility_deficit',
  'hip_stability_deficit',
  'ankle_stability_deficit',
  'motor_control_deficit'
];

const HIP_PRIORITY_ORDER: DeficitType[] = [
  'hip_flexion_mobility_deficit',
  'hip_rotation_mobility_deficit',
  'hip_abd_ext_stability_deficit',
  'posterior_chain_stability_deficit',
  'hip_motor_control_deficit'
];

const LOW_BACK_PRIORITY_ORDER: DeficitType[] = [
  'lumbar_flexion_mobility_deficit',
  'lumbar_extension_mobility_deficit',
  'core_stability_deficit',
  'posterior_chain_low_back_deficit',
  'low_back_motor_control_deficit'
];

const SHOULDER_PRIORITY_ORDER: DeficitType[] = [
  'shoulder_flexion_mobility_deficit',
  'shoulder_rotation_mobility_deficit',
  'scapular_control_deficit',
  'posterior_shoulder_stability_deficit',
  'shoulder_motor_control_deficit'
];

const ELBOW_PRIORITY_ORDER: DeficitType[] = [
  'wrist_mobility_deficit',
  'shoulder_rotation_elbow_deficit',
  'scapular_stability_deficit',
  'forearm_stability_deficit',
  'elbow_motor_control_deficit'
];

const ANKLE_PRIORITY_ORDER: DeficitType[] = [
  'ankle_dorsiflexion_mobility_deficit',
  'posterior_ankle_mobility_deficit',
  'foot_arch_stability_deficit',
  'lateral_ankle_stability_deficit',
  'ankle_motor_control_deficit'
];

// ============================================================================
// TEST TO DEFICIT MAPPINGS
// ============================================================================

const KNEE_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  ankle_mobility: 'ankle_mobility_deficit',
  hip_rotation: 'hip_mobility_deficit',
  hip_stability: 'hip_stability_deficit',
  ankle_stability: 'ankle_stability_deficit',
  squat_control: 'motor_control_deficit'
};

const HIP_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  hip_flexion: 'hip_flexion_mobility_deficit',
  hip_rotation_test: 'hip_rotation_mobility_deficit',
  hip_sls_stability: 'hip_abd_ext_stability_deficit',
  posterior_chain: 'posterior_chain_stability_deficit',
  hip_control: 'hip_motor_control_deficit'
};

const LOW_BACK_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  lumbar_flexion: 'lumbar_flexion_mobility_deficit',
  lumbar_extension: 'lumbar_extension_mobility_deficit',
  hinge_test: 'low_back_motor_control_deficit',
  low_back_posterior_chain: 'posterior_chain_low_back_deficit',
  core_stability: 'core_stability_deficit'
};

const SHOULDER_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  shoulder_flexion: 'shoulder_flexion_mobility_deficit',
  shoulder_rotation: 'shoulder_rotation_mobility_deficit',
  scapular_control: 'scapular_control_deficit',
  posterior_shoulder: 'posterior_shoulder_stability_deficit',
  shoulder_motor_control: 'shoulder_motor_control_deficit'
};

const ANKLE_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  dorsiflexion: 'ankle_dorsiflexion_mobility_deficit',
  posterior_chain_ankle: 'posterior_ankle_mobility_deficit',
  foot_stability: 'foot_arch_stability_deficit',
  lateral_stability: 'lateral_ankle_stability_deficit',
  ankle_motor_control: 'ankle_motor_control_deficit'
};

const ELBOW_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  wrist_mobility: 'wrist_mobility_deficit',
  shoulder_rotation_elbow: 'shoulder_rotation_elbow_deficit',
  scapular_stability: 'scapular_stability_deficit',
  forearm_stability: 'forearm_stability_deficit',
  elbow_motor_control: 'elbow_motor_control_deficit'
};

// ============================================================================
// INTERVENTIONS DATABASE
// ============================================================================

const INTERVENTIONS: Record<DeficitType, Intervention[]> = {
  // Knee interventions
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
  ],
  // Hip interventions
  hip_flexion_mobility_deficit: [
    {
      id: 'tfl_iliopsoas_release',
      name: 'Liberação TFL/Iliopsoas',
      description: 'Liberar região anterior do quadril com bola ou rolo',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'hip_flexion_mob',
      name: 'Mobilidade de Flexão',
      description: 'Mobilização ativa de flexão do quadril com controle',
      duration: '10-12 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_rotation_mobility_deficit: [
    {
      id: 'glute_tfl_release',
      name: 'Liberação Glúteos/TFL',
      description: 'Liberar glúteos e TFL com bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'ir_er_mob',
      name: 'Mobilidade IR/ER',
      description: 'Mobilização de rotações do quadril em 90/90',
      duration: '8-10 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_abd_ext_stability_deficit: [
    {
      id: 'glute_med_activation_hip',
      name: 'Ativação Glúteo Médio',
      description: 'Clamshell, side-lying abduction ou monster walk',
      duration: '12-15 reps cada lado',
      category: 'activation'
    },
    {
      id: 'step_down_control',
      name: 'Step-Down Controlado',
      description: 'Descida controlada de degrau com foco em alinhamento',
      duration: '8-10 reps cada lado',
      category: 'activation'
    }
  ],
  posterior_chain_stability_deficit: [
    {
      id: 'glute_max_activation',
      name: 'Ativação Glúteo Máximo',
      description: 'Bridge bilateral ou glute squeezes',
      duration: '12-15 reps',
      category: 'activation'
    },
    {
      id: 'single_leg_bridge',
      name: 'Bridge Unilateral',
      description: 'Ponte unilateral com foco em ativação de glúteo',
      duration: '8-10 reps cada lado',
      category: 'activation'
    }
  ],
  hip_motor_control_deficit: [
    {
      id: 'hinge_drill',
      name: 'Drill Técnico (Hinge ou Squat)',
      description: 'Padrão lento e controlado do movimento que causou dor',
      duration: '5-8 reps lentas',
      category: 'technique'
    },
    {
      id: 'alignment_focus',
      name: 'Foco em Alinhamento',
      description: 'Ritmo lento com atenção ao eixo quadril-joelho-tornozelo',
      duration: '8-10 reps controladas',
      category: 'technique'
    }
  ],
  // Low back interventions
  lumbar_flexion_mobility_deficit: [
    {
      id: 'hip_flexor_release',
      name: 'Liberação Flexores de Quadril',
      description: 'Liberar psoas e reto femoral com bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'cat_cow_mobility',
      name: 'Cat-Cow Mobilidade',
      description: 'Mobilização segmentar da coluna em flexão/extensão',
      duration: '10-12 reps controladas',
      category: 'mobility'
    }
  ],
  lumbar_extension_mobility_deficit: [
    {
      id: 'thoracic_foam_roll',
      name: 'Liberação Torácica',
      description: 'Rolo na região torácica para liberar extensores',
      duration: '60-90s',
      category: 'release'
    },
    {
      id: 'prone_press_up',
      name: 'Prone Press-Up',
      description: 'Extensão progressiva em decúbito ventral',
      duration: '8-10 reps suaves',
      category: 'mobility'
    }
  ],
  core_stability_deficit: [
    {
      id: 'dead_bug_activation',
      name: 'Dead Bug Ativação',
      description: 'Dead bug básico com foco em anti-extensão',
      duration: '8-10 reps cada lado',
      category: 'activation'
    },
    {
      id: 'bird_dog',
      name: 'Bird Dog',
      description: 'Extensão contralateral com coluna neutra',
      duration: '8-10 reps cada lado',
      category: 'activation'
    }
  ],
  posterior_chain_low_back_deficit: [
    {
      id: 'glute_bridge',
      name: 'Glute Bridge',
      description: 'Ponte bilateral com foco em ativação de glúteo',
      duration: '12-15 reps',
      category: 'activation'
    },
    {
      id: 'hip_hinge_drill',
      name: 'Hip Hinge Drill',
      description: 'Padrão de dobradiça com bastão para feedback',
      duration: '8-10 reps',
      category: 'activation'
    }
  ],
  low_back_motor_control_deficit: [
    {
      id: 'hinge_technique',
      name: 'Ajuste Técnico de Hinge',
      description: 'Correção de padrão: quadril recua primeiro, coluna neutra',
      duration: '5-8 reps lentas',
      category: 'technique'
    },
    {
      id: 'bracing_drill',
      name: 'Bracing Drill',
      description: 'Ativação de core antes e durante o movimento',
      duration: '8-10 reps controladas',
      category: 'technique'
    }
  ],
  // Shoulder interventions
  shoulder_flexion_mobility_deficit: [
    {
      id: 'thoracic_extension_mob',
      name: 'Mobilidade Torácica',
      description: 'Extensão torácica com rolo ou parede',
      duration: '10-12 reps',
      category: 'mobility'
    },
    {
      id: 'wall_slides',
      name: 'Wall Slides',
      description: 'Deslizamento na parede com escápulas retraídas',
      duration: '10-12 reps',
      category: 'mobility'
    }
  ],
  shoulder_rotation_mobility_deficit: [
    {
      id: 'posterior_capsule_stretch',
      name: 'Liberação Cápsula Posterior',
      description: 'Sleeper stretch ou cross-body stretch',
      duration: '30-45s cada lado',
      category: 'release'
    },
    {
      id: 'ir_er_mobility',
      name: 'Mobilidade IR/ER',
      description: 'Mobilização ativa de rotações do ombro',
      duration: '10-12 reps cada direção',
      category: 'mobility'
    }
  ],
  scapular_control_deficit: [
    {
      id: 'serratus_activation',
      name: 'Ativação Serrátil',
      description: 'Wall slide com protração ou push-up plus',
      duration: '12-15 reps',
      category: 'activation'
    },
    {
      id: 'lower_trap_activation',
      name: 'Ativação Trapézio Inferior',
      description: 'Prone Y ou L raises',
      duration: '10-12 reps',
      category: 'activation'
    }
  ],
  posterior_shoulder_stability_deficit: [
    {
      id: 'er_isometric',
      name: 'Ativação ER Isométrica',
      description: 'Rotação externa isométrica contra parede ou banda',
      duration: '3x 10-15s cada lado',
      category: 'activation'
    },
    {
      id: 'prone_er',
      name: 'Prone ER Regressão',
      description: 'Rotação externa deitado com peso leve',
      duration: '10-12 reps cada lado',
      category: 'activation'
    }
  ],
  shoulder_motor_control_deficit: [
    {
      id: 'amplitude_adjustment',
      name: 'Ajuste de Amplitude',
      description: 'Reduzir amplitude do movimento até controle perfeito',
      duration: '5-8 reps controladas',
      category: 'technique'
    },
    {
      id: 'tempo_control',
      name: 'Controle de Ritmo',
      description: 'Execução em tempo lento (3-0-3) com foco em alinhamento',
      duration: '5-8 reps lentas',
      category: 'technique'
    }
  ],
  // Ankle interventions
  ankle_dorsiflexion_mobility_deficit: [
    {
      id: 'calf_release_ankle',
      name: 'Liberação de Panturrilha',
      description: 'Liberar gastrocnêmio e sóleo com rolo ou bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'talocrural_mob_ankle',
      name: 'Mobilidade Talocrural',
      description: 'Mobilização em dorsiflexão com banda ou parede',
      duration: '10-15 reps cada lado',
      category: 'mobility'
    }
  ],
  posterior_ankle_mobility_deficit: [
    {
      id: 'achilles_release',
      name: 'Mobilidade de Aquiles',
      description: 'Liberação profunda do tendão de Aquiles e panturrilha',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'eccentric_calf',
      name: 'Alongamento Excêntrico',
      description: 'Descida lenta em degrau para mobilidade excêntrica',
      duration: '10-12 reps cada lado',
      category: 'mobility'
    }
  ],
  foot_arch_stability_deficit: [
    {
      id: 'intrinsic_activation',
      name: 'Ativação Intrínsecos do Pé',
      description: 'Short-foot e exercícios de pegada de toalha',
      duration: '10 reps x 5s cada lado',
      category: 'activation'
    },
    {
      id: 'single_leg_stance_ankle',
      name: 'Apoio Unilateral',
      description: 'Ficar em um pé com foco em manter arco ativo',
      duration: '20-30s cada lado',
      category: 'activation'
    }
  ],
  lateral_ankle_stability_deficit: [
    {
      id: 'peroneal_activation',
      name: 'Ativação Peroneais',
      description: 'Eversão resistida com banda ou step lateral',
      duration: '12-15 reps cada lado',
      category: 'activation'
    },
    {
      id: 'lateral_step_control',
      name: 'Step Lateral Controlado',
      description: 'Controle de eversão em step lateral lento',
      duration: '8-10 reps cada lado',
      category: 'activation'
    }
  ],
  ankle_motor_control_deficit: [
    {
      id: 'soft_landing_drill',
      name: 'Drill de Aterrissagem Suave',
      description: 'Mini hops com foco em absorção silenciosa',
      duration: '8-10 reps controladas',
      category: 'technique'
    },
    {
      id: 'alignment_landing',
      name: 'Ajuste Técnico de Aterrissagem',
      description: 'Correção de alinhamento e padrão de absorção',
      duration: '5-8 reps lentas',
      category: 'technique'
    }
  ],
  // Elbow interventions
  wrist_mobility_deficit: [
    {
      id: 'forearm_release',
      name: 'Liberação de Extensores/Flexores',
      description: 'Liberar antebraço com bola ou rolo',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'wrist_mobility_drill',
      name: 'Mobilidade de Punho',
      description: 'Flexão e extensão ativa do punho com suporte',
      duration: '10-12 reps cada direção',
      category: 'mobility'
    }
  ],
  shoulder_rotation_elbow_deficit: [
    {
      id: 'posterior_capsule',
      name: 'Liberação Cápsula Posterior',
      description: 'Sleeper stretch ou cross-body stretch',
      duration: '30-45s cada lado',
      category: 'release'
    },
    {
      id: 'rotator_cuff_activation',
      name: 'Ativação Manguito Rotador',
      description: 'Rotação externa leve com banda',
      duration: '12-15 reps cada lado',
      category: 'activation'
    }
  ],
  scapular_stability_deficit: [
    {
      id: 'serratus_activation_elbow',
      name: 'Ativação Serrátil',
      description: 'Wall slide com controle ou push-up plus',
      duration: '12-15 reps',
      category: 'activation'
    },
    {
      id: 'lower_trap',
      name: 'Ativação Trapézio Inferior',
      description: 'Prone Y com foco em depressão escapular',
      duration: '10-12 reps',
      category: 'activation'
    }
  ],
  forearm_stability_deficit: [
    {
      id: 'grip_exercises',
      name: 'Exercícios de Grip',
      description: 'Squeeze com controle e pronação/supinação',
      duration: '10-15 reps cada direção',
      category: 'activation'
    },
    {
      id: 'wrist_curl',
      name: 'Ativação Extensores/Flexores',
      description: 'Wrist curls leves com foco em controle',
      duration: '12-15 reps cada direção',
      category: 'activation'
    }
  ],
  elbow_motor_control_deficit: [
    {
      id: 'technique_correction',
      name: 'Correção Técnica',
      description: 'Ajuste de trajetória do cotovelo no push/pull',
      duration: '5-8 reps controladas',
      category: 'technique'
    },
    {
      id: 'tempo_elbow',
      name: 'Controle de Ritmo',
      description: 'Execução em tempo lento com alinhamento',
      duration: '5-8 reps lentas',
      category: 'technique'
    }
  ]
};

// ============================================================================
// EXPLANATIONS
// ============================================================================

const EXPLANATIONS: Record<DeficitType, string> = {
  // Knee explanations
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
    'Pequenas correções técnicas podem proteger melhor o joelho durante o exercício.',

  // Hip explanations
  hip_flexion_mobility_deficit:
    'Seu quadril está limitado em flexão, o que aumenta a compressão na região anterior. ' +
    'Isso pode causar pinch ou desconforto durante agachamentos e lunges.',
  
  hip_rotation_mobility_deficit:
    'A mobilidade de rotação do quadril está reduzida, alterando o alinhamento da coxa. ' +
    'Isso afeta diretamente squat, lunge e corrida.',
  
  hip_abd_ext_stability_deficit:
    'Seu quadril não está estabilizando o movimento adequadamente. ' +
    'A fraqueza de glúteo médio e máximo sobrecarrega a articulação.',
  
  posterior_chain_stability_deficit:
    'A cadeia posterior não está absorvendo carga de forma eficiente. ' +
    'Os isquios estão dominando onde o glúteo deveria atuar.',
  
  hip_motor_control_deficit:
    'Sua mobilidade e estabilidade estão boas, mas o padrão de movimento precisa de ajuste. ' +
    'Correções técnicas podem proteger melhor o quadril durante o exercício.',

  // Low back explanations
  lumbar_flexion_mobility_deficit:
    'A limitação de flexão da lombar está aumentando a tensão nos tecidos posteriores. ' +
    'Isso pode causar dor ao flexionar o tronco ou durante movimentos de hinge.',
  
  lumbar_extension_mobility_deficit:
    'A extensão da lombar está limitada ou causando compressão. ' +
    'Isso pode gerar dor em pé prolongado ou ao estender as costas.',
  
  core_stability_deficit:
    'O core não está estabilizando a coluna adequadamente durante o movimento. ' +
    'Isso aumenta a carga nas estruturas passivas da lombar.',
  
  posterior_chain_low_back_deficit:
    'A cadeia posterior não está absorvendo carga de forma eficiente. ' +
    'O glúteo não está ativando adequadamente, sobrecarregando a lombar.',
  
  low_back_motor_control_deficit:
    'Sua mobilidade e estabilidade estão boas, mas o padrão técnico precisa de ajuste. ' +
    'A lombar está perdendo neutralidade durante o movimento.',

  // Shoulder explanations
  shoulder_flexion_mobility_deficit:
    'A limitação de flexão do ombro está aumentando a tensão nas estruturas doloridas. ' +
    'A mobilidade torácica pode estar contribuindo para esse padrão.',
  
  shoulder_rotation_mobility_deficit:
    'A rotação do ombro está reduzida e isso altera o alinhamento e o espaço subacromial. ' +
    'Isso pode causar impingement ou desconforto em movimentos de rotação.',
  
  scapular_control_deficit:
    'Sua escápula não está se movimentando de forma eficiente para estabilizar o ombro. ' +
    'O serrátil e trapézio inferior não estão controlando adequadamente.',
  
  posterior_shoulder_stability_deficit:
    'Os rotadores externos e estabilizadores posteriores não estão segurando o ombro. ' +
    'Isso aumenta a carga na região anterior do ombro.',
  
  shoulder_motor_control_deficit:
    'Sua técnica está exigindo demasiado do ombro. ' +
    'Ajustes de amplitude, ritmo e alinhamento podem aliviar a sobrecarga.',

  // Ankle explanations
  ankle_dorsiflexion_mobility_deficit:
    'A mobilidade do seu tornozelo está reduzida, aumentando a tensão na região afetada. ' +
    'Dorsiflexão limitada é a causa mais comum de dor no tornozelo.',
  
  posterior_ankle_mobility_deficit:
    'A cadeia posterior do tornozelo está tensa e limitando seu movimento. ' +
    'Rigidez no tendão de Aquiles pode causar compensações dolorosas.',
  
  foot_arch_stability_deficit:
    'O pé não está fornecendo a base estável necessária. ' +
    'Os estabilizadores intrínsecos do pé precisam de ativação.',
  
  lateral_ankle_stability_deficit:
    'Seu tornozelo está instável lateralmente, o que pode gerar compensações dolorosas. ' +
    'Os peroneais não estão controlando adequadamente a eversão.',
  
  ankle_motor_control_deficit:
    'Sua mobilidade e estabilidade estão boas, mas o padrão de aterrissagem pode ser melhorado. ' +
    'Correções técnicas de absorção podem proteger melhor o tornozelo.',

  // Elbow explanations
  wrist_mobility_deficit:
    'A mobilidade do punho está restringindo o movimento e sobrecarregando o cotovelo. ' +
    'Flexão ou extensão limitada transfere tensão para extensores e flexores do antebraço.',
  
  shoulder_rotation_elbow_deficit:
    'A limitação de rotação do ombro está transferindo carga excessiva para o cotovelo. ' +
    'Quando o ombro não rota adequadamente, o cotovelo compensa.',
  
  scapular_stability_deficit:
    'A escápula não está estabilizando adequadamente o braço. ' +
    'Quando a escápula não controla o movimento, o cotovelo paga o preço.',
  
  forearm_stability_deficit:
    'Os músculos do antebraço não estão absorvendo carga de forma eficiente. ' +
    'Flexores ou extensores estão dominando e causando dor medial ou lateral.',
  
  elbow_motor_control_deficit:
    'Sua mobilidade e estabilidade estão boas, mas o padrão de movimento precisa ser ajustado. ' +
    'Correções técnicas de trajetória e ritmo podem proteger melhor o cotovelo.'
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

// ============================================================================
// CONTRALATERAL PATTERNS
// Based on Rebuilding MILO methodology
// ============================================================================

interface ContralateralPattern {
  isContralateral: boolean;
  targetMuscle: string;
  explanation: string;
}

/**
 * Padrões contralaterais baseados no conhecimento clínico Rebuilding MILO:
 * - hip_stability (Trendelenburg/pelvic drop): fraqueza do glúteo médio CONTRALATERAL
 * - hip_abd_ext_stability_deficit (SLS hip): fraqueza do glúteo médio CONTRALATERAL
 * Outros déficits são ipsilaterais (mesmo lado da dor)
 */
const CONTRALATERAL_PATTERNS: Record<string, ContralateralPattern> = {
  // Knee - hip_stability test detects pelvic drop (Trendelenburg sign)
  hip_stability_deficit: {
    isContralateral: true,
    targetMuscle: 'Glúteo médio',
    explanation: 'Sinal de Trendelenburg: a queda pélvica indica fraqueza do glúteo médio do lado oposto à dor.'
  },
  // Hip - SLS stability test detects same pattern
  hip_abd_ext_stability_deficit: {
    isContralateral: true,
    targetMuscle: 'Glúteo médio',
    explanation: 'A instabilidade no apoio unilateral indica fraqueza do glúteo médio contralateral.'
  }
};

/**
 * Determina o lado que deve receber a intervenção
 */
function determineInterventionSide(
  deficit: DeficitType | null,
  affectedSide: 'left' | 'right' | 'bilateral' | undefined
): { side: 'left' | 'right' | 'bilateral'; note?: string } {
  // Se não há lado definido ou é bilateral, retorna bilateral
  if (!affectedSide || affectedSide === 'bilateral' || !deficit) {
    return { side: 'bilateral' };
  }
  
  // Verificar se o déficit tem padrão contralateral
  const pattern = CONTRALATERAL_PATTERNS[deficit];
  
  if (pattern?.isContralateral) {
    // Inverter o lado: dor no E → tratar D
    const interventionSide = affectedSide === 'left' ? 'right' : 'left';
    return {
      side: interventionSide,
      note: pattern.explanation
    };
  }
  
  // Padrão ipsilateral: tratar mesmo lado
  return { side: affectedSide };
}

/**
 * Motor de decisão principal - determinístico
 */
export function calculateDecision(
  testResults: QuickProtocolTestResults, 
  protocolType: ProtocolType = 'knee_pain',
  affectedSide?: 'left' | 'right' | 'bilateral'
): DecisionResult {
  const positiveTestIds: string[] = [];
  
  // Identificar todos os testes positivos
  for (const [testId, result] of Object.entries(testResults)) {
    if (result && isTestPositive(result)) {
      positiveTestIds.push(testId);
    }
  }
  
  // Se nenhum teste positivo, sem déficit identificado
  if (positiveTestIds.length === 0) {
    return {
      primary: null,
      secondary: [],
      interventions: [],
      explanation: 'Nenhum déficit significativo foi identificado nos testes. ' +
        'A dor pode ter outras causas que requerem avaliação mais aprofundada.',
      recommendRetest: false
    };
  }
  
  // Selecionar mapeamento correto baseado no protocolo
  let testToDeficit: Record<string, DeficitType>;
  let priorityOrder: DeficitType[];
  
  switch (protocolType) {
    case 'hip_pain':
      testToDeficit = HIP_TEST_TO_DEFICIT;
      priorityOrder = HIP_PRIORITY_ORDER;
      break;
    case 'low_back_pain':
      testToDeficit = LOW_BACK_TEST_TO_DEFICIT;
      priorityOrder = LOW_BACK_PRIORITY_ORDER;
      break;
    case 'shoulder_pain':
      testToDeficit = SHOULDER_TEST_TO_DEFICIT;
      priorityOrder = SHOULDER_PRIORITY_ORDER;
      break;
    case 'ankle_pain':
      testToDeficit = ANKLE_TEST_TO_DEFICIT;
      priorityOrder = ANKLE_PRIORITY_ORDER;
      break;
    case 'elbow_pain':
      testToDeficit = ELBOW_TEST_TO_DEFICIT;
      priorityOrder = ELBOW_PRIORITY_ORDER;
      break;
    default:
      testToDeficit = KNEE_TEST_TO_DEFICIT;
      priorityOrder = KNEE_PRIORITY_ORDER;
  }
  
  // Mapear testes para déficits
  const detectedDeficits = positiveTestIds
    .map(t => testToDeficit[t])
    .filter(Boolean) as DeficitType[];
  
  // Ordenar por prioridade (mobilidade primeiro)
  const sortedDeficits = detectedDeficits.sort((a, b) => 
    priorityOrder.indexOf(a) - priorityOrder.indexOf(b)
  );
  
  // Determinar primário e secundários
  const primary = sortedDeficits[0];
  const secondary = sortedDeficits.slice(1);
  
  // Buscar intervenções para o déficit primário
  const interventions = INTERVENTIONS[primary] || [];
  
  // Buscar explicação
  const explanation = EXPLANATIONS[primary] || '';
  
  // Determinar lado da intervenção (lógica contralateral)
  const { side: interventionSide, note: contralateralNote } = determineInterventionSide(
    primary,
    affectedSide
  );
  
  return {
    primary,
    secondary,
    interventions,
    explanation,
    recommendRetest: true,
    interventionSide,
    contralateralNote
  };
}

/**
 * Formata o nome do déficit para exibição
 */
export function formatDeficitName(deficit: DeficitType): string {
  const names: Record<DeficitType, string> = {
    // Knee
    ankle_mobility_deficit: 'Mobilidade de Tornozelo',
    hip_mobility_deficit: 'Mobilidade de Quadril',
    hip_stability_deficit: 'Estabilidade de Quadril',
    ankle_stability_deficit: 'Estabilidade de Pé/Tornozelo',
    motor_control_deficit: 'Controle Neuromotor',
    // Hip
    hip_flexion_mobility_deficit: 'Mobilidade de Flexão (Quadril)',
    hip_rotation_mobility_deficit: 'Mobilidade de Rotação (Quadril)',
    hip_abd_ext_stability_deficit: 'Estabilidade de Quadril (Abd/Ext)',
    posterior_chain_stability_deficit: 'Estabilidade Cadeia Posterior',
    hip_motor_control_deficit: 'Controle Neuromotor (Quadril)',
    // Low back
    lumbar_flexion_mobility_deficit: 'Mobilidade de Flexão (Lombar)',
    lumbar_extension_mobility_deficit: 'Mobilidade de Extensão (Lombar)',
    core_stability_deficit: 'Estabilidade de Core',
    posterior_chain_low_back_deficit: 'Estabilidade Cadeia Posterior (Lombar)',
    low_back_motor_control_deficit: 'Controle Neuromotor (Lombar)',
    // Shoulder
    shoulder_flexion_mobility_deficit: 'Mobilidade de Flexão (Ombro)',
    shoulder_rotation_mobility_deficit: 'Mobilidade de Rotação (Ombro)',
    scapular_control_deficit: 'Controle Escapular',
    posterior_shoulder_stability_deficit: 'Estabilidade Posterior (Ombro)',
    shoulder_motor_control_deficit: 'Controle Neuromotor (Ombro)',
    // Ankle
    ankle_dorsiflexion_mobility_deficit: 'Mobilidade de Dorsiflexão',
    posterior_ankle_mobility_deficit: 'Mobilidade Posterior (Tornozelo)',
    foot_arch_stability_deficit: 'Estabilidade do Arco Plantar',
    lateral_ankle_stability_deficit: 'Estabilidade Lateral (Tornozelo)',
    ankle_motor_control_deficit: 'Controle Neuromotor (Tornozelo)',
    // Elbow
    wrist_mobility_deficit: 'Mobilidade de Punho',
    shoulder_rotation_elbow_deficit: 'Rotação do Ombro (Cotovelo)',
    scapular_stability_deficit: 'Estabilidade Escapular',
    forearm_stability_deficit: 'Estabilidade do Antebraço',
    elbow_motor_control_deficit: 'Controle Neuromotor (Cotovelo)'
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

// Re-export TestId for backward compatibility
export type { TestId, ProtocolType };
