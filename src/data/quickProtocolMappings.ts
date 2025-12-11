/**
 * Quick Protocol Mappings - FABRIK Mini Protocolo
 * Definições dos testes e critérios para avaliação rápida de dor no joelho
 */

import type { TestId } from '@/lib/quickProtocolEngine';

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
  segment: 'ankle' | 'hip' | 'kinetic_chain';
  isBilateral: boolean;
  options: QuickTestOption[];
  videoUrl?: string;
}

export const QUICK_PROTOCOL_TESTS: QuickTestDefinition[] = [
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
// PROTOCOL METADATA
// ============================================================================

export const KNEE_PROTOCOL_META = {
  id: 'KNEE_UNIVERSAL_5MIN',
  name: 'Mini Protocolo FABRIK – Dor no Joelho',
  estimatedTime: 5,
  focus: ['mobilidade', 'estabilidade', 'controle_neuromotor'],
  targetCondition: 'knee_pain',
  description: 'Avaliação rápida para identificar qual camada da pirâmide de performance está falhando e causando sobrecarga no joelho.'
};

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

export function getTestById(testId: TestId): QuickTestDefinition | undefined {
  return QUICK_PROTOCOL_TESTS.find(t => t.id === testId);
}

export function getTestsByLayer(layer: 'mobility' | 'stability' | 'motor_control'): QuickTestDefinition[] {
  return QUICK_PROTOCOL_TESTS.filter(t => t.layer === layer);
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
