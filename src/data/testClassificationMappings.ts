// ============================================
// TABELA C - Mapeamento Teste → Classificação Funcional
// Define classificações geradas quando um teste FAIL/PARTIAL
// ============================================

import { FUNCTIONAL_CATEGORIES, CLASSIFICATION_LABELS } from './classificationIds';

export interface TestClassification {
  testId: string;
  testName: string;
  onFail: {
    hypo?: string[];
    hyper?: string[];
    mobL?: string[];
    instab?: string[];
    cm?: string[];
  };
  onPartial?: {
    hypo?: string[];
    hyper?: string[];
    mobL?: string[];
    instab?: string[];
    cm?: string[];
  };
}

export const testClassifications: TestClassification[] = [
  // ============================================
  // Testes de Quadril
  // ============================================
  
  // Superprompt: "Trendelenburg FAIL → HYPO GluteMed, INSTAB LateralPelvic, CM FrontalControl"
  {
    testId: 'trendelenburg',
    testName: 'Trendelenburg',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.GluteMed, CLASSIFICATION_LABELS.GluteMin],
      instab: [CLASSIFICATION_LABELS.LateralPelvic],
      cm: [CLASSIFICATION_LABELS.FrontalControl],
    },
    onPartial: {
      hypo: [CLASSIFICATION_LABELS.GluteMed],
      cm: [CLASSIFICATION_LABELS.FrontalControl],
    },
  },

  {
    testId: 'hip_abduction_strength',
    testName: 'Força de Abdutores do Quadril',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.GluteMed, CLASSIFICATION_LABELS.GluteMin],
    },
    onPartial: {
      hypo: [CLASSIFICATION_LABELS.GluteMed],
    },
  },

  {
    testId: 'hip_flexor_length',
    testName: 'Teste de Thomas Modificado',
    onFail: {
      hyper: [CLASSIFICATION_LABELS.HipFlexors, CLASSIFICATION_LABELS.TFL],
    },
  },

  {
    testId: 'hip_rotation',
    testName: 'Rotação Interna/Externa do Quadril',
    onFail: {
      mobL: [CLASSIFICATION_LABELS.HipER],
      hyper: [CLASSIFICATION_LABELS.Piriformis],
    },
  },

  {
    testId: 'ober_test',
    testName: 'Teste de Ober (TFL/Banda IT)',
    onFail: {
      hyper: [CLASSIFICATION_LABELS.TFL, CLASSIFICATION_LABELS.ITBand],
    },
  },

  // ============================================
  // Testes de Tornozelo/Pé
  // ============================================
  
  // Superprompt: "Knee-to-Wall FAIL → MOB-L Dorsiflexion + HYPER Gastroc/Soleus"
  {
    testId: 'ankle_dorsiflexion',
    testName: 'Dorsiflexão de Tornozelo (Knee-to-Wall)',
    onFail: {
      mobL: [CLASSIFICATION_LABELS.Dorsiflexion, CLASSIFICATION_LABELS.TCJoint],
      hyper: [CLASSIFICATION_LABELS.Gastroc, CLASSIFICATION_LABELS.Soleus],
    },
  },

  {
    testId: 'calf_flexibility',
    testName: 'Flexibilidade de Panturrilha',
    onFail: {
      hyper: [CLASSIFICATION_LABELS.Gastroc, CLASSIFICATION_LABELS.Soleus],
    },
  },

  // Superprompt: "Short-foot FAIL → HYPO TibPost, CM FootActivation"
  {
    testId: 'short_foot',
    testName: 'Short-foot Test',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.TibPost, CLASSIFICATION_LABELS.FootIntrinsics],
      instab: [CLASSIFICATION_LABELS.Arch],
      cm: [CLASSIFICATION_LABELS.FootActivation],
    },
    onPartial: {
      hypo: [CLASSIFICATION_LABELS.TibPost],
      cm: [CLASSIFICATION_LABELS.FootActivation],
    },
  },

  // ============================================
  // Testes de Core/Coluna
  // ============================================
  
  // Superprompt: "Dead Bug FAIL → HYPO CoreDeep, HYPER Paravertebrais, CM LumbarControl"
  {
    testId: 'dead_bug',
    testName: 'Dead Bug Test',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.CoreDeep],
      hyper: [CLASSIFICATION_LABELS.Paravertebrals],
      cm: [CLASSIFICATION_LABELS.LumbarControl],
    },
    onPartial: {
      hypo: [CLASSIFICATION_LABELS.CoreDeep],
      cm: [CLASSIFICATION_LABELS.LumbarControl],
    },
  },

  {
    testId: 'trunk_endurance_flexor',
    testName: 'Resistência de Flexores do Tronco',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.CoreDeep],
      cm: [CLASSIFICATION_LABELS.LumbarControl],
    },
  },

  {
    testId: 'trunk_endurance_lateral',
    testName: 'Side Bridge (Ponte Lateral)',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.CoreLateral],
      instab: [CLASSIFICATION_LABELS.LateralPelvic],
    },
  },

  {
    testId: 'prone_instability',
    testName: 'Teste de Instabilidade em Prono',
    onFail: {
      instab: [CLASSIFICATION_LABELS.Core],
      cm: [CLASSIFICATION_LABELS.LumbarControl],
    },
  },

  // Superprompt: "Tspine Extension FAIL → MOB-L TspineExtension"
  {
    testId: 'tspine_extension',
    testName: 'Extensão Torácica',
    onFail: {
      mobL: [CLASSIFICATION_LABELS.TspineExtension],
    },
  },

  // ============================================
  // Testes de Ombro/Escápula
  // ============================================
  
  {
    testId: 'shoulder_flexion',
    testName: 'Flexão Ativa do Ombro',
    onFail: {
      mobL: [CLASSIFICATION_LABELS.ShoulderFlexion],
      hyper: [CLASSIFICATION_LABELS.Lats, CLASSIFICATION_LABELS.PecMinor],
    },
  },

  {
    testId: 'pec_minor_length',
    testName: 'Comprimento do Peitoral Menor',
    onFail: {
      hyper: [CLASSIFICATION_LABELS.PecMinor],
    },
  },

  // Superprompt: "ScapularDyskinesis FAIL → HYPO Serratus/TrapInf, HYPER TrapSup, INSTAB Scapula, CM ScapularRhythm"
  {
    testId: 'scapular_dyskinesis',
    testName: 'Avaliação de Discinese Escapular',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.Serratus, CLASSIFICATION_LABELS.TrapInf],
      hyper: [CLASSIFICATION_LABELS.TrapSup],
      instab: [CLASSIFICATION_LABELS.Scapula],
      cm: [CLASSIFICATION_LABELS.ScapularRhythm],
    },
  },

  {
    testId: 'serratus_strength',
    testName: 'Força do Serrátil Anterior',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.Serratus],
      instab: [CLASSIFICATION_LABELS.Scapula],
    },
  },

  // ============================================
  // Testes Cervicais
  // ============================================
  
  {
    testId: 'cervical_flexion_endurance',
    testName: 'Resistência de Flexores Cervicais Profundos',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.DeepNeckFlexors],
      hyper: [CLASSIFICATION_LABELS.TrapSup, CLASSIFICATION_LABELS.SCM],
    },
  },

  {
    testId: 'upper_trap_length',
    testName: 'Comprimento do Trapézio Superior',
    onFail: {
      hyper: [CLASSIFICATION_LABELS.TrapSup],
    },
  },

  // ============================================
  // Testes de Joelho/Controle
  // ============================================
  
  {
    testId: 'single_leg_squat_control',
    testName: 'Controle de Flexão de Joelho',
    onFail: {
      hypo: [CLASSIFICATION_LABELS.GluteMed, CLASSIFICATION_LABELS.VMO],
      cm: [CLASSIFICATION_LABELS.QuadEccentric, CLASSIFICATION_LABELS.FrontalControl],
      instab: [CLASSIFICATION_LABELS.FrontalPlane],
    },
    onPartial: {
      cm: [CLASSIFICATION_LABELS.QuadEccentric],
    },
  },
];

// ============================================
// Funções Auxiliares
// ============================================

export function getClassificationForTest(
  testId: string, 
  result: 'pass' | 'partial' | 'fail'
): TestClassification['onFail'] | null {
  const classification = testClassifications.find(tc => tc.testId === testId);
  
  if (!classification) return null;
  
  if (result === 'fail') {
    return classification.onFail;
  }
  
  if (result === 'partial' && classification.onPartial) {
    return classification.onPartial;
  }
  
  return null;
}

export function getAllClassificationsFromTests(
  testResults: Array<{ testId: string; result: 'pass' | 'partial' | 'fail' }>
): {
  hypo: string[];
  hyper: string[];
  mobL: string[];
  instab: string[];
  cm: string[];
} {
  const aggregated = {
    hypo: new Set<string>(),
    hyper: new Set<string>(),
    mobL: new Set<string>(),
    instab: new Set<string>(),
    cm: new Set<string>(),
  };

  testResults.forEach(({ testId, result }) => {
    if (result === 'pass') return;
    
    const classification = getClassificationForTest(testId, result);
    if (!classification) return;

    classification.hypo?.forEach(h => aggregated.hypo.add(h));
    classification.hyper?.forEach(h => aggregated.hyper.add(h));
    classification.mobL?.forEach(m => aggregated.mobL.add(m));
    classification.instab?.forEach(i => aggregated.instab.add(i));
    classification.cm?.forEach(c => aggregated.cm.add(c));
  });

  return {
    hypo: Array.from(aggregated.hypo),
    hyper: Array.from(aggregated.hyper),
    mobL: Array.from(aggregated.mobL),
    instab: Array.from(aggregated.instab),
    cm: Array.from(aggregated.cm),
  };
}
