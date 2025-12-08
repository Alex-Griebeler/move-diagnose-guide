import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompensationFinding {
  id: string;
  label: string;
  testName: string;
  view?: string;
  side?: string;
  hyperactiveMuscles: string[];
  hypoactiveMuscles: string[];
  associatedInjuries: string[];
}

interface SegmentalResult {
  testName: string;
  bodyRegion: string;
  leftValue: number | null;
  rightValue: number | null;
  passFailLeft: boolean | null;
  passFailRight: boolean | null;
  unit: string;
  cutoffValue?: number;
}

interface AnamnesisData {
  objectives?: string;
  timeHorizon?: string;
  activityFrequency?: number;
  activityTypes?: string[];
  sports?: { name: string; frequency: string; level: string }[];
  painHistory?: { region: string; intensity: number }[];
  sleepQuality?: number;
  sleepHours?: number;
}

interface PrioritizedIssue {
  id: string;
  label: string;
  categoria: string;
  priorityScore: number;
  fontes: string[];
}

interface ProtocolRequest {
  compensations: CompensationFinding[];
  segmentalResults: SegmentalResult[];
  anamnesis: AnamnesisData;
  priorityAnalysis?: string;
  primaryIssues?: PrioritizedIssue[];
  secondaryIssues?: PrioritizedIssue[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { compensations, segmentalResults, anamnesis, priorityAnalysis, primaryIssues, secondaryIssues }: ProtocolRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const compensationSummary = compensations.map(c => 
      `- ${c.label} (${c.testName}${c.view ? `, ${c.view}` : ''}${c.side ? `, lado ${c.side}` : ''}): ` +
      `Hiperativo: ${c.hyperactiveMuscles.join(', ')}; Hipoativo: ${c.hypoactiveMuscles.join(', ')}`
    ).join('\n');

    const segmentalSummary = segmentalResults.map(s => {
      const leftStatus = s.passFailLeft === null ? 'N/A' : s.passFailLeft ? 'OK' : 'Déficit';
      const rightStatus = s.passFailRight === null ? 'N/A' : s.passFailRight ? 'OK' : 'Déficit';
      return `- ${s.testName} (${s.bodyRegion}): E=${s.leftValue ?? 'N/A'}${s.unit} (${leftStatus}), D=${s.rightValue ?? 'N/A'}${s.unit} (${rightStatus})`;
    }).join('\n');

    const painSummary = anamnesis.painHistory?.map(p => 
      `${p.region} (intensidade ${p.intensity}/10)`
    ).join(', ') || 'Sem histórico de dor';

    const sportsSummary = anamnesis.sports?.map(s => 
      `${s.name} (${s.frequency}x/sem, nível ${s.level})`
    ).join(', ') || 'Nenhum esporte específico';

    const systemPrompt = `Você é um especialista em avaliação de movimento e prescrição de exercícios corretivos usando a metodologia FABRIK.

A metodologia FABRIK segue 6 fases em ordem:
1. MOBILITY (Mobilidade): Exercícios para aumentar amplitude articular
2. INHIBITION (Inibição): Técnicas para relaxar músculos hiperativos (liberação miofascial, alongamentos)
3. ACTIVATION (Ativação): Exercícios para ativar músculos hipoativos de forma isolada
4. STABILITY (Estabilidade): Exercícios para estabilização articular em posições estáticas
5. STRENGTH (Força): Exercícios para fortalecer em padrões de movimento
6. INTEGRATION (Integração): Exercícios funcionais que integram os padrões corrigidos

REGRAS IMPORTANTES:
- Priorize compensações que aparecem em múltiplos testes
- Considere o histórico de dor - evite exercícios que possam agravar
- Adapte a intensidade ao nível de atividade física do aluno
- Se há déficits bilaterais assimétricos, inclua exercícios unilaterais
- Máximo de 8-10 exercícios por protocolo para não sobrecarregar
- Considere os objetivos e horizonte temporal do aluno`;

    // Build priority issues summary
    const primaryIssuesSummary = primaryIssues?.map((issue, i) => 
      `${i + 1}. ${issue.label} [${issue.categoria}] - Score: ${issue.priorityScore} (Fontes: ${issue.fontes.join(', ')})`
    ).join('\n') || 'Nenhuma issue primária';

    const secondaryIssuesSummary = secondaryIssues?.map((issue, i) => 
      `${i + 1}. ${issue.label} [${issue.categoria}] - Score: ${issue.priorityScore}`
    ).join('\n') || 'Nenhuma issue secundária';

    const userPrompt = `Gere um protocolo de exercícios corretivos baseado na avaliação abaixo.

## ANÁLISE DE PRIORIDADES (Engine FABRIK):
${priorityAnalysis || 'Análise não disponível'}

### Issues Primárias (PRIORIZAR):
${primaryIssuesSummary}

### Issues Secundárias:
${secondaryIssuesSummary}

## COMPENSAÇÕES DETECTADAS NOS TESTES GLOBAIS:
${compensationSummary || 'Nenhuma compensação detectada'}

## RESULTADOS DOS TESTES SEGMENTADOS:
${segmentalSummary || 'Nenhum teste segmentado realizado'}

## DADOS DO ALUNO:
- Objetivos: ${anamnesis.objectives || 'Não especificado'}
- Horizonte temporal: ${anamnesis.timeHorizon || 'Não especificado'}
- Frequência de atividade: ${anamnesis.activityFrequency || 0}x por semana
- Tipos de atividade: ${anamnesis.activityTypes?.join(', ') || 'Não especificado'}
- Esportes praticados: ${sportsSummary}
- Histórico de dor: ${painSummary}
- Qualidade do sono: ${anamnesis.sleepQuality || 'N/A'}/10
- Horas de sono: ${anamnesis.sleepHours || 'N/A'} horas

IMPORTANTE: Priorize exercícios para as Issues Primárias listadas acima. Organize por fase FABRIK.`;

    console.log("Generating protocol with AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_protocol",
              description: "Gera um protocolo de exercícios corretivos estruturado",
              parameters: {
                type: "object",
                properties: {
                  protocolName: { 
                    type: "string", 
                    description: "Nome descritivo do protocolo baseado nas principais necessidades" 
                  },
                  priorityLevel: { 
                    type: "string", 
                    enum: ["critical", "high", "medium", "low", "maintenance"],
                    description: "Nível de prioridade baseado na severidade dos achados"
                  },
                  frequencyPerWeek: { 
                    type: "number", 
                    description: "Frequência recomendada de treinos por semana (2-5)" 
                  },
                  durationWeeks: { 
                    type: "number", 
                    description: "Duração recomendada em semanas (4-12)" 
                  },
                  summary: {
                    type: "string",
                    description: "Resumo de 2-3 frases explicando o foco do protocolo"
                  },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome do exercício" },
                        phase: { 
                          type: "string", 
                          enum: ["mobility", "inhibition", "activation", "stability", "strength", "integration"],
                          description: "Fase FABRIK do exercício"
                        },
                        bodyRegion: { type: "string", description: "Região do corpo alvo" },
                        targetMuscles: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "Músculos alvo do exercício" 
                        },
                        sets: { type: "number", description: "Número de séries" },
                        reps: { type: "string", description: "Repetições ou tempo (ex: '12-15' ou '30s')" },
                        instructions: { type: "string", description: "Instruções breves de execução" },
                        rationale: { type: "string", description: "Justificativa para inclusão baseada nos achados" },
                        priority: { 
                          type: "number", 
                          description: "Prioridade do exercício (1-10, sendo 10 mais prioritário)" 
                        }
                      },
                      required: ["name", "phase", "bodyRegion", "targetMuscles", "sets", "reps", "instructions", "rationale", "priority"]
                    }
                  }
                },
                required: ["protocolName", "priorityLevel", "frequencyPerWeek", "durationWeeks", "summary", "exercises"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_protocol" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_protocol") {
      throw new Error("Invalid AI response format");
    }

    const protocol = JSON.parse(toolCall.function.arguments);

    // Sort exercises by phase order and priority
    const phaseOrder = ['mobility', 'inhibition', 'activation', 'stability', 'strength', 'integration'];
    protocol.exercises.sort((a: any, b: any) => {
      const phaseCompare = phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase);
      if (phaseCompare !== 0) return phaseCompare;
      return b.priority - a.priority;
    });

    return new Response(JSON.stringify({ protocol }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in generate-protocol function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
