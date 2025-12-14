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
// Baseado na Tabela A - Mapeamento Compensação → Músculos
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
  instability: {
    label: 'Instabilidade geral',
    hyperactive: ['TFL', 'Quadríceps superficial', 'Fibulares'],
    hypoactive: ['Glúteo médio', 'Core estabilizador', 'Estabilizadores tornozelo', 'Tibial posterior'],
    injuries: ['Entorses tornozelo recorrentes', 'Risco lesão LCA', 'Instabilidade patelar'],
    detection_criteria: 'Oscilações GRANDES e REPETIDAS durante todo o movimento. Não consegue manter posição estável.',
  },
  tremor: {
    label: 'Tremor persistente',
    hyperactive: ['Musculatura superficial em fadiga', 'Quadríceps', 'TFL'],
    hypoactive: ['Estabilizadores profundos', 'Core', 'Glúteo médio', 'Multífidos'],
    injuries: ['Risco lesão por instabilidade', 'Fadiga muscular precoce'],
    detection_criteria: 'Tremor VISÍVEL e PERSISTENTE durante toda execução. Não são apenas micromovimentos.',
  },
  balance_loss: {
    label: 'Perda de equilíbrio',
    hyperactive: ['Flexores dos dedos', 'Musculatura superficial', 'Gastrocnêmio'],
    hypoactive: ['Glúteo médio', 'Core', 'Proprioceptores tornozelo', 'Estabilizadores profundos'],
    injuries: ['Entorses recorrentes', 'Risco quedas', 'Instabilidade crônica'],
    detection_criteria: 'PERDE o apoio ou precisa tocar o chão com pé contralateral.',
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
  
  // Push-up
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
};

// Gerar contexto clínico formatado para prompt
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
// TOOL CALLING SCHEMA (PADRONIZADO)
// ============================================
const ANALYSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "report_analysis",
    description: "Report structured movement analysis with clinical precision",
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
        },
        severity: {
          type: "string",
          enum: ["minimal", "moderate", "marked"],
          description: "minimal: 1-2 leves, moderate: 3+ ou significativas, marked: múltiplas severas"
        },
        primary_compensation: {
          type: "string",
          nullable: true,
          description: "Most clinically significant compensation, or null if none"
        },
        side_bias: {
          type: "string",
          enum: ["left", "right", "bilateral", "symmetric"],
          description: "Which side shows more dysfunction"
        },
        requires_attention: {
          type: "boolean",
          description: "True if compensation indicates injury risk or requires immediate attention"
        },
        technical_note: {
          type: "string",
          maxLength: 300,
          description: "Observação clínica em português. Descreva QUALITATIVAMENTE o que observa: padrões de movimento, assimetrias (unilateral/bilateral), implicações musculares (hiper/hipoativos), qualidade do movimento (leve/moderada/acentuada, consistente/intermitente). NÃO cite ângulos específicos ou medidas numéricas - foque em descrições visuais e funcionais."
        }
      },
      required: ["detected_compensations", "confidence", "severity", "side_bias", "requires_attention", "technical_note"]
    }
  }
};

// ============================================
// PROMPTS ESPECÍFICOS POR VISTA
// ============================================

const OHS_PROMPTS: Record<string, string> = {
  anterior: `Você é um fisioterapeuta especialista em biomecânica do movimento com 15 anos de experiência clínica.
Analise esta imagem de OVERHEAD SQUAT - VISTA ANTERIOR (frontal).

OBJETIVO: Identificar compensações que indiquem disfunções neuromusculares, limitações de mobilidade ou déficits de controle motor.

COMPENSAÇÕES DETECTÁVEIS NESTA VISTA (use APENAS estes IDs):

${getCompensationContext(['feet_abduction', 'feet_eversion', 'knee_valgus', 'knee_varus'])}

ANÁLISE BIOMECÂNICA:
1. Observe a BASE DE APOIO: largura, ângulo dos pés, simetria
2. Analise o COMPLEXO TORNOZELO-PÉ: arco plantar, posição do calcâneo, pronação
3. Avalie os JOELHOS: alinhamento patela-hálux, valgo/varo dinâmico
4. Note ASSIMETRIAS entre lados esquerdo e direito

CRITÉRIOS DE REPORTE:
- Reporte APENAS compensações CLARAMENTE VISÍVEIS e CONSISTENTES
- Variações anatômicas leves são NORMAIS - não reporte
- Foque em padrões que indicam DISFUNÇÃO FUNCIONAL real

VOCABULÁRIO PARA TECHNICAL_NOTE (use estas descrições, NÃO cite ângulos):
- Severidade: "leve/discreta", "moderada", "acentuada/marcante"
- Lateralidade: "unilateral esquerdo/direito", "bilateral assimétrico", "bilateral simétrico"
- Consistência: "consistente ao longo do movimento", "intermitente", "apenas no fundo do agachamento"
- Exemplos: "valgo moderado bilateral com maior acentuação à direita", "arco plantar colapsa de forma acentuada bilateralmente"

CLASSIFICAÇÃO:
- minimal: movimento de qualidade, 0-1 compensação leve
- moderate: 2-3 compensações ou 1 significativa
- marked: padrão disfuncional claro, múltiplas compensações

Use a função report_analysis para reportar resultados estruturados.`,

  lateral: `Você é um fisioterapeuta especialista em biomecânica do movimento com 15 anos de experiência clínica.
Analise esta imagem de OVERHEAD SQUAT - VISTA LATERAL (perfil).

OBJETIVO: Identificar compensações no plano sagital que indiquem limitações de mobilidade ou déficits de estabilidade.

COMPENSAÇÕES DETECTÁVEIS NESTA VISTA (use APENAS estes IDs):

${getCompensationContext(['trunk_forward_lean', 'lumbar_hyperextension', 'spine_flexion', 'heels_rise', 'arms_fall_forward'])}

ANÁLISE BIOMECÂNICA:
1. Observe a COLUNA VERTEBRAL: cifose torácica, lordose lombar, flexão/extensão
2. Analise a INCLINAÇÃO DO TRONCO: ângulo em relação à vertical
3. Avalie a POSIÇÃO DOS BRAÇOS: manutenção overhead ou queda
4. Verifique o TORNOZELO: calcanhares no solo, dorsiflexão
5. Observe a PELVE: anteversão, retroversão, butt wink

MOMENTOS CRÍTICOS DE AVALIAÇÃO:
- Posição INICIAL (topo)
- TRANSIÇÃO descida
- FUNDO do agachamento (profundidade máxima)
- TRANSIÇÃO subida

CRITÉRIOS DE REPORTE:
- Reporte compensações que são CONSISTENTES durante o movimento
- Butt wink só é relevante se for PRONUNCIADO (não sutil)
- Inclinação de tronco só é relevante se EXCESSIVA (tronco muito à frente dos quadris)

VOCABULÁRIO PARA TECHNICAL_NOTE (use estas descrições, NÃO cite ângulos):
- Severidade: "leve/discreta", "moderada", "acentuada/marcante"
- Timing: "desde o início", "na transição descida-fundo", "apenas no fundo máximo"
- Exemplos: "butt wink moderado no fundo do agachamento", "inclinação de tronco acentuada desde o início da descida"

Use a função report_analysis para reportar resultados estruturados.`,

  posterior: `Você é um fisioterapeuta especialista em biomecânica do movimento com 15 anos de experiência clínica.
Analise esta imagem de OVERHEAD SQUAT - VISTA POSTERIOR (de trás).

OBJETIVO: Identificar assimetrias, rotações e compensações no plano frontal/transversal.

═══════════════════════════════════════════════════════════════
REFERÊNCIA DE LATERALIDADE - REGRA FUNDAMENTAL (LEIA PRIMEIRO):
═══════════════════════════════════════════════════════════════
Na vista POSTERIOR, você observa as COSTAS do paciente. A lateralidade deve ser SEMPRE do ponto de vista ANATÔMICO do paciente, NÃO da perspectiva da imagem.

REGRA DE CONVERSÃO:
- O que aparece à ESQUERDA da imagem = lado DIREITO anatômico do paciente
- O que aparece à DIREITA da imagem = lado ESQUERDO anatômico do paciente

EXEMPLOS PRÁTICOS:
- Se a pelve desvia para a ESQUERDA DA IMAGEM → reporte "shift pélvico para DIREITA" (lado direito do paciente)
- Se o ombro ESQUERDO DA IMAGEM está mais elevado → reporte "ombro DIREITO mais elevado"
- Se há mais peso na perna ESQUERDA DA IMAGEM → reporte "sobrecarga no membro inferior DIREITO"
═══════════════════════════════════════════════════════════════

COMPENSAÇÕES DETECTÁVEIS NESTA VISTA (use APENAS estes IDs):

${getCompensationContext(['asymmetric_shift', 'trunk_rotation', 'feet_eversion'])}

ANÁLISE BIOMECÂNICA:
1. Observe a SIMETRIA PÉLVICA: shift lateral, inclinação
2. Analise a ROTAÇÃO: ombros vs pelve, assimetrias
3. Avalie a DISTRIBUIÇÃO DE PESO: bias para um lado
4. Verifique o ALINHAMENTO ESCAPULAR: simetria, elevação
5. Observe os PÉS por trás: eversão, posição calcanhares

INDICADORES DE ASSIMETRIA:
- Crista ilíaca mais alta de um lado
- Ombro mais elevado ou protraído
- Peso claramente mais em um membro
- Rotação visível do tronco

CRITÉRIOS DE REPORTE:
- Shift pélvico só é significativo se CLARAMENTE VISÍVEL (desvio evidente)
- Rotação de tronco deve ser EVIDENTE, não sutil
- SEMPRE use lateralidade ANATÔMICA do paciente no side_bias e technical_note

VOCABULÁRIO PARA TECHNICAL_NOTE (use estas descrições, NÃO cite ângulos/medidas):
- Assimetria: "leve assimetria", "assimetria moderada", "assimetria marcante"
- Lateralidade ANATÔMICA: "desvio para direita (lado direito do paciente)", "ombro esquerdo mais elevado"
- Exemplos: "shift pélvico moderado para direita com sobrecarga no membro inferior direito", "rotação de tronco com ombro esquerdo mais protraído"

Use a função report_analysis para reportar resultados estruturados.`,
};

const SLS_PROMPTS: Record<string, string> = {
  anterior: `Você é um fisioterapeuta especialista em biomecânica com 15 anos de experiência clínica.
Analise esta imagem de SINGLE-LEG SQUAT - VISTA ANTERIOR (frontal).

OBJETIVO: Avaliar controle neuromuscular unipodal, estabilidade e padrões de valgo.

COMPENSAÇÕES DETECTÁVEIS NESTA VISTA (use APENAS estes IDs):

${getCompensationContext(['knee_valgus', 'foot_collapse', 'instability', 'tremor', 'balance_loss'])}

ANÁLISE BIOMECÂNICA:
1. Observe o JOELHO: valgo dinâmico durante descida
2. Analise o PÉ: colapso do arco, pronação excessiva
3. Avalie a ESTABILIDADE: oscilações, tremor, perda de equilíbrio
4. Note o CONTROLE MOTOR: qualidade e suavidade do movimento

IMPORTANTE - CONTEXTO UNIPODAL:
- Pequenas oscilações são NORMAIS em apoio unipodal
- Tremor só é significativo se PERSISTENTE e VISÍVEL
- Avalie a CAPACIDADE de manter controle, não perfeição

DIFERENCIAÇÃO:
- instability: oscilações grandes e repetidas
- tremor: vibração muscular visível persistente
- balance_loss: perde o apoio ou toca o chão

VOCABULÁRIO PARA TECHNICAL_NOTE (use estas descrições, NÃO cite ângulos):
- Controle: "controle adequado", "controle comprometido", "controle severamente limitado"
- Qualidade: "movimento fluido", "movimento com oscilações", "movimento instável"
- Exemplos: "valgo dinâmico moderado com colapso leve do arco plantar", "instabilidade acentuada com tremor persistente"

Use a função report_analysis para reportar resultados estruturados.`,

  posterior: `Você é um fisioterapeuta especialista em biomecânica com 15 anos de experiência clínica.
Analise esta imagem de SINGLE-LEG SQUAT - VISTA POSTERIOR (de trás).

OBJETIVO: Avaliar controle do quadril, estabilidade pélvica e padrões compensatórios.

═══════════════════════════════════════════════════════════════
REFERÊNCIA DE LATERALIDADE - REGRA FUNDAMENTAL (LEIA PRIMEIRO):
═══════════════════════════════════════════════════════════════
Na vista POSTERIOR, você observa as COSTAS do paciente. A lateralidade deve ser SEMPRE do ponto de vista ANATÔMICO do paciente, NÃO da perspectiva da imagem.

REGRA DE CONVERSÃO:
- O que aparece à ESQUERDA da imagem = lado DIREITO anatômico do paciente
- O que aparece à DIREITA da imagem = lado ESQUERDO anatômico do paciente

EXEMPLOS PRÁTICOS:
- Se a perna de APOIO está à ESQUERDA da imagem → paciente está apoiando na perna DIREITA
- Se a pelve CAI para a ESQUERDA da imagem → reporte "hip_drop no lado DIREITO" (pelve direita caiu)
- Se o tronco ROTA para a ESQUERDA da imagem → reporte rotação para o lado DIREITO do paciente
═══════════════════════════════════════════════════════════════

COMPENSAÇÕES DETECTÁVEIS NESTA VISTA (use APENAS estes IDs):

${getCompensationContext(['hip_drop', 'hip_hike', 'trunk_rotation_medial', 'trunk_rotation_lateral', 'trunk_forward_lean_sls', 'knee_flexion_insufficient'])}

ANÁLISE BIOMECÂNICA:
1. Observe a PELVE: queda (Trendelenburg) ou elevação contralateral
2. Analise a ROTAÇÃO DO TRONCO: medial vs lateral
3. Avalie a INCLINAÇÃO: flexão anterior excessiva
4. Verifique a AMPLITUDE: flexão de joelho suficiente

TESTE DE TRENDELENBURG:
- POSITIVO: pelve contralateral CAI >5° (hip_drop)
- NEGATIVO: pelve mantém nível ou eleva levemente
- Queda indica fraqueza de glúteo médio do lado de APOIO

CRITÉRIOS DE REPORTE:
- hip_drop é clinicamente RELEVANTE - indica déficit glúteo médio
- Rotação de tronco deve ser CLARAMENTE VISÍVEL para ser significativa
- SEMPRE use lateralidade ANATÔMICA do paciente no side_bias e technical_note

VOCABULÁRIO PARA TECHNICAL_NOTE (use estas descrições, NÃO cite ângulos):
- Trendelenburg: "queda pélvica leve no lado [direito/esquerdo]", "Trendelenburg moderado"
- Rotação: "rotação discreta para medial/lateral"
- Lateralidade ANATÔMICA: "apoio unipodal direito", "pelve esquerda elevada"
- Exemplos: "Trendelenburg positivo moderado no apoio direito", "rotação medial do tronco durante apoio esquerdo"

Use a função report_analysis para reportar resultados estruturados.`,
};

const PUSHUP_PROMPTS: Record<string, string> = {
  posterior: `Você é um fisioterapeuta especialista em biomecânica com 15 anos de experiência clínica.
Analise esta imagem de PUSH-UP - VISTA POSTERIOR (de trás).

OBJETIVO: Avaliar controle escapular, estabilidade de core e padrões compensatórios.

═══════════════════════════════════════════════════════════════
REFERÊNCIA DE LATERALIDADE - REGRA FUNDAMENTAL (LEIA PRIMEIRO):
═══════════════════════════════════════════════════════════════
Na vista POSTERIOR, você observa as COSTAS do paciente. A lateralidade deve ser SEMPRE do ponto de vista ANATÔMICO do paciente, NÃO da perspectiva da imagem.

REGRA DE CONVERSÃO:
- O que aparece à ESQUERDA da imagem = lado DIREITO anatômico do paciente
- O que aparece à DIREITA da imagem = lado ESQUERDO anatômico do paciente

EXEMPLOS PRÁTICOS:
- Se a escápula ESQUERDA da imagem apresenta winging → reporte "winging na escápula DIREITA"
- Se o ombro ESQUERDO da imagem está mais protraído → reporte "protração do ombro DIREITO"
- Para assimetrias unilaterais, especifique qual lado ANATÔMICO está afetado
═══════════════════════════════════════════════════════════════

COMPENSAÇÕES DETECTÁVEIS NESTA VISTA (use APENAS estes IDs):

${getCompensationContext(['scapular_winging', 'elbow_flare', 'shoulder_protraction', 'shoulder_retraction_insufficient', 'hip_elevation', 'hip_drop_pushup'])}

ANÁLISE BIOMECÂNICA:
1. Observe as ESCÁPULAS: winging, posição, simetria
2. Analise os COTOVELOS: ângulo em relação ao tronco
3. Avalie os OMBROS: protração, retração durante fases
4. Verifique o QUADRIL: alinhamento, pike ou drop

FASES DO PUSH-UP:
- EXCÊNTRICA (descida): escápulas devem retrair, cotovelos ~45°
- CONCÊNTRICA (subida): escápulas devem protrair, sem winging

SCAPULAR WINGING:
- Borda medial da escápula projeta-se >2cm do tórax
- Indica déficit de SERRÁTIL ANTERIOR
- Clinicamente RELEVANTE para função do ombro

CRITÉRIOS DE REPORTE:
- Cotovelos devem formar "seta" com o tronco, não "T" (flare excessivo)
- Escápula alada é compensação importante
- SEMPRE use lateralidade ANATÔMICA para assimetrias unilaterais

VOCABULÁRIO PARA TECHNICAL_NOTE (use estas descrições, NÃO cite ângulos):
- Escápula: "winging discreto bilateral", "winging moderado na escápula direita/esquerda"
- Cotovelos: "posição adequada", "flare moderado", "flare excessivo formando T"
- Core: "alinhamento mantido", "leve perda de alinhamento", "pike/drop evidente"
- Lateralidade ANATÔMICA: "escápula direita", "ombro esquerdo", "bilateral"
- Exemplos: "winging moderado na escápula direita com flare de cotovelos", "protração acentuada do ombro esquerdo"

Use a função report_analysis para reportar resultados estruturados.`,
};

// Build dynamic prompt for segmental tests
interface SegmentalTestParams {
  testName: string;
  cutoffValue?: number;
  unit?: string;
  resultType?: 'quantitative' | 'qualitative';
  isBilateral?: boolean;
  instructions?: string;
}

function buildSegmentalPrompt(params: SegmentalTestParams): string {
  const { testName, cutoffValue, unit, resultType, isBilateral, instructions } = params;

  if (resultType === 'quantitative') {
    return `Você é um fisioterapeuta especialista. Analise esta imagem/vídeo do teste "${testName}".

${instructions ? `Instruções: ${instructions}\n` : ''}
${isBilateral ? 'Teste BILATERAL - avalie ambos os lados.' : 'Avalie o lado visível.'}

Valor de corte: ${cutoffValue} ${unit || ''}

Responda em JSON:
{
  ${isBilateral ? `"left_value": número,
  "right_value": número,
  "left_result": "pass" | "partial" | "fail",
  "right_result": "pass" | "partial" | "fail",` : `"value": número,
  "result": "pass" | "partial" | "fail",`}
  "confidence": 0.85,
  "notes": "Observações clínicas"
}`;
  }

  return `Você é um fisioterapeuta especialista. Analise esta imagem/vídeo do teste "${testName}".

${instructions ? `Instruções: ${instructions}\n` : ''}
${isBilateral ? 'Teste BILATERAL - avalie ambos os lados.' : 'Avalie o lado visível.'}

Responda em JSON:
{
  ${isBilateral ? `"left_result": "pass" | "partial" | "fail",
  "right_result": "pass" | "partial" | "fail",` : `"result": "pass" | "partial" | "fail",`}
  "confidence": 0.85,
  "notes": "Observações clínicas"
}`;
}

// Build prompt for quick protocol tests
interface QuickProtocolTestParams {
  testId: string;
  testName: string;
  layer: string;
  options: string[];
  isBilateral: boolean;
  instructions?: string;
}

function buildQuickProtocolPrompt(params: QuickProtocolTestParams): string {
  const { testName, layer, options, isBilateral, instructions } = params;
  
  const layerDescription = {
    mobility: 'Avalie a AMPLITUDE DE MOVIMENTO - o indivíduo consegue atingir a posição alvo?',
    stability: 'Avalie a ESTABILIDADE DINÂMICA - consegue manter controle durante o movimento?',
    motor_control: 'Avalie o CONTROLE NEUROMOTOR - qualidade e coordenação do padrão de movimento',
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
  ${isBilateral ? `"left_findings": ["achados_esquerda"],
  "right_findings": ["achados_direita"],` : ''}
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
      } else if (testType === 'single_leg_squat') {
        prompt = SLS_PROMPTS[view] || SLS_PROMPTS.anterior;
      } else if (testType === 'pushup') {
        prompt = PUSHUP_PROMPTS[view] || PUSHUP_PROMPTS.posterior;
      } else {
        return jsonResponse({ error: 'Unknown test type' }, 400);
      }
      
      console.log(`Global test: ${testType} - ${view} view`);
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
