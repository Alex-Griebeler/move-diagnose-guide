import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  'https://5253ca48-5fa8-4259-a6a1-d572744c9bc8.lovableproject.com',
  'https://fabrik.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
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

// Test-specific prompts for movement analysis with clinical severity thresholds
const TEST_PROMPTS: Record<string, string> = {
  // Global Tests
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
- feet_eversion_posterior: Calcanhares inclinam para fora

REGRAS DE ANÁLISE:
1. Reporte compensações que são VISÍVEIS e CONSISTENTES no padrão de movimento
2. Considere que pequenas variações biomecânicas são NORMAIS
3. Foque em compensações que indicam DISFUNÇÃO FUNCIONAL real
4. Se a imagem não permite avaliação clara de uma compensação, não a reporte

${getCompensationContext(['knee_valgus', 'heels_rise', 'spine_flexion', 'hip_drop', 'arms_fall_forward'])}

Responda em JSON:
{
  "detected_compensations": ["ids_das_compensacoes_detectadas"],
  "confidence": 0.85,
  "notes": "Descrição objetiva das compensações encontradas ou 'Movimento dentro dos padrões normais'"
}`,

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

${getCompensationContext(['knee_valgus', 'hip_drop', 'foot_collapse'])}

Responda em JSON:
{
  "detected_compensations": ["ids_das_compensacoes_detectadas"],
  "side": "left" ou "right",
  "confidence": 0.85,
  "notes": "Descrição objetiva ou 'Controle adequado para teste unipodal'"
}`,

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

${getCompensationContext(['scapular_winging', 'arms_fall_forward'])}

Responda em JSON:
{
  "detected_compensations": ["ids_das_compensacoes_detectadas"],
  "confidence": 0.85,
  "notes": "Descrição objetiva ou 'Execução dentro dos padrões adequados'"
}`
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

// Build prompt for quick protocol tests
interface QuickProtocolTestParams {
  testName: string;
  testId: string;
  options: Array<{ id: string; label: string; isPositive: boolean }>;
  instructions: string;
  layer: 'mobility' | 'stability' | 'motor_control';
  isBilateral: boolean;
}

function buildQuickProtocolPrompt(params: QuickProtocolTestParams): string {
  const { testName, testId, options, instructions, layer, isBilateral } = params;
  
  const layerContext = {
    mobility: 'Este é um teste de MOBILIDADE. Avalie amplitude de movimento, restrições e assimetrias.',
    stability: 'Este é um teste de ESTABILIDADE. Avalie controle dinâmico, ativação muscular e manutenção de posição.',
    motor_control: 'Este é um teste de CONTROLE NEUROMOTOR. Avalie qualidade do movimento, coordenação e padrões de compensação.',
  };

  const optionsDescription = options
    .map(o => `- "${o.id}": ${o.label} ${o.isPositive ? '(ACHADO POSITIVO - indica disfunção)' : '(normal/esperado)'}`)
    .join('\n');

  return `Você é um especialista em análise biomecânica. Analise esta imagem/vídeo do teste "${testName}".

${layerContext[layer]}

INSTRUÇÕES DO TESTE:
${instructions}

${isBilateral ? 'Este é um teste BILATERAL. Compare ambos os lados e reporte assimetrias significativas.' : ''}

OPÇÕES POSSÍVEIS A DETECTAR:
${optionsDescription}

CRITÉRIOS DE ANÁLISE:
1. Reporte APENAS achados CLARAMENTE visíveis e CONSISTENTES
2. Foque em disfunções funcionais reais, não variações normais
3. Para achados positivos, deve haver evidência CLARA na imagem/vídeo
4. Se a qualidade não permite avaliação precisa, reporte com confiança menor

Responda APENAS em JSON válido:
{
  "detected_options": ["ids_das_opcoes_detectadas"],
  "pain_indicators": false,
  "left_findings": ${isBilateral ? '["achados_lado_esquerdo"]' : 'null'},
  "right_findings": ${isBilateral ? '["achados_lado_direito"]' : 'null'},
  "confidence": 0.85,
  "notes": "Descrição objetiva das observações"
}`;
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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const auth = await validateAuth(req);
    if (!auth) {
      console.error('Unauthorized request to analyze-movement');
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in to use this feature.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      layer
    } = await req.json();

    if (!testType || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'testType and imageUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select appropriate prompt
    let prompt: string;
    
    if (testType === 'quick_protocol') {
      // Use dynamic prompt builder for quick protocol tests
      if (!testId || !options || !layer) {
        return new Response(
          JSON.stringify({ error: 'testId, options, and layer are required for quick_protocol tests' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      prompt = buildQuickProtocolPrompt({
        testName: testName || 'Teste Rápido',
        testId,
        options,
        instructions: instructions || '',
        layer,
        isBilateral: isBilateral || false
      });
      console.log(`Built dynamic prompt for quick protocol test: ${testName} (${testId}), layer: ${layer}, bilateral: ${isBilateral}`);
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
      console.log(`Built dynamic prompt for segmental test: ${testName}, resultType: ${resultType}, bilateral: ${isBilateral}, cutoff: ${cutoffValue} ${unit}`);
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
      return new Response(
        JSON.stringify({ error: 'Unknown test type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${testType} test${testName ? ` (${testName})` : ''}${viewType ? ` - ${viewType} view` : ''}`);

    // Build message content with image
    const messageContent: any[] = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl } }
    ];

    // Call Lovable AI Gateway with vision model (use Pro for better accuracy)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Pro model for better movement analysis
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        max_tokens: 2500, // Increased to avoid truncation
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('Empty AI response');
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI raw response:', aiResponse);

    // Parse JSON from AI response
    let analysisResult;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        
        // Try to fix truncated JSON by closing unclosed strings and brackets
        if (!jsonStr.endsWith('}')) {
          // Count brackets to determine what's missing
          const openBraces = (jsonStr.match(/\{/g) || []).length;
          const closeBraces = (jsonStr.match(/\}/g) || []).length;
          const openBrackets = (jsonStr.match(/\[/g) || []).length;
          const closeBrackets = (jsonStr.match(/\]/g) || []).length;
          
          // Close unclosed string if present
          if ((jsonStr.match(/"/g) || []).length % 2 !== 0) {
            jsonStr += '"';
          }
          
          // Close arrays then objects
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
          notes: 'Análise parcial - resposta truncada'
        };
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to parse AI analysis',
            raw_response: aiResponse 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Analysis result:', analysisResult);

    return new Response(
      JSON.stringify({
        success: true,
        testType,
        testName,
        viewType,
        analysis: analysisResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    console.error('Error in analyze-movement function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
