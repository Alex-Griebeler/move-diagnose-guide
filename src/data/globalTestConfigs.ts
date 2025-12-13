import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  slsAnteriorCompensations,
  slsPosteriorCompensations,
  pushupPosteriorCompensations,
  CompensationMapping,
} from '@/data/compensationMappings';

export type TestType = 'ohs' | 'sls' | 'pushup';

export type ViewType = 
  | 'anterior' 
  | 'lateral' 
  | 'posterior' 
  | 'left_anterior' 
  | 'left_posterior' 
  | 'right_anterior' 
  | 'right_posterior';

export interface ViewConfig {
  id: ViewType;
  label: string;
  description: string;
  compensations: CompensationMapping[];
}

export interface TestConfig {
  id: TestType;
  title: string;
  icon: string;
  instructions: string[];
  views: ViewConfig[];
  aiTestType: 'overhead_squat' | 'single_leg_squat' | 'pushup';
}

export const TEST_CONFIGS: Record<TestType, TestConfig> = {
  ohs: {
    id: 'ohs',
    title: 'Overhead Squat (OHS)',
    icon: '🏋️',
    aiTestType: 'overhead_squat',
    instructions: [
      'Pés na largura do quadril, pontas levemente para fora',
      'Braços elevados acima da cabeça, cotovelos estendidos',
      'Agachar o mais profundo possível mantendo calcanhares no chão',
      'Realizar 5 repetições para observação',
    ],
    views: [
      {
        id: 'anterior',
        label: 'Vista Anterior',
        description: 'Posicione-se de frente para o aluno',
        compensations: ohsAnteriorCompensations,
      },
      {
        id: 'lateral',
        label: 'Vista Lateral',
        description: 'Posicione-se ao lado do aluno',
        compensations: ohsLateralCompensations,
      },
      {
        id: 'posterior',
        label: 'Vista Posterior',
        description: 'Posicione-se atrás do aluno',
        compensations: ohsPosteriorCompensations,
      },
    ],
  },
  sls: {
    id: 'sls',
    title: 'Single-Leg Squat (SLS)',
    icon: '🦵',
    aiTestType: 'single_leg_squat',
    instructions: [
      'Em pé sobre uma perna, outra perna levemente elevada à frente',
      'Braços à frente para equilíbrio',
      'Flexionar o joelho de apoio o máximo possível',
      'Manter controle durante todo o movimento',
      'Realizar 3-5 repetições em cada lado e cada vista',
    ],
    views: [
      {
        id: 'left_anterior',
        label: 'Esquerda - Anterior',
        description: 'De frente, aluno apoiado na perna esquerda',
        compensations: slsAnteriorCompensations,
      },
      {
        id: 'left_posterior',
        label: 'Esquerda - Posterior',
        description: 'Por trás, aluno apoiado na perna esquerda',
        compensations: slsPosteriorCompensations,
      },
      {
        id: 'right_anterior',
        label: 'Direita - Anterior',
        description: 'De frente, aluno apoiado na perna direita',
        compensations: slsAnteriorCompensations,
      },
      {
        id: 'right_posterior',
        label: 'Direita - Posterior',
        description: 'Por trás, aluno apoiado na perna direita',
        compensations: slsPosteriorCompensations,
      },
    ],
  },
  pushup: {
    id: 'pushup',
    title: 'Push-up Test',
    icon: '💪',
    aiTestType: 'pushup',
    instructions: [
      'Posição de prancha com mãos na largura dos ombros',
      'Corpo alinhado da cabeça aos calcanhares',
      'Descer controladamente até o peito próximo ao chão',
      'Capturar de trás (visão posterior) para avaliar escápulas',
      'Realizar 5 repetições para avaliação',
    ],
    views: [
      {
        id: 'posterior',
        label: 'Vista Posterior',
        description: 'Posicione-se atrás do aluno para observar escápulas e cotovelos',
        compensations: pushupPosteriorCompensations,
      },
    ],
  },
};
