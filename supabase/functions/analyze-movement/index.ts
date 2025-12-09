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

// Test-specific prompts for movement analysis
const TEST_PROMPTS: Record<string, string> = {
  // Global Tests
  overhead_squat: `Você é um especialista em análise biomecânica com formação em fisioterapia e movimento funcional. Analise CUIDADOSAMENTE esta imagem/vídeo de um Overhead Squat (agachamento com braços elevados).

IMPORTANTE: Seja METICULOSO na análise. Observe cada detalhe do movimento antes de responder.

Identifique TODAS as compensações presentes. Compensações possíveis por vista:

VISTA ANTERIOR (de frente):
- feet_abduction: Pés abduzidos (giram para fora excessivamente, >30°)
- feet_eversion: Eversão dos pés (pronação, arco plantar colapsando)
- knee_valgus: Joelhos valgos (cavam para dentro, especialmente na descida)
- knee_varus: Joelhos varos (arqueados para fora excessivamente)

VISTA LATERAL (de lado):
- trunk_forward_lean: Inclinação excessiva do tronco para frente (>45° com a vertical)
- lumbar_hyperextension: Hiperextensão lombar (arco excessivo na região lombar)
- spine_flexion: Flexão da coluna/butt wink (arredondamento da lombar no fundo do agachamento)
- heels_rise: Calcanhares sobem do chão durante a descida
- arms_fall_forward: Braços caem para frente (não mantém alinhados com o tronco)

VISTA POSTERIOR (de trás):
- asymmetric_shift: Shift pélvico (quadril desvia para um lado durante o movimento)
- trunk_rotation: Rotação do tronco (ombros ou pelve rotam durante o movimento)
- feet_eversion_posterior: Eversão dos pés visível por trás (calcanhares inclinam para fora)
- heels_rise_posterior: Elevação de calcanhar visível por trás

DICAS DE ANÁLISE:
- Compare simetria entre lado direito e esquerdo
- Observe o alinhamento vertical: orelha-ombro-quadril-joelho-tornozelo
- Verifique se há compensações diferentes na descida vs. subida
- Note a posição mais baixa alcançada (profundidade do agachamento)

Responda APENAS em JSON válido com este formato:
{
  "detected_compensations": ["compensation_id_1", "compensation_id_2"],
  "confidence": 0.85,
  "notes": "Observações detalhadas sobre as compensações identificadas e qualidade geral do movimento"
}`,

  single_leg_squat: `Você é um especialista em análise biomecânica. Analise CUIDADOSAMENTE esta imagem/vídeo de um Single-Leg Squat (agachamento unipodal).

IMPORTANTE: Observe atentamente a estabilidade, alinhamento e controle durante todo o movimento.

Compensações possíveis:

VISTA ANTERIOR (de frente):
- knee_valgus: Joelho de apoio colapsa para dentro (valgo dinâmico)
- foot_collapse: Arco plantar desaba (pronação excessiva)
- instability: Instabilidade geral, oscilações no apoio
- tremor: Tremor muscular visível
- balance_loss: Perda de equilíbrio, toca o chão com a outra perna

VISTA POSTERIOR (de trás):
- hip_drop: Queda da pelve do lado da perna elevada (sinal de Trendelenburg)
- hip_hike: Elevação excessiva da pelve do lado da perna elevada
- trunk_rotation_medial: Rotação do tronco para o lado da perna de apoio
- trunk_rotation_lateral: Rotação do tronco para o lado da perna elevada
- trunk_forward_lean_sls: Inclinação excessiva do tronco para frente
- knee_flexion_insufficient: Amplitude de flexão do joelho insuficiente (<45°)

CRITÉRIOS DE QUALIDADE:
- Joelho deve alinhar com 2º dedo do pé
- Pelve deve manter-se nivelada
- Tronco deve permanecer relativamente vertical
- Movimento deve ser controlado, sem oscilações

Responda APENAS em JSON válido com este formato:
{
  "detected_compensations": ["compensation_id_1", "compensation_id_2"],
  "side": "left" ou "right" (identifique qual perna está em apoio),
  "confidence": 0.85,
  "notes": "Observações sobre estabilidade, controle e compensações identificadas"
}`,

  pushup: `Você é um especialista em análise biomecânica. Analise CUIDADOSAMENTE esta imagem/vídeo de um Push-up (flexão de braços).

IMPORTANTE: Foque especialmente na posição escapular e alinhamento da coluna.

Compensações possíveis (vista posterior - de trás):
- scapular_winging: Escápulas aladas (bordas mediais se projetam para fora do tórax)
- elbow_flare: Cotovelos abrem excessivamente (>60° do tronco)
- shoulder_protraction: Protração excessiva dos ombros (ombros muito arredondados para frente)
- shoulder_retraction_insufficient: Falta de estabilidade escapular na fase excêntrica
- hip_elevation: Quadril sobe excessivamente (pike)
- hip_drop: Quadril afunda (lordose excessiva)

CRITÉRIOS DE QUALIDADE:
- Corpo deve formar linha reta da cabeça aos calcanhares
- Escápulas devem permanecer planas contra as costelas
- Cotovelos devem formar ~45° com o tronco
- Core deve permanecer ativado (sem movimento do quadril)

Responda APENAS em JSON válido com este formato:
{
  "detected_compensations": ["compensation_id_1", "compensation_id_2"],
  "confidence": 0.85,
  "notes": "Observações sobre estabilidade escapular, alinhamento corporal e controle"
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
        max_tokens: 1500,
        temperature: 0.2, // Lower temperature for more consistent/precise analysis
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
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI analysis',
          raw_response: aiResponse 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
