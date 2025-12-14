import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to create JSON response with CORS
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Validate user authentication from Authorization header
async function validateAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Auth validation failed:', error?.message);
    return null;
  }

  return { userId: user.id };
}

// Dados clínicos de compensações para enriquecer prompts
const COMPENSATION_DATA: Record<string, { 
  hyperactive: string[]; 
  hypoactive: string[]; 
  injuries: string[] 
}> = {
  knee_valgus: {
    hyperactive: ['Adutores', 'TFL', 'Gastrocnêmio lateral', 'Vasto lateral'],
    hypoactive: ['Glúteo médio', 'Glúteo máximo', 'VMO', 'Rotadores laterais do quadril'],
    injuries: ['Síndrome patelofemoral', 'Tendinopatia patelar', 'Lesão LCA'],
  },
  heels_rise: {
    hyperactive: ['Sóleo', 'Gastrocnêmio', 'Flexores plantares'],
    hypoactive: ['Tibial anterior', 'Dorsiflexores'],
    injuries: ['Tendinopatia do Aquiles', 'Fascite plantar'],
  },
  spine_flexion: {
    hyperactive: ['Isquiotibiais', 'Reto abdominal'],
    hypoactive: ['Eretores lombares', 'Multífidos', 'Flexores do quadril'],
    injuries: ['Hérnia discal', 'Dor lombar', 'Protrusão discal'],
  },
  hip_drop: {
    hyperactive: ['Quadrado lombar', 'TFL', 'Piriforme', 'Adutores'],
    hypoactive: ['Glúteo médio', 'Glúteo mínimo', 'Core lateral', 'Oblíquos'],
    injuries: ['Síndrome da banda IT', 'Tendinopatia glútea', 'Bursite trocantérica'],
  },
  scapular_winging: {
    hyperactive: ['Peitoral menor', 'Levantador da escápula', 'Trapézio superior'],
    hypoactive: ['Serrátil anterior', 'Trapézio inferior', 'Trapézio médio'],
    injuries: ['Discinese escapular', 'Impacto do ombro', 'Tendinopatia manguito'],
  },
  arms_fall_forward: {
    hyperactive: ['Peitoral maior', 'Latíssimo do dorso', 'Redondo maior'],
    hypoactive: ['Trapézio médio/inferior', 'Romboides', 'Serrátil anterior'],
    injuries: ['Impacto do ombro', 'Síndrome desfiladeiro torácico', 'Cifose'],
  },
  trunk_forward_lean: {
    hyperactive: ['Sóleo', 'Gastrocnêmio', 'Flexores do quadril', 'Reto abdominal'],
    hypoactive: ['Glúteo máximo', 'Eretores torácicos', 'Core estabilizador'],
    injuries: ['Dor lombar', 'Impacto femoroacetabular'],
  },
  foot_collapse: {
    hyperactive: ['Fibulares', 'Gastrocnêmio lateral'],
    hypoactive: ['Tibial posterior', 'Intrínsecos do pé', 'Tibial anterior'],
    injuries: ['Fascite plantar', 'Tendinopatia tibial posterior'],
  },
  feet_eversion: {
    hyperactive: ['Fibulares', 'Gastrocnêmio lateral'],
    hypoactive: ['Tibial posterior', 'Intrínsecos do pé'],
    injuries: ['Fascite plantar', 'Tendinopatia tibial posterior', 'Síndrome do estresse tibial medial'],
  },
  asymmetric_shift: {
    hyperactive: ['Quadrado lombar unilateral', 'Adutores unilateral'],
    hypoactive: ['Glúteo médio contralateral', 'Core lateral'],
    injuries: ['Dor lombar assimétrica', 'Disfunção sacroilíaca'],
  },
  lumbar_hyperextension: {
    hyperactive: ['Eretores lombares', 'Quadrado lombar', 'Iliopsoas'],
    hypoactive: ['Transverso abdominal', 'Glúteos', 'Reto abdominal'],
    injuries: ['Espondilolistese', 'Estenose foraminal', 'Dor lombar'],
  },
  trunk_rotation: {
    hyperactive: ['Oblíquos unilateral', 'Quadrado lombar'],
    hypoactive: ['Core rotacional', 'Oblíquos contralateral'],
    injuries: ['Dor lombar', 'Disfunção sacroilíaca'],
  },
};

// Gerar contexto clínico para o prompt
function getCompensationContext(compensationIds: string[]): string {
  const contexts: string[] = [];
  
  for (const id of compensationIds) {
    const data = COMPENSATION_DATA[id];
    if (data) {
      contexts.push(`
${id}:
  - Músculos hiperativos: ${data.hyperactive.join(', ')}
  - Músculos hipoativos: ${data.hypoactive.join(', ')}
  - Riscos de lesão: ${data.injuries.join(', ')}`);
    }
  }
  
  return contexts.length > 0 ? `\nCONTEXTO CLÍNICO DAS COMPENSAÇÕES:\n${contexts.join('\n')}` : '';
}

// Tool calling schema for standardized output
const ANALYSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "report_analysis",
    description: "Report structured movement analysis results with standardized format",
    parameters: {
      type: "object",
      properties: {
        detected_compensations: {
          type: "array",
          items: { type: "string" },
          description: "Array of compensation IDs detected in the movement"
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence level of the analysis (0-1)"
        },
        severity: {
          type: "string",
          enum: ["minimal", "moderate", "marked"],
          description: "Overall severity: minimal (1-2 minor), moderate (3+ or significant), marked (multiple severe)"
        },
        primary_compensation: {
          type: "string",
          nullable: true,
          description: "The most clinically significant compensation detected, or null if none"
        },
        side_bias: {
          type: "string",
          enum: ["left", "right", "bilateral", "symmetric"],
          description: "Which side shows more dysfunction, or symmetric if equal"
        },
        requires_attention: {
          type: "boolean",
          description: "True if any compensation requires immediate clinical attention"
        },
        technical_note: {
          type: "string",
          maxLength: 200,
          description: "Brief clinical observation (max 50 words), focusing on movement quality"
        }
      },
      required: ["detected_compensations", "confidence", "severity", "side_bias", "requires_attention"]
    }
  }
};

// Test-specific prompts for movement analysis with clinical severity thresholds
const TEST_PROMPTS: Record<string, string> = {
  overhead_squat: `Você é um especialista em análise biomecânica. Analise esta imagem de Overhead Squat.

OBJETIVO: Detectar compensações VISÍVEIS e CONSISTENTES que indiquem disfunção funcional.

CRITÉRIOS DE DETECÇÃO (reporte se presente de forma CLARA):

VISTA ANTERIOR:
- feet_abduction: Pés giram >30° para fora (15-30° pode ser variação normal)
- feet_eversion: Arco plantar COLAPSA, calcanhar inclina medialmente
- knee_valgus: Joelhos CLARAMENTE passam da linha do hálux (valgo dinâmico)
- knee_varus: Joelhos se afastam significativamente da vertical

VISTA LATERAL:
- trunk_forward_lean: Tronco inclina >45° com a vertical
- lumbar_hyperextension: Lordose EXAGERADA, hiperlordose evidente
- spine_flexion: Arredondamento EVIDENTE da lombar (butt wink pronunciado)
- heels_rise: Calcanhares CLARAMENTE sobem do chão
- arms_fall_forward: Braços caem abaixo da linha da cabeça

VISTA POSTERIOR:
- asymmetric_shift: Pelve desvia VISIVELMENTE para um lado (>2cm)
- trunk_rotation: Ombros ou pelve rotam de forma ASSIMÉTRICA
- feet_eversion: Calcanhares inclinam medialmente, arco colapsa

REGRAS DE ANÁLISE:
1. Reporte compensações que são VISÍVEIS e CONSISTENTES no padrão de movimento
2. Considere que pequenas variações biomecânicas são NORMAIS
3. Foque em compensações que indicam DISFUNÇÃO FUNCIONAL real
4. Se a imagem não permite avaliação clara de uma compensação, não a reporte

CLASSIFICAÇÃO DE SEVERIDADE:
- minimal: 1-2 compensações leves ou variações menores
- moderate: 3+ compensações ou compensações significativas
- marked: múltiplas compensações severas ou padrão disfuncional claro

${getCompensationContext(['knee_valgus', 'heels_rise', 'spine_flexion', 'hip_drop', 'arms_fall_forward', 'feet_eversion', 'asymmetric_shift', 'lumbar_hyperextension'])}

Use a função report_analysis para reportar os resultados de forma estruturada.`,

  single_leg_squat: `Você é um especialista em análise biomecânica. Analise esta imagem de Single-Leg Squat.

OBJETIVO: Detectar compensações VISÍVEIS e CONSISTENTES em apoio unipodal.

CRITÉRIOS DE DETECÇÃO:

VISTA ANTERIOR:
- knee_valgus: Joelho CLARAMENTE colapsa medialmente, passando linha do hálux
- foot_collapse: Arco plantar COLAPSA completamente
- instability: Oscilações GRANDES e REPETIDAS (não micromovimentos)
- tremor: Tremor VISÍVEL e PERSISTENTE durante execução
- balance_loss: PERDE apoio ou toca o chão

VISTA POSTERIOR:
- hip_drop: Pelve CAI >5° do lado contralateral (Trendelenburg POSITIVO)
- hip_hike: Elevação EXAGERADA da pelve contralateral
- trunk_rotation_medial/lateral: Rotação >15° do tronco
- trunk_forward_lean_sls: Inclinação >30° para frente
- knee_flexion_insufficient: Joelho flexiona <30° (amplitude MUITO limitada)

REGRAS DE ANÁLISE:
1. Pequenas oscilações são NORMAIS em teste unipodal - não reporte
2. Hip drop só deve ser reportado se for EVIDENTE (Trendelenburg positivo claro)
3. Foque em compensações que indicam DÉFICIT DE CONTROLE real
4. Considere a dificuldade inerente do teste unipodal

CLASSIFICAÇÃO DE SEVERIDADE:
- minimal: Pequenas compensações, controle geral adequado
- moderate: Compensações evidentes mas mantém execução
- marked: Déficit de controle severo, incapaz de executar adequadamente

${getCompensationContext(['knee_valgus', 'hip_drop', 'foot_collapse'])}

Use a função report_analysis para reportar os resultados de forma estruturada.`,

  pushup: `Você é um especialista em análise biomecânica. Analise esta imagem de Push-up.

OBJETIVO: Detectar compensações VISÍVEIS que indicam déficit de controle escapular ou core.

CRITÉRIOS DE DETECÇÃO:

- scapular_winging: Borda medial da escápula PROJETA-SE >2cm do tórax
- elbow_flare: Cotovelos abrem >60° do tronco (até 45° é aceitável)
- shoulder_protraction: Protração EXAGERADA, ombros muito arredondados
- shoulder_retraction_insufficient: Escápulas NÃO se aproximam na fase excêntrica
- hip_elevation: Quadril sobe formando "pirâmide" (pike EVIDENTE)
- hip_drop: Quadril afunda criando lordose EXAGERADA

REGRAS DE ANÁLISE:
1. Variações leves na técnica são NORMAIS
2. Foque em compensações que indicam DÉFICIT FUNCIONAL
3. Scapular winging é RELEVANTE - indica serrátil anterior deficiente
4. Avalie a posição durante TODO o movimento, não só posição estática

CLASSIFICAÇÃO DE SEVERIDADE:
- minimal: Técnica boa com pequenas variações
- moderate: Compensações visíveis mas funcionais
- marked: Déficit escapular ou core evidente, padrão disfuncional

${getCompensationContext(['scapular_winging', 'arms_fall_forward'])}

Use a função report_analysis para reportar os resultados de forma estruturada.`
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
    return `Você é um especialista em avaliação de movimento. Analise esta imagem/vídeo do teste "${testName}".

${instructions ? `Instruções do teste: ${instructions}\n` : ''}
${isBilateral ? 'Este é um teste BILATERAL. Avalie ambos os lados separadamente.' : 'Avalie o lado visível.'}

Valor de corte para normalidade: ${cutoffValue} ${unit || ''}

Meça ou estime o valor numérico do teste baseado na imagem.

Responda APENAS em JSON válido com este formato:
{
  ${isBilateral ? `"left_value": número_medido_esquerdo,
  "right_value": número_medido_direito,
  "left_result": "pass" | "partial" | "fail",
  "right_result": "pass" | "partial" | "fail",` : `"value": número_medido,
  "result": "pass" | "partial" | "fail",`}
  "confidence": 0.85,
  "notes": "Observações sobre a qualidade do movimento ou limitações observadas"
}`;
  }

  // Qualitative test
  return `Você é um especialista em avaliação de movimento. Analise esta imagem/vídeo do teste "${testName}".

${instructions ? `Instruções do teste: ${instructions}\n` : ''}
${isBilateral ? 'Este é um teste BILATERAL. Avalie ambos os lados separadamente.' : 'Avalie o lado visível.'}

Avalie a qualidade da execução do teste.

Responda APENAS em JSON válido com este formato:
{
  ${isBilateral ? `"left_result": "pass" | "partial" | "fail",
  "right_result": "pass" | "partial" | "fail",` : `"result": "pass" | "partial" | "fail",`}
  "confidence": 0.85,
  "notes": "Descrição das compensações observadas ou qualidade do movimento"
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
    stability: 'Avalie a ESTABILIDADE DINÂMICA - o indivíduo consegue manter controle durante o movimento?',
    motor_control: 'Avalie o CONTROLE NEUROMOTOR - a qualidade e coordenação do padrão de movimento',
  }[layer] || 'Avalie a qualidade do movimento';
  
  return `Você é um especialista em avaliação de movimento para protocolos rápidos de dor.

TESTE: "${testName}"
CAMADA AVALIADA: ${layer.toUpperCase()}
${layerDescription}

${instructions ? `INSTRUÇÕES DO TESTE: ${instructions}\n` : ''}
${isBilateral ? 'Este é um teste BILATERAL. Avalie ambos os lados separadamente.' : ''}

OPÇÕES A DETECTAR:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

INSTRUÇÕES:
1. Identifique APENAS as opções que são CLARAMENTE visíveis
2. Indique se há sinais de DOR durante a execução (expressão facial, hesitação)
3. Se bilateral, especifique achados por lado

Responda em JSON:
{
  "detected_options": ["opções_detectadas"],
  "pain_indicators": true/false,
  ${isBilateral ? `"left_findings": ["achados_esquerda"],
  "right_findings": ["achados_direita"],` : ''}
  "confidence": 0.85,
  "notes": "Observações clínicas relevantes"
}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const auth = await validateAuth(req);
    if (!auth) {
      console.error('Unauthorized request to analyze-movement');
      return jsonResponse({ error: 'Unauthorized. Please log in to use this feature.' }, 401);
    }

    console.log(`Authenticated request from user: ${auth.userId}`);

    const { 
      testType, 
      testName, 
      imageUrl, 
      videoUrl, 
      viewType,
      // Segmental test parameters
      cutoffValue,
      unit,
      resultType,
      isBilateral,
      instructions,
      // Quick protocol parameters
      testId,
      options,
      layer,
    } = await req.json();

    if (!testType || !imageUrl) {
      return jsonResponse({ error: 'testType and imageUrl are required' }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }

    // Select appropriate prompt
    let prompt: string;
    
    if (testType === 'quick_protocol') {
      // Dynamic prompt for quick protocol tests
      prompt = buildQuickProtocolPrompt({
        testId: testId || 'unknown',
        testName: testName || 'Teste Rápido',
        layer: layer || 'mobility',
        options: options || [],
        isBilateral: isBilateral !== false,
        instructions,
      });
      console.log(`Built quick protocol prompt for: ${testName}, layer: ${layer}`);
    } else if (testType === 'segmental') {
      // Use dynamic prompt builder for segmental tests
      prompt = buildSegmentalPrompt({
        testName: testName || 'Teste Segmentado',
        cutoffValue,
        unit,
        resultType,
        isBilateral,
        instructions
      });
      console.log(`Built segmental prompt for: ${testName}, resultType: ${resultType}, bilateral: ${isBilateral}, cutoff: ${cutoffValue} ${unit}`);
    } else {
      // Use predefined prompts for global tests
      prompt = TEST_PROMPTS[testType];
      
      // Add context about view type if provided
      if (viewType) {
        prompt = `${prompt}\n\nEsta imagem é da VISTA ${viewType.toUpperCase()}.`;
      }
      
      // Always add slow motion analysis context for enhanced detection
      prompt = `${prompt}\n\nIMPORTANTE: Analise como se fosse um vídeo em SLOW MOTION (120fps ou superior).
Isso permite análise mais detalhada de:
- Micro-movimentos e tremores sutis
- Momento exato de transição (descida ↔ subida)
- Padrões de compensação que ocorrem em frações de segundo
- Sequência temporal das compensações (qual acontece primeiro)

Aproveite para identificar compensações que seriam invisíveis em velocidade normal.
Observe especialmente os momentos de TRANSIÇÃO onde compensações são mais evidentes.`;
    }

    if (!prompt) {
      return jsonResponse({ error: 'Unknown test type' }, 400);
    }

    console.log(`Analyzing ${testType} test${testName ? ` (${testName})` : ''}${viewType ? ` - ${viewType} view` : ''}`);

    // Build message content with image
    const messageContent: unknown[] = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl } }
    ];

    // Determine if we should use tool calling (for global tests only)
    const useToolCalling = ['overhead_squat', 'single_leg_squat', 'pushup'].includes(testType);

    // Call Lovable AI Gateway with vision model (use Pro for better accuracy)
    const requestBody: Record<string, unknown> = {
      model: 'google/gemini-2.5-pro',
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      max_tokens: 2500,
    };

    // Add tool calling for global tests
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
      
      if (response.status === 429) {
        return jsonResponse({ error: 'Rate limit exceeded. Please try again in a moment.' }, 429);
      }
      
      if (response.status === 402) {
        return jsonResponse({ error: 'AI credits exhausted. Please add credits to continue.' }, 402);
      }
      
      return jsonResponse({ error: 'AI analysis failed' }, 500);
    }

    const data = await response.json();
    
    // Check if response uses tool calling
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const aiResponse = data.choices?.[0]?.message?.content;

    let analysisResult;

    if (toolCall && toolCall.function?.arguments) {
      // Parse from tool calling response (standardized format)
      try {
        analysisResult = JSON.parse(toolCall.function.arguments);
        console.log('Tool calling response parsed:', analysisResult);
        
        // Map technical_note to notes for frontend compatibility
        if (analysisResult.technical_note && !analysisResult.notes) {
          analysisResult.notes = analysisResult.technical_note;
        }
      } catch (parseError) {
        console.error('Failed to parse tool call arguments:', parseError);
        return jsonResponse({ 
          error: 'Failed to parse AI tool response',
          raw_response: toolCall.function.arguments 
        }, 500);
      }
    } else if (aiResponse) {
      // Fallback: Parse JSON from content (for segmental/quick protocol tests)
      console.log('AI raw response:', aiResponse);
      
      try {
        // Extract JSON from response (handle potential markdown code blocks)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          
          // Try to fix truncated JSON by closing unclosed strings and brackets
          if (!jsonStr.endsWith('}')) {
            const openBraces = (jsonStr.match(/\{/g) || []).length;
            const closeBraces = (jsonStr.match(/\}/g) || []).length;
            const openBrackets = (jsonStr.match(/\[/g) || []).length;
            const closeBrackets = (jsonStr.match(/\]/g) || []).length;
            
            if ((jsonStr.match(/"/g) || []).length % 2 !== 0) {
              jsonStr += '"';
            }
            
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              jsonStr += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
              jsonStr += '}';
            }
            
            console.log('Fixed truncated JSON:', jsonStr);
          }
          
          analysisResult = JSON.parse(jsonStr);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        
        // Try to extract at least the compensations from partial response
        const compensationsMatch = aiResponse.match(/"detected_compensations"\s*:\s*\[(.*?)\]/s);
        if (compensationsMatch) {
          const compensationIds = compensationsMatch[1]
            .match(/"([^"]+)"/g)
            ?.map((s: string) => s.replace(/"/g, '')) || [];
          
          console.log('Extracted compensations from partial response:', compensationIds);
          
          analysisResult = {
            detected_compensations: compensationIds,
            confidence: 0.7,
            severity: 'moderate',
            side_bias: 'bilateral',
            requires_attention: false,
            notes: 'Análise parcial - resposta truncada'
          };
        } else {
          return jsonResponse({ 
            error: 'Failed to parse AI analysis',
            raw_response: aiResponse 
          }, 500);
        }
      }
    } else {
      console.error('Empty AI response - no tool call or content');
      return jsonResponse({ error: 'Empty AI response' }, 500);
    }

    console.log('Analysis result:', analysisResult);

    return jsonResponse({
      success: true,
      testType,
      testName,
      viewType,
      analysis: analysisResult,
      promptUsed: prompt.substring(0, 200) + '...' // Include prompt snippet for debugging
    });

  } catch (error) {
    console.error('Error in analyze-movement function:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});
