// ============================================
// Segmental Tests - Testes Segmentados
// Refatorado para usar fluxo: Compensação → Causa → Teste
// ============================================

import { compensacaoCausas } from './weightEngine';
import { causaToTests } from './causaTestMappings';

export interface SegmentalTest {
  id: string;
  name: string;
  bodyRegion: string;
  description: string;
  unit: string;
  cutoffValue?: number;
  isBilateral: boolean;
  instructions: string;
  // Resultado aceito: 'quantitative' (valor numérico) ou 'qualitative' (pass/partial/fail)
  resultType?: 'quantitative' | 'qualitative';
  // Mídia preferida para análise por IA
  preferredMedia?: 'photo' | 'video';
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
  },
  // Short-foot Test - Convertido para quantitativo (Superprompt Tabela C)
  {
    id: 'short_foot',
    name: 'Short-foot Test',
    bodyRegion: 'Pé',
    description: 'Avalia a capacidade de ativação do arco plantar e intrínsecos do pé',
    unit: 'mm',
    cutoffValue: 5,
    isBilateral: true,
    instructions: `Análise quantitativa do Short-foot Test:
MEDIÇÃO PRINCIPAL: Elevação do arco navicular em milímetros
- Identifique o osso navicular (proeminência medial do pé)
- Compare a altura do arco em repouso vs durante ativação
- Meça a diferença de elevação em mm

CRITÉRIOS:
- ≥5mm de elevação: PASS (boa ativação dos intrínsecos)
- 2-5mm: PARTIAL (ativação fraca)
- <2mm: FAIL (incapacidade de ativar arco)

OBSERVAR TAMBÉM:
- Flexão compensatória dos dedos (invalida o teste)
- Inversão excessiva do retropé
- Tremor durante sustentação`,
    resultType: 'quantitative',
    preferredMedia: 'video',
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
  },
  // Trendelenburg - Convertido para quantitativo (Superprompt Tabela C)
  {
    id: 'trendelenburg',
    name: 'Teste de Trendelenburg',
    bodyRegion: 'Quadril',
    description: 'Avalia a função do glúteo médio e estabilidade pélvica frontal durante apoio unipodal',
    unit: 'graus',
    cutoffValue: 5,
    isBilateral: true,
    instructions: `Análise quantitativa do Teste de Trendelenburg:
MEDIÇÃO PRINCIPAL: Ângulo de queda pélvica em graus
- Identifique as EIAS (cristas ilíacas anteriores) bilateralmente
- Trace uma linha horizontal conectando as EIAS
- Compare com linha horizontal de referência (solo/fundo)
- Calcule o ângulo de inclinação da pelve

CRITÉRIOS:
- 0-5° de queda: PASS (pelve nivelada ou queda mínima)
- 5-10°: PARTIAL (queda moderada - fraqueza leve)
- >10°: FAIL (Trendelenburg positivo - fraqueza significativa)

OBSERVAR TAMBÉM:
- Inclinação lateral do tronco (compensação)
- Tempo até falha (se <30s = instabilidade)
- Tremor durante sustentação`,
    resultType: 'quantitative',
    preferredMedia: 'video',
  },

  // ============================================
  // Core/Spine Tests
  // ============================================
  // Instabilidade em Prono - Mantido qualitativo (depende de feedback de dor do paciente)
  {
    id: 'prone_instability',
    name: 'Teste de Instabilidade em Prono',
    bodyRegion: 'Lombar',
    description: 'Avalia a estabilidade segmentar lombar',
    unit: 'positivo/negativo',
    isBilateral: false,
    instructions: `Teste de Instabilidade em Prono:
PROCEDIMENTO:
1. Paciente em prono sobre a maca com pernas para fora
2. Realize pressão sobre processos espinhosos lombares
3. Peça ativação dos extensores (elevação das pernas)
4. Repita a pressão com extensores ativados

INTERPRETAÇÃO (baseada em relato do paciente):
- POSITIVO: Dor que alivia com ativação muscular = instabilidade
- NEGATIVO: Sem diferença na dor = estabilidade preservada

NOTA: Este teste requer feedback verbal do paciente sobre dor.`,
    resultType: 'qualitative',
    preferredMedia: 'video',
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
  },
  // Dead Bug Test - Convertido para quantitativo (Superprompt Tabela C)
  {
    id: 'dead_bug',
    name: 'Dead Bug Test',
    bodyRegion: 'Core',
    description: 'Avalia controle motor do core profundo e capacidade de dissociação lombo-pélvica',
    unit: 'segundos',
    cutoffValue: 30,
    isBilateral: false,
    instructions: `Análise quantitativa do Dead Bug Test:
MEDIÇÃO PRINCIPAL: Tempo em segundos até perda de controle
- Posição inicial: decúbito dorsal, quadris/joelhos a 90°, braços para o teto
- Movimento: extensão alternada de braço e perna opostos
- Cronometre até primeira falha de controle

CRITÉRIOS DE TEMPO:
- ≥30 segundos sem compensação: PASS
- 15-30 segundos: PARTIAL
- <15 segundos: FAIL

SINAIS DE FALHA (encerrar cronômetro):
- Arqueamento lombar (perda de contato com solo)
- Tremor significativo
- Rotação pélvica
- Assimetria de movimento E/D`,
    resultType: 'quantitative',
    preferredMedia: 'video',
  },
  // NEW: Tspine Extension (Superprompt Tabela C)
  {
    id: 'tspine_extension',
    name: 'Extensão Torácica',
    bodyRegion: 'Torácica',
    description: 'Avalia a mobilidade de extensão da coluna torácica',
    unit: 'graus',
    cutoffValue: 25,
    isBilateral: false,
    instructions: 'Sentado ou em quadrupedia, mãos na nuca. Realize extensão torácica máxima observando o movimento da coluna. Pode-se medir com inclinômetro ou observar qualitativamente.',
    resultType: 'quantitative',
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
  },
  // Discinese Escapular - Convertido para quantitativo
  {
    id: 'scapular_dyskinesis',
    name: 'Avaliação de Discinese Escapular',
    bodyRegion: 'Escápula',
    description: 'Observação dinâmica do movimento escapular',
    unit: 'cm',
    cutoffValue: 2,
    isBilateral: true,
    instructions: `Análise quantitativa de Discinese Escapular:
MEDIÇÃO PRINCIPAL: Distância borda medial da escápula até coluna vertebral (cm)
- Posição: paciente de costas, braços em abdução 90° com peso leve
- Meça a distância da borda medial da escápula até a linha dos processos espinhosos
- Compare bilateralmente

CRITÉRIOS:
- ≤2cm de diferença bilateral: PASS (simétrico)
- 2-3cm de diferença: PARTIAL (assimetria leve)
- >3cm de diferença: FAIL (discinese significativa)

OBSERVAR PADRÃO:
- Tipo I: Proeminência do ângulo inferior
- Tipo II: Proeminência da borda medial inteira
- Tipo III: Elevação excessiva do ombro
- Tipo IV: Ritmo assimétrico bilateral

REGISTRAR: distância E/D e tipo de padrão observado`,
    resultType: 'quantitative',
    preferredMedia: 'video',
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
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
    resultType: 'quantitative',
  },

  // ============================================
  // Knee/Control Tests
  // ============================================
  // Controle de Joelho - Convertido para quantitativo
  {
    id: 'single_leg_squat_control',
    name: 'Controle de Flexão de Joelho',
    bodyRegion: 'Joelho',
    description: 'Avalia controle excêntrico do quadríceps e estabilidade do joelho',
    unit: 'graus',
    cutoffValue: 15,
    isBilateral: true,
    instructions: `Análise quantitativa do Controle de Joelho:
MEDIÇÃO PRINCIPAL: Ângulo de valgo dinâmico em graus
- Posição: vista frontal durante agachamento unilateral
- Trace linha do centro do quadril ao centro do joelho
- Trace linha do centro do joelho ao centro do tornozelo
- Meça o ângulo entre as linhas (desvio medial = valgo)

CRITÉRIOS:
- <15° de valgo dinâmico: PASS (bom controle)
- 15-25°: PARTIAL (valgo moderado)
- >25°: FAIL (valgo excessivo - risco de lesão)

OBSERVAR TAMBÉM:
- Profundidade alcançada (ideal: 60° de flexão)
- Tremor durante descida excêntrica
- Inclinação lateral do tronco
- Rotação medial do fêmur`,
    resultType: 'quantitative',
    preferredMedia: 'video',
  },
];

// ============================================
// getSuggestedTests - Fluxo Compensação → Causa → Teste
// ============================================

export function getSuggestedTests(compensationIds: string[]): SegmentalTest[] {
  if (!compensationIds || compensationIds.length === 0) return [];

  // 1. Compensações → Causas (via Tabela A / weightEngine)
  const allCausaIds = new Set<string>();
  compensationIds.forEach(compId => {
    const causas = compensacaoCausas[compId] || [];
    causas.forEach(causa => allCausaIds.add(causa.id));
  });

  // 2. Causas → Testes (via Tabela B / causaToTests)
  const suggestedTestIds = new Set<string>();
  allCausaIds.forEach(causaId => {
    const tests = causaToTests[causaId] || [];
    tests.forEach(testId => suggestedTestIds.add(testId));
  });

  // 3. Retornar testes correspondentes, ordenados por região
  const suggested = segmentalTests.filter(test => 
    suggestedTestIds.has(test.id)
  );

  return suggested.sort((a, b) => a.bodyRegion.localeCompare(b.bodyRegion));
}

// ============================================
// Funções Auxiliares
// ============================================

export function groupTestsByRegion(tests: SegmentalTest[]): Record<string, SegmentalTest[]> {
  return tests.reduce((acc, test) => {
    if (!acc[test.bodyRegion]) {
      acc[test.bodyRegion] = [];
    }
    acc[test.bodyRegion].push(test);
    return acc;
  }, {} as Record<string, SegmentalTest[]>);
}

export function getTestById(testId: string): SegmentalTest | undefined {
  return segmentalTests.find(test => test.id === testId);
}

// Validação de IDs de teste referenciados em causaToTests
export function validateTestIdsInCausaToTests(): { valid: boolean; missingTests: string[] } {
  const allTestIds = new Set(segmentalTests.map(t => t.id));
  const referencedTestIds = new Set<string>();
  
  Object.values(causaToTests).forEach(tests => {
    tests.forEach(testId => referencedTestIds.add(testId));
  });

  const missingTests = Array.from(referencedTestIds).filter(id => !allTestIds.has(id));
  
  if (missingTests.length > 0) {
    console.warn('[FABRIK] Testes referenciados em causaToTests mas não definidos:', missingTests);
  }

  return { valid: missingTests.length === 0, missingTests };
}

// Executar validação em desenvolvimento
if (import.meta.env.DEV) {
  validateTestIdsInCausaToTests();
}
