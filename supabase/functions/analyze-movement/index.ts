import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Test-specific prompts for movement analysis with clinical severity thresholds
const TEST_PROMPTS: Record<string, string> = {
  // Global Tests
  overhead_squat: `Você é um especialista em análise biomecânica. Analise esta imagem de Overhead Squat.

IMPORTANTE: Só reporte compensações CLINICAMENTE SIGNIFICATIVAS. Variações leves dentro da normalidade NÃO devem ser reportadas.

CRITÉRIOS DE SEVERIDADE (só reporte se ultrapassar esses limiares):

VISTA ANTERIOR:
- feet_abduction: Pés giram >30° para fora (15-30° é normal)
- feet_eversion: Arco plantar CLARAMENTE colapsado, calcanhar inclinado >10°
- knee_valgus: Joelhos CLARAMENTE passam da linha do hálux durante descida
- knee_varus: Joelhos se afastam >15° da vertical

VISTA LATERAL:
- trunk_forward_lean: Tronco inclina >45° com a vertical (até 30° é aceitável)
- lumbar_hyperextension: Lordose EXAGERADA, hiperlordose visível
- spine_flexion: Arredondamento EVIDENTE da lombar no fundo (butt wink pronunciado)
- heels_rise: Calcanhares sobem CLARAMENTE do chão
- arms_fall_forward: Braços caem abaixo da linha da cabeça

VISTA POSTERIOR:
- asymmetric_shift: Pelve desvia >2cm para um lado (shift EVIDENTE)
- trunk_rotation: Ombros ou pelve rotam >10° (assimetria CLARA)
- feet_eversion_posterior: Calcanhares inclinam VISIVELMENTE para fora

REGRAS:
1. NA DÚVIDA, NÃO REPORTE - melhor subnotificar que supernotificar
2. Compensações SUTIS não são clinicamente relevantes
3. Avalie se a compensação é CONSISTENTE (padrão) ou MOMENTÂNEA (não reportar)
4. Considere que variação biomecânica individual é NORMAL

Responda em JSON:
{
  "detected_compensations": ["apenas_ids_significativos"],
  "confidence": 0.85,
  "notes": "Breve descrição das compensações significativas encontradas (ou 'Movimento dentro dos padrões normais' se nenhuma)"
}`,

  single_leg_squat: `Você é um especialista em análise biomecânica. Analise esta imagem de Single-Leg Squat.

IMPORTANTE: Só reporte compensações CLINICAMENTE SIGNIFICATIVAS.

CRITÉRIOS DE SEVERIDADE:

VISTA ANTERIOR:
- knee_valgus: Joelho CLARAMENTE colapsa medialmente, passando linha do hálux
- foot_collapse: Arco plantar desaba COMPLETAMENTE
- instability: Oscilações GRANDES e repetidas (não micromovimentos normais)
- tremor: Tremor VISÍVEL e persistente
- balance_loss: TOCA o chão ou perde apoio completamente

VISTA POSTERIOR:
- hip_drop: Pelve cai >5° do lado contralateral (Trendelenburg POSITIVO)
- hip_hike: Elevação EXAGERADA da pelve contralateral
- trunk_rotation_medial/lateral: Rotação >15° do tronco
- trunk_forward_lean_sls: Inclinação >30° para frente
- knee_flexion_insufficient: Joelho flexiona <30° (amplitude MUITO limitada)

REGRAS:
1. Pequenas oscilações são NORMAIS em teste unipodal
2. Só reporte hip_drop se for EVIDENTE (teste Trendelenburg positivo)
3. NA DÚVIDA, NÃO REPORTE

Responda em JSON:
{
  "detected_compensations": ["apenas_ids_significativos"],
  "side": "left" ou "right",
  "confidence": 0.85,
  "notes": "Descrição breve ou 'Controle adequado para teste unipodal'"
}`,

  pushup: `Você é um especialista em análise biomecânica. Analise esta imagem de Push-up.

IMPORTANTE: Só reporte compensações CLINICAMENTE SIGNIFICATIVAS.

CRITÉRIOS DE SEVERIDADE:

- scapular_winging: Borda medial da escápula CLARAMENTE se projeta >2cm do tórax
- elbow_flare: Cotovelos abrem >60° do tronco (até 45° é aceitável)
- shoulder_protraction: Protração EXAGERADA, ombros muito arredondados
- shoulder_retraction_insufficient: Escápulas NÃO se aproximam na descida
- hip_elevation: Quadril sobe formando "pirâmide" (pike EVIDENTE)
- hip_drop: Quadril afunda criando lordose EXAGERADA

REGRAS:
1. Variações leves na técnica são NORMAIS
2. Foque em compensações que indicam DÉFICIT FUNCIONAL
3. NA DÚVIDA, NÃO REPORTE

Responda em JSON:
{
  "detected_compensations": ["apenas_ids_significativos"],
  "confidence": 0.85,
  "notes": "Descrição breve ou 'Execução dentro dos padrões adequados'"
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
    const { 
      testType, 
      testName, 
      imageUrl, 
      videoUrl, 
      viewType,
      isSlowMotion,
      // New segmental test parameters
      cutoffValue,
      unit,
      resultType,
      isBilateral,
      instructions
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
    
    if (testType === 'segmental') {
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
      
      // Add slow motion context for enhanced analysis
      if (isSlowMotion) {
        prompt = `${prompt}\n\nIMPORTANTE: Este vídeo/imagem foi capturado em SLOW MOTION (120fps ou superior).
Isso permite análise mais detalhada de:
- Micro-movimentos e tremores sutis
- Momento exato de transição (descida ↔ subida)
- Padrões de compensação que ocorrem em frações de segundo
- Sequência temporal das compensações (qual acontece primeiro)

Aproveite a qualidade superior para identificar compensações que seriam invisíveis em velocidade normal.
Observe especialmente os momentos de TRANSIÇÃO onde compensações são mais evidentes.`;
      }
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
        // Include prompt for debugging/transparency
        promptUsed: prompt,
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
