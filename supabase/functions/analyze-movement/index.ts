import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function validateAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { userId: user.id };
}

// ============================================
// DADOS CLÍNICOS COMPLETOS POR COMPENSAÇÃO
// ============================================
const COMPENSATION_DATA: Record<string, {
  label: string;
  hyperactive: string[];
  hypoactive: string[];
  injuries: string[];
  detection_criteria: string;
}> = {
  // OHS - Vista Anterior
  feet_abduction: {
    label: 'Pés abduzidos (giram para fora)',
    hyperactive: ['Piriforme', 'Rotadores laterais do quadril', 'Sóleo', 'Gastrocnêmio lateral', 'Bíceps femoral'],
    hypoactive: ['Rotadores mediais do quadril', 'Gastrocnêmio medial', 'Grácil', 'Sartório'],
    injuries: ['Fascite plantar', 'Tendinopatia do Aquiles', 'Síndrome da banda IT'],
    detection_criteria: 'Ângulo pés-frente >30° (15-30° pode ser normal). Pés claramente apontando para fora da linha média.',
  },
  feet_eversion: {
    label: 'Eversão dos pés (pronação)',
    hyperactive: ['Fibulares', 'Gastrocnêmio lateral', 'Bíceps femoral', 'TFL'],
    hypoactive: ['Tibial posterior', 'Flexor longo dos dedos', 'Tibial anterior', 'Glúteo médio'],
    injuries: ['Fascite plantar', 'Síndrome do estresse tibial', 'Tendinopatia tibial posterior'],
    detection_criteria: 'Arco plantar COLAPSA visivelmente. Calcanhares inclinam medialmente. Navicular desce.',
  },
  knee_valgus: {
    label: 'Joelhos valgos (cavam para dentro)',
    hyperactive: ['Adutores', 'TFL', 'Gastrocnêmio lateral', 'Vasto lateral', 'Bíceps femoral'],
    hypoactive: ['Glúteo médio', 'Glúteo máximo', 'VMO', 'Rotadores laterais do quadril'],
    injuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA', 'Condromalácia'],
    detection_criteria: 'Joelhos CLARAMENTE passam medialmente da linha do hálux. Valgo dinâmico evidente durante descida.',
  },
  knee_varus: {
    label: 'Joelhos varos (arqueados)',
    hyperactive: ['TFL', 'Piriforme', 'Glúteo mínimo', 'Bíceps femoral'],
    hypoactive: ['Glúteo máximo', 'Glúteo médio posterior', 'Vasto medial'],
    injuries: ['Sobrecarga lateral joelho', 'Síndrome banda IT', 'Artrose lateral'],
    detection_criteria: 'Joelhos se afastam lateralmente da linha vertical. Espaço excessivo entre joelhos.',
  },
  // OHS - Vista Lateral
  trunk_forward_lean: {
    label: 'Inclinação excessiva do tronco',
    hyperactive: ['Sóleo', 'Gastrocnêmio', 'Iliopsoas', 'Reto femoral', 'Reto abdominal'],
    hypoactive: ['Glúteo máximo', 'Eretores torácicos', 'Core estabilizador'],
    injuries: ['Dor lombar', 'Impacto femoroacetabular', 'Tendinopatia patelar'],
    detection_criteria: 'Tronco inclina >45° em relação à vertical. Ombros ficam significativamente à frente dos quadris.',
  },
  lumbar_hyperextension: {
    label: 'Hiperextensão lombar',
    hyperactive: ['Eretores lombares', 'Latíssimo do dorso', 'Psoas', 'Reto femoral'],
    hypoactive: ['Transverso abdominal', 'Oblíquos internos', 'Glúteo máximo', 'Isquiotibiais'],
    injuries: ['Espondilolistese', 'Dor lombar', 'Hérnia discal', 'Estenose lombar'],
    detection_criteria: 'Lordose EXAGERADA visível. Hiperlordose com barriga projetada. Anterversão pélvica acentuada.',
  },
  spine_flexion: {
    label: 'Flexão da coluna (butt wink)',
    hyperactive: ['Isquiotibiais', 'Glúteo máximo encurtado', 'Reto abdominal'],
    hypoactive: ['Eretores lombares', 'Multífidos', 'Flexores do quadril'],
    injuries: ['Hérnia discal', 'Dor lombar', 'Disfunção sacroilíaca', 'Protrusão discal'],
    detection_criteria: 'Arredondamento EVIDENTE da lombar no fundo do agachamento. Pelve posterioriza (butt wink pronunciado).',
  },
  heels_rise: {
    label: 'Calcanhares sobem',
    hyperactive: ['Sóleo', 'Gastrocnêmio', 'Flexores plantares'],
    hypoactive: ['Tibial anterior', 'Dorsiflexores do tornozelo'],
    injuries: ['Tendinopatia Aquiles', 'Fascite plantar', 'Instabilidade anterior joelho'],
    detection_criteria: 'Calcanhares CLARAMENTE se elevam do chão. Peso transfere para antepé.',
  },
  arms_fall_forward: {
    label: 'Braços caem para frente',
    hyperactive: ['Peitoral maior', 'Latíssimo do dorso', 'Redondo maior', 'Subescapular'],
    hypoactive: ['Trapézio médio/inferior', 'Romboides', 'Serrátil anterior', 'Manguito rotador'],
    injuries: ['Impacto do ombro', 'Síndrome desfiladeiro torácico', 'Cifose torácica'],
    detection_criteria: 'Braços caem ABAIXO da linha da cabeça. Perda da posição overhead durante descida.',
  },
  // OHS - Vista Posterior
  asymmetric_shift: {
    label: 'Shift pélvico assimétrico',
    hyperactive: ['Quadrado lombar ipsilateral', 'Adutores contralateral', 'TFL', 'Piriforme'],
    hypoactive: ['Glúteo médio contralateral', 'Oblíquos', 'Multífidos', 'Core lateral'],
    injuries: ['Disfunção sacroilíaca', 'Dor lombar unilateral', 'Síndrome do piriforme'],
    detection_criteria: 'Pelve desvia VISIVELMENTE para um lado (>2cm). Peso claramente mais em um membro.',
  },
  trunk_rotation: {
    label: 'Rotação do tronco',
    hyperactive: ['Oblíquo externo dominante', 'Latíssimo do dorso', 'Quadrado lombar'],
    hypoactive: ['Oblíquo interno', 'Multífidos', 'Core rotacional', 'Transverso abdominal'],
    injuries: ['Disfunção sacroilíaca', 'Dor lombar assimétrica', 'Escoliose funcional'],
    detection_criteria: 'Ombros ou pelve rotam de forma ASSIMÉTRICA. Um ombro claramente mais anterior que outro.',
  },
  // SLS - Vista Anterior
  foot_collapse: {
    label: 'Colapso do arco plantar',
    hyperactive: ['Fibulares', 'Gastrocnêmio lateral', 'Extensor longo dos dedos'],
    hypoactive: ['Tibial posterior', 'Flexor longo dos dedos', 'Intrínsecos do pé', 'Tibial anterior'],
    injuries: ['Fascite plantar', 'Tendinopatia tibial posterior', 'Síndrome estresse tibial'],
    detection_criteria: 'Arco plantar COLAPSA completamente sob carga. Navicular desce até quase tocar o solo.',
  },
  balance_loss: {
    label: 'Perda de equilíbrio (instabilidade, tremor, queda)',
    hyperactive: ['TFL', 'Quadríceps superficial', 'Fibulares', 'Flexores dos dedos', 'Musculatura superficial', 'Gastrocnêmio'],
    hypoactive: ['Glúteo médio', 'Core estabilizador', 'Estabilizadores tornozelo', 'Tibial posterior', 'Core', 'Proprioceptores tornozelo', 'Estabilizadores profundos', 'Multífidos'],
    injuries: ['Entorses tornozelo recorrentes', 'Risco lesão LCA', 'Instabilidade patelar', 'Fadiga muscular precoce', 'Risco quedas', 'Instabilidade crônica'],
    detection_criteria: 'Oscilações GRANDES e REPETIDAS, tremor VISÍVEL e PERSISTENTE, ou PERDE o apoio/precisa tocar o chão.',
  },
  // SLS - Vista Lateral
  trunk_forward_lean_sls: {
    label: 'Inclinação anterior do tronco',
    hyperactive: ['Iliopsoas', 'Reto femoral', 'Eretores lombares'],
    hypoactive: ['Glúteo máximo', 'Core anterior', 'Transverso abdominal'],
    injuries: ['Sobrecarga lombar', 'Impacto do quadril'],
    detection_criteria: 'Inclinação >30° para frente. Tronco projeta significativamente sobre coxa.',
  },
  knee_flexion_insufficient: {
    label: 'Flexão insuficiente de joelho',
    hyperactive: ['Quadríceps em proteção', 'Gastrocnêmio'],
    hypoactive: ['Glúteo máximo', 'Controle excêntrico quadríceps'],
    injuries: ['Compensação por dor ou restrição', 'Déficit controle motor'],
    detection_criteria: 'Joelho flexiona <30° (amplitude MUITO limitada). Agachamento extremamente raso.',
  },
  // SLS - Vista Posterior
  hip_drop: {
    label: 'Queda do quadril (Trendelenburg)',
    hyperactive: ['Quadrado lombar lado apoio', 'TFL', 'Piriforme', 'Adutores'],
    hypoactive: ['Glúteo médio', 'Glúteo mínimo', 'Core lateral', 'Oblíquos'],
    injuries: ['Síndrome banda IT', 'Tendinopatia glútea', 'Bursite trocantérica'],
    detection_criteria: 'Pelve CAI >5° do lado contralateral. Trendelenburg POSITIVO claro. Crista ilíaca contralateral desce.',
  },
  hip_hike: {
    label: 'Elevação do quadril (hip hike)',
    hyperactive: ['Quadrado lombar contralateral', 'TFL', 'Glúteo mínimo', 'Adutores'],
    hypoactive: ['Glúteo médio ipsilateral', 'Core estabilizador'],
    injuries: ['Compensações sacroilíacas', 'Dor lateral quadril'],
    detection_criteria: 'Elevação EXAGERADA da pelve contralateral. Crista ilíaca sobe acima do normal.',
  },
  trunk_rotation_medial: {
    label: 'Rotação medial do tronco',
    hyperactive: ['Oblíquos internos', 'Oblíquos externos', 'TFL'],
    hypoactive: ['Glúteo médio', 'Glúteo máximo', 'Core estabilizador'],
    injuries: ['Valgo persistente', 'Sobrecarga lombar'],
    detection_criteria: 'Tronco rota >15° para dentro (medialmente). Ombro do lado de apoio gira para frente.',
  },
  trunk_rotation_lateral: {
    label: 'Rotação lateral do tronco',
    hyperactive: ['Oblíquos externos contralateral', 'Quadrado lombar'],
    hypoactive: ['Glúteo médio', 'Oblíquos internos', 'Core estabilizador'],
    injuries: ['Desequilíbrio rotacional', 'Dor lombar'],
    detection_criteria: 'Tronco rota >15° para fora (lateralmente). Ombro do lado de apoio gira para trás.',
  },
  // Push-up - Vista Lateral
  hip_elevation: {
    label: 'Elevação do quadril (pike)',
    hyperactive: ['Flexores quadril', 'Reto abdominal'],
    hypoactive: ['Glúteos', 'Core estabilizador', 'Transverso abdominal'],
    injuries: ['Sobrecarga lombar', 'Déficit core'],
    detection_criteria: 'Quadril sobe formando "pirâmide". Pike EVIDENTE quebrando alinhamento corporal.',
  },
  hip_drop_pushup: {
    label: 'Queda do quadril (push-up)',
    hyperactive: ['Eretores lombares', 'Quadrado lombar'],
    hypoactive: ['Core anterior', 'Glúteos', 'Transverso abdominal'],
    injuries: ['Dor lombar', 'Hiperlordose'],
    detection_criteria: 'Quadril afunda criando lordose EXAGERADA. Barriga cai em direção ao solo.',
  },
  // Push-up - Vista Posterior
  scapular_winging: {
    label: 'Escápula alada',
    hyperactive: ['Peitoral menor', 'Romboides', 'Levantador escápula', 'Trapézio superior'],
    hypoactive: ['Serrátil anterior', 'Trapézio inferior', 'Trapézio médio'],
    injuries: ['Discinese escapular', 'Impacto ombro', 'Tendinopatia manguito rotador'],
    detection_criteria: 'Borda medial da escápula PROJETA-SE >2cm do tórax. Escápula "descola" das costelas.',
  },
  elbow_flare: {
    label: 'Flare de cotovelos',
    hyperactive: ['Peitoral maior esternal', 'Deltóide anterior', 'Subescapular', 'Deltóide médio'],
    hypoactive: ['Tríceps', 'Serrátil anterior', 'Rotadores externos', 'Infraespinhal'],
    injuries: ['Impacto ombro', 'Tendinopatia manguito', 'Bursite subacromial'],
    detection_criteria: 'Cotovelos abrem >60° do tronco. Forma de "T" ao invés de seta.',
  },
  shoulder_protraction: {
    label: 'Protração excessiva ombros',
    hyperactive: ['Peitoral menor', 'Serrátil anterior dominante', 'Peitoral maior'],
    hypoactive: ['Trapézio médio', 'Romboides', 'Trapézio inferior'],
    injuries: ['Cifose torácica', 'Impacto ombro', 'Síndrome desfiladeiro'],
    detection_criteria: 'Protração EXAGERADA no topo. Ombros muito arredondados para frente.',
  },
  shoulder_retraction_insufficient: {
    label: 'Retração escapular insuficiente',
    hyperactive: ['Peitoral menor', 'Serrátil anterior'],
    hypoactive: ['Romboides', 'Trapézio médio', 'Trapézio inferior'],
    injuries: ['Discinese escapular', 'Impacto ombro'],
    detection_criteria: 'Escápulas NÃO se aproximam na fase excêntrica. Falta de retração no fundo do movimento.',
  },
};

function getCompensationContext(compensationIds: string[]): string {
  const contexts: string[] = [];
  for (const id of compensationIds) {
    const data = COMPENSATION_DATA[id];
    if (data) {
      contexts.push(`
${id.toUpperCase()} - ${data.label}:
  • Critério: ${data.detection_criteria}
  • Hiperativos: ${data.hyperactive.slice(0, 4).join(', ')}
  • Hipoativos: ${data.hypoactive.slice(0, 4).join(', ')}
  • Riscos: ${data.injuries.slice(0, 2).join(', ')}`);
    }
  }
  return contexts.length > 0 ? contexts.join('\n') : '';
}

// ============================================
// TOOL CALLING SCHEMA - SIMPLIFIED
// ============================================
const ANALYSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "report_analysis",
    description: "Report detected movement compensations",
    parameters: {
      type: "object",
      properties: {
        detected_compensations: {
          type: "array",
          items: { type: "string" },
          description: "Array of compensation IDs detected (use EXACT IDs provided in prompt)"
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence level 0-1 based on image quality and visibility"
        }
      },
      required: ["detected_compensations", "confidence"]
    }
  }
};

// ============================================
// PROMPTS - DETECTION ONLY (no analysis)
// ============================================
const OHS_PROMPTS: Record<string, string> = {
  anterior: `Analise OVERHEAD SQUAT - VISTA ANTERIOR.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- feet_abduction: Pés giram para fora >30°
- feet_eversion: Arco plantar colapsa, calcanhares inclinam medialmente
- knee_valgus: Joelhos passam medialmente da linha do hálux
- knee_varus: Joelhos se afastam lateralmente

REGRA: Reporte APENAS compensações CLARAMENTE visíveis. Na dúvida, NÃO reporte.
Use report_analysis com detected_compensations e confidence.`,

  lateral: `Analise OVERHEAD SQUAT - VISTA LATERAL.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- trunk_forward_lean: Tronco inclina >45° da vertical
- lumbar_hyperextension: Lordose EXAGERADA (barriga projetada)
- spine_flexion: Butt wink - lombar ARREDONDA no fundo do agachamento
- heels_rise: Calcanhares elevam do chão
- arms_fall_forward: Braços caem abaixo da linha da cabeça

ATENÇÃO: spine_flexion e lumbar_hyperextension são OPOSTOS - só um pode ocorrer.
Analise o FUNDO do agachamento para detectar butt wink.

Use report_analysis com detected_compensations e confidence.`,

  posterior: `Analise OVERHEAD SQUAT - VISTA POSTERIOR.

LATERALIDADE: esquerda da imagem = direito anatômico.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- asymmetric_shift: Pelve desvia >2cm para um lado
- trunk_rotation: Ombros ou pelve rotam assimetricamente

Use report_analysis com detected_compensations e confidence.`,
};

const SLS_PROMPTS: Record<string, string> = {
  anterior: `Analise SINGLE-LEG SQUAT - VISTA ANTERIOR.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- knee_valgus: Joelho desvia medialmente
- foot_collapse: Arco plantar colapsa completamente
- balance_loss: Oscilações grandes/repetidas, tremor visível/persistente, ou perde apoio/toca o chão

Use report_analysis com detected_compensations e confidence.`,

  lateral: `Analise SINGLE-LEG SQUAT - VISTA LATERAL.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- trunk_forward_lean_sls: Inclinação >30° para frente
- knee_flexion_insufficient: Joelho flexiona <30° (muito raso)

Use report_analysis com detected_compensations e confidence.`,

  posterior: `Analise SINGLE-LEG SQUAT - VISTA POSTERIOR.

LATERALIDADE: esquerda da imagem = direito anatômico.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- hip_drop: Pelve CAI >5° do lado contralateral (Trendelenburg)
- hip_hike: Pelve ELEVA exageradamente do lado contralateral
- trunk_rotation_medial: Tronco rota >15° para dentro
- trunk_rotation_lateral: Tronco rota >15° para fora

Use report_analysis com detected_compensations e confidence.`,
};

const PUSHUP_PROMPTS: Record<string, string> = {
  lateral: `Analise PUSH-UP - VISTA LATERAL.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- hip_elevation: Quadril sobe formando "pirâmide" (pike)
- hip_drop_pushup: Quadril afunda criando lordose exagerada

Use report_analysis com detected_compensations e confidence.`,

  posterior: `Analise PUSH-UP - VISTA POSTERIOR.

LATERALIDADE: esquerda da imagem = direito anatômico.

COMPENSAÇÕES POSSÍVEIS (use APENAS estes IDs se detectadas):
- scapular_winging: Borda medial da escápula projeta-se >2cm do tórax
- elbow_flare: Cotovelos abrem >60° do tronco (forma de "T")
- shoulder_protraction: Ombros muito arredondados para frente
- shoulder_retraction_insufficient: Escápulas não se aproximam na fase excêntrica

Use report_analysis com detected_compensations e confidence.`,
};

// ============================================
// SLS LATERALITY CONTEXT HELPERS
// ============================================

function parseSLSViewType(viewType: string): { side: 'left' | 'right' | null; baseView: string } {
  const parts = viewType.toLowerCase().split('_');
  if (parts.length >= 2 && ['left', 'right'].includes(parts[0])) {
    return { 
      side: parts[0] as 'left' | 'right', 
      baseView: parts.slice(1).join('_')
    };
  }
  return { side: null, baseView: viewType };
}

function getSLSLateralityContext(side: 'left' | 'right', view: 'anterior' | 'lateral' | 'posterior'): string {
  const supportSide = side === 'left' ? 'ESQUERDA' : 'DIREITA';
  const supportSideLower = side === 'left' ? 'esquerdo' : 'direito';
  
  if (view === 'posterior') {
    return `
CONTEXTO: SINGLE-LEG SQUAT ${supportSide} - VISTA POSTERIOR.
Paciente APOIADO na PERNA ${supportSide}.

LÓGICA CONTRALATERAL:
- Se a pelve contralateral CAI (hip_drop) → indica DÉFICIT no GLÚTEO MÉDIO ${supportSide}
- Qualquer compensação indica DÉFICIT FUNCIONAL no lado ${supportSideLower}

REGRA: Use side_bias: "${side}" para TODAS as compensações detectadas.

`;
  }
  
  if (view === 'lateral') {
    return `
CONTEXTO: SINGLE-LEG SQUAT ${supportSide} - VISTA LATERAL.
Paciente APOIADO na PERNA ${supportSide}.

IMPORTANTE:
- Todas as compensações referem-se ao lado ${supportSideLower}
- O joelho e quadril analisados são do lado ${supportSideLower}

REGRA: Use side_bias: "${side}" para TODAS as compensações detectadas.

`;
  }
  
  return `
CONTEXTO: SINGLE-LEG SQUAT ${supportSide} - VISTA ANTERIOR.
Paciente APOIADO na PERNA ${supportSide}.

IMPORTANTE:
- Todas as compensações referem-se ao lado ${supportSideLower}
- O joelho analisado é o JOELHO ${supportSide}

REGRA: Use side_bias: "${side}" para TODAS as compensações detectadas.

`;
}

// Build prompt for segmental tests
function buildSegmentalPrompt(params: {
  testName: string;
  cutoffValue?: number;
  unit?: string;
  resultType?: 'quantitative' | 'qualitative';
  isBilateral?: boolean;
  instructions?: string;
}): string {
  const { testName, cutoffValue, unit, resultType, isBilateral, instructions } = params;

  if (resultType === 'quantitative') {
    return `Você é um fisioterapeuta especialista. Analise esta imagem/vídeo do teste "${testName}".
${instructions ? `Instruções: ${instructions}\n` : ''}
${isBilateral ? 'Teste BILATERAL - avalie ambos os lados.' : ''}
Valor de corte: ${cutoffValue} ${unit || ''}

Responda em JSON:
{
  ${isBilateral ? `"left_value": número, "right_value": número, "left_result": "pass" | "partial" | "fail", "right_result": "pass" | "partial" | "fail",` : `"value": número, "result": "pass" | "partial" | "fail",`}
  "confidence": 0.85,
  "notes": "Observações clínicas"
}`;
  }

  return `Você é um fisioterapeuta especialista. Analise esta imagem/vídeo do teste "${testName}".
${instructions ? `Instruções: ${instructions}\n` : ''}
${isBilateral ? 'Teste BILATERAL - avalie ambos os lados.' : ''}

Responda em JSON:
{
  ${isBilateral ? `"left_result": "pass" | "partial" | "fail", "right_result": "pass" | "partial" | "fail",` : `"result": "pass" | "partial" | "fail",`}
  "confidence": 0.85,
  "notes": "Observações clínicas"
}`;
}

// Build prompt for quick protocol tests
function buildQuickProtocolPrompt(params: {
  testId: string;
  testName: string;
  layer: string;
  options: string[];
  isBilateral: boolean;
  instructions?: string;
}): string {
  const { testName, layer, options, isBilateral, instructions } = params;
  
  const layerDescription = {
    mobility: 'Avalie a AMPLITUDE DE MOVIMENTO',
    stability: 'Avalie a ESTABILIDADE DINÂMICA',
    motor_control: 'Avalie o CONTROLE NEUROMOTOR',
  }[layer] || 'Avalie a qualidade do movimento';
  
  return `Você é um fisioterapeuta especialista em protocolos rápidos de dor.

TESTE: "${testName}"
CAMADA: ${layer.toUpperCase()} - ${layerDescription}

${instructions ? `INSTRUÇÕES: ${instructions}\n` : ''}
${isBilateral ? 'Teste BILATERAL - avalie ambos os lados.' : ''}

OPÇÕES A DETECTAR:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Responda em JSON:
{
  "detected_options": ["opções_detectadas"],
  "pain_indicators": true/false,
  ${isBilateral ? `"left_findings": ["achados_esquerda"], "right_findings": ["achados_direita"],` : ''}
  "confidence": 0.85,
  "notes": "Observações clínicas"
}`;
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await validateAuth(req);
    if (!auth) {
      console.error('Unauthorized request to analyze-movement');
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    console.log(`Authenticated: ${auth.userId}`);

    const { 
      testType, testName, imageUrl, videoUrl, viewType,
      cutoffValue, unit, resultType, isBilateral, instructions,
      testId, options, layer,
    } = await req.json();

    if (!testType || !imageUrl) {
      return jsonResponse({ error: 'testType and imageUrl are required' }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }

    // Select prompt based on test type and view
    let prompt: string;
    
    if (testType === 'quick_protocol') {
      prompt = buildQuickProtocolPrompt({
        testId: testId || 'unknown',
        testName: testName || 'Teste Rápido',
        layer: layer || 'mobility',
        options: options || [],
        isBilateral: isBilateral !== false,
        instructions,
      });
      console.log(`Quick protocol: ${testName}, layer: ${layer}`);
    } else if (testType === 'segmental') {
      prompt = buildSegmentalPrompt({
        testName: testName || 'Teste Segmentado',
        cutoffValue, unit, resultType, isBilateral, instructions
      });
      console.log(`Segmental: ${testName}, bilateral: ${isBilateral}`);
    } else {
      // Global tests - use view-specific prompts
      const view = viewType?.toLowerCase() || 'anterior';
      
      if (testType === 'overhead_squat') {
        prompt = OHS_PROMPTS[view] || OHS_PROMPTS.anterior;
        console.log(`Global test: ${testType} - ${view} view`);
      } else if (testType === 'single_leg_squat') {
        const { side, baseView } = parseSLSViewType(view);
        const basePrompt = SLS_PROMPTS[baseView] || SLS_PROMPTS.anterior;
        
        if (side && ['anterior', 'lateral', 'posterior'].includes(baseView)) {
          const lateralityContext = getSLSLateralityContext(side, baseView as 'anterior' | 'lateral' | 'posterior');
          prompt = lateralityContext + basePrompt;
          console.log(`Global test: ${testType} - ${baseView} view, SUPPORT SIDE: ${side.toUpperCase()}`);
        } else {
          prompt = basePrompt;
          console.log(`Global test: ${testType} - ${baseView} view (no side specified)`);
        }
      } else if (testType === 'pushup') {
        prompt = PUSHUP_PROMPTS[view] || PUSHUP_PROMPTS.posterior;
        console.log(`Global test: ${testType} - ${view} view`);
      } else {
        return jsonResponse({ error: 'Unknown test type' }, 400);
      }
    }

    // Build request
    const useToolCalling = ['overhead_squat', 'single_leg_squat', 'pushup'].includes(testType);
    
    const requestBody: Record<string, unknown> = {
      model: 'google/gemini-2.5-pro',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      max_tokens: 2500,
      temperature: 0,
    };

    if (useToolCalling) {
      requestBody.tools = [ANALYSIS_TOOL];
      requestBody.tool_choice = { type: "function", function: { name: "report_analysis" } };
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) return jsonResponse({ error: 'Rate limit exceeded' }, 429);
      if (response.status === 402) return jsonResponse({ error: 'AI credits exhausted' }, 402);
      return jsonResponse({ error: 'AI analysis failed' }, 500);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const aiResponse = data.choices?.[0]?.message?.content;

    let analysisResult;

    if (toolCall?.function?.arguments) {
      analysisResult = JSON.parse(toolCall.function.arguments);
      console.log('Tool response:', analysisResult);
      
      if (analysisResult.technical_note && !analysisResult.notes) {
        analysisResult.notes = analysisResult.technical_note;
      }
    } else if (aiResponse) {
      console.log('AI response:', aiResponse.substring(0, 300));
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      analysisResult = JSON.parse(jsonMatch[0]);
    } else {
      return jsonResponse({ error: 'Empty AI response' }, 500);
    }

    console.log('Analysis result:', analysisResult);

    return jsonResponse({
      success: true,
      testType,
      testName,
      viewType,
      analysis: analysisResult,
    });

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
