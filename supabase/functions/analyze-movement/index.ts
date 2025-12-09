import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Test-specific prompts for movement analysis
const TEST_PROMPTS: Record<string, string> = {
  // Global Tests
  overhead_squat: `Você é um especialista em análise biomecânica. Analise esta imagem/vídeo de um Overhead Squat (agachamento com braços elevados).

Identifique TODAS as compensações presentes. Compensações possíveis:

VISTA ANTERIOR:
- knee_valgus: Joelhos colapsando para dentro (valgo dinâmico)
- knee_varus: Joelhos se afastando excessivamente (varo)
- foot_pronation: Desabamento do arco plantar
- feet_abduction: Pés rotacionados para fora excessivamente
- feet_eversion: Eversão dos tornozelos

VISTA LATERAL:
- trunk_lean: Inclinação excessiva do tronco para frente
- butt_wink: Retroversão pélvica no fundo do agachamento
- heels_rise: Elevação dos calcanhares
- arms_fall: Queda dos braços para frente
- lumbar_hyperextension: Hiperextensão lombar
- spine_flexion: Flexão excessiva da coluna

VISTA POSTERIOR:
- trunk_rotation: Rotação do tronco
- asymmetry: Assimetria geral do movimento

Responda APENAS em JSON válido com este formato:
{
  "detected_compensations": ["compensation_id_1", "compensation_id_2"],
  "confidence": 0.85,
  "notes": "Observações adicionais relevantes"
}`,

  single_leg_squat: `Você é um especialista em análise biomecânica. Analise esta imagem/vídeo de um Single-Leg Squat (agachamento unipodal).

Identifique TODAS as compensações presentes para o lado visível. Compensações possíveis:
- knee_valgus: Joelho colapsando para dentro
- hip_drop: Queda da pelve do lado contralateral (Trendelenburg)
- hip_hike: Elevação da pelve do lado contralateral
- instability: Instabilidade geral durante o movimento
- tremor: Tremor ou oscilação
- foot_collapse: Desabamento do arco plantar
- balance_loss: Perda de equilíbrio/toque no chão
- trunk_rotation_medial: Rotação do tronco para medial
- trunk_rotation_lateral: Rotação do tronco para lateral
- trunk_forward_lean_sls: Inclinação anterior do tronco
- knee_flexion_insufficient: Amplitude insuficiente de flexão de joelho

Responda APENAS em JSON válido com este formato:
{
  "side": "left" ou "right",
  "detected_compensations": ["compensation_id_1", "compensation_id_2"],
  "confidence": 0.85,
  "notes": "Observações adicionais relevantes"
}`,

  pushup: `Você é um especialista em análise biomecânica. Analise esta imagem/vídeo de uma Flexão de Braço (Push-up).

Identifique TODAS as compensações presentes. Compensações possíveis:
- scapular_winging: Escapular alada (escápulas se projetando)
- hips_drop: Queda excessiva do quadril
- hip_elevation: Elevação excessiva do quadril
- lumbar_extension: Hiperextensão lombar
- elbow_flare: Cotovelos muito abertos (> 45°)
- misalignment: Desalinhamento geral da coluna
- shoulder_protraction: Protração excessiva dos ombros
- shoulder_retraction_insufficient: Retração escapular insuficiente
- head_forward: Projeção anterior da cabeça

Responda APENAS em JSON válido com este formato:
{
  "detected_compensations": ["compensation_id_1", "compensation_id_2"],
  "confidence": 0.85,
  "notes": "Observações adicionais relevantes"
}`,

  // Segmental Tests - generic prompt
  segmental: `Você é um especialista em avaliação funcional. Analise esta imagem/vídeo de um teste segmentado.

Determine o resultado do teste baseado na execução observada:
- PASS: Execução correta, sem compensações significativas
- PARTIAL: Execução com compensações leves ou amplitude parcial
- FAIL: Incapacidade de executar ou compensações significativas

Se for um teste bilateral, avalie cada lado separadamente.

Responda APENAS em JSON válido com este formato:
{
  "result": "pass" | "partial" | "fail",
  "left_result": "pass" | "partial" | "fail" (se aplicável),
  "right_result": "pass" | "partial" | "fail" (se aplicável),
  "left_value": número (se aplicável, ex: graus de amplitude),
  "right_value": número (se aplicável),
  "confidence": 0.85,
  "notes": "Observações adicionais relevantes"
}`
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testType, testName, imageUrl, videoUrl, viewType } = await req.json();

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
    let prompt = TEST_PROMPTS[testType] || TEST_PROMPTS.segmental;
    
    // Add context about view type if provided
    if (viewType) {
      prompt = `${prompt}\n\nEsta imagem é da VISTA ${viewType.toUpperCase()}.`;
    }

    // Add test name context for segmental tests
    if (testType === 'segmental' && testName) {
      prompt = `${prompt}\n\nTeste sendo avaliado: ${testName}`;
    }

    console.log(`Analyzing ${testType} test${testName ? ` (${testName})` : ''}${viewType ? ` - ${viewType} view` : ''}`);

    // Build message content with image
    const messageContent: any[] = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl } }
    ];

    // Call Lovable AI Gateway with vision model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more consistent analysis
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
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-movement function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});