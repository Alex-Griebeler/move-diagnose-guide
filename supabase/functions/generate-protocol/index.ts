import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CORS Configuration
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================
// Authentication
// ============================================
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

// ============================================
// Database Types
// ============================================
interface Exercise {
  id: string;
  name: string;
  description: string | null;
  fabrik_phase: 'mobility' | 'inhibition' | 'activation' | 'stability' | 'strength' | 'integration';
  body_region: string;
  target_classifications: string[];
  target_muscles: string[];
  video_url: string | null;
  progression_criteria: string | null;
}

// ============================================
// Request Types
// ============================================
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

// ============================================
// Exercise Matching Logic
// ============================================
function extractClassificationsFromFindings(
  compensations: CompensationFinding[],
  segmentalResults: SegmentalResult[],
  primaryIssues?: PrioritizedIssue[]
): string[] {
  const classifications = new Set<string>();

  // Extract from compensations - muscles involved
  for (const comp of compensations) {
    // Map common muscle names to classification IDs
    const muscleToClassification: Record<string, string[]> = {
      'glúteo médio': ['GluteMed', 'LateralPelvic'],
      'glúteo máximo': ['GluteMax'],
      'glúteo mínimo': ['GluteMin'],
      'gastrocnêmio': ['Gastroc', 'Dorsiflexion'],
      'sóleo': ['Soleus', 'Dorsiflexion'],
      'tibial posterior': ['TibPost', 'Arch'],
      'tensor da fáscia lata': ['TFL', 'ITBand'],
      'piriforme': ['Piriformis', 'HipER'],
      'iliopsoas': ['HipFlexors', 'HipFlexion'],
      'flexores do quadril': ['HipFlexors', 'HipFlexion'],
      'reto femoral': ['HipFlexors', 'QuadEccentric'],
      'isquiotibiais': ['Hamstrings'],
      'adutores': ['Adductors', 'FrontalPlane'],
      'quadrado lombar': ['QL', 'CoreLateral'],
      'eretores': ['Paravertebrals', 'LumbarControl'],
      'trapézio superior': ['TrapSup'],
      'trapézio inferior': ['TrapInf', 'Scapula'],
      'trapézio médio': ['TrapMid', 'Scapula'],
      'serrátil anterior': ['Serratus', 'Scapula'],
      'romboides': ['Rhomboids', 'Scapula'],
      'peitoral maior': ['PecMajor', 'ShoulderFlexion'],
      'peitoral menor': ['PecMinor', 'ShoulderFlexion'],
      'latíssimo': ['Lats', 'ShoulderFlexion'],
      'core': ['Core', 'LumbarControl'],
      'transverso': ['CoreDeep', 'LumbarControl'],
      'oblíquos': ['Obliques', 'RotationalControl'],
      'multífidos': ['CoreDeep', 'LumbarControl'],
      'vmo': ['VMO', 'FrontalPlane'],
    };

    // Process hypoactive muscles (need activation)
    for (const muscle of comp.hypoactiveMuscles) {
      const lowerMuscle = muscle.toLowerCase();
      for (const [key, values] of Object.entries(muscleToClassification)) {
        if (lowerMuscle.includes(key)) {
          values.forEach(v => classifications.add(v));
        }
      }
    }

    // Process hyperactive muscles (need inhibition)
    for (const muscle of comp.hyperactiveMuscles) {
      const lowerMuscle = muscle.toLowerCase();
      for (const [key, values] of Object.entries(muscleToClassification)) {
        if (lowerMuscle.includes(key)) {
          values.forEach(v => classifications.add(v));
        }
      }
    }
  }

  // Extract from segmental results - body regions
  const regionToClassification: Record<string, string[]> = {
    'ankle': ['Ankle', 'Dorsiflexion', 'Gastroc', 'Soleus'],
    'foot': ['FootIntrinsics', 'Arch', 'ArchControl'],
    'knee': ['VMO', 'FrontalPlane', 'QuadEccentric'],
    'hip': ['GluteMax', 'GluteMed', 'HipFlexors', 'LateralPelvic'],
    'lumbar': ['Core', 'LumbarControl', 'CoreDeep'],
    'thoracic': ['TspineExtension', 'RotationalControl'],
    'shoulder': ['Scapula', 'ShoulderFlexion', 'Serratus'],
    'cervical': ['DeepNeckFlexors', 'TrapSup'],
  };

  for (const result of segmentalResults) {
    // Add classifications for failed tests
    if (result.passFailLeft === false || result.passFailRight === false) {
      const region = result.bodyRegion.toLowerCase();
      for (const [key, values] of Object.entries(regionToClassification)) {
        if (region.includes(key)) {
          values.forEach(v => classifications.add(v));
        }
      }
    }
  }

  // Add from primary issues
  if (primaryIssues) {
    for (const issue of primaryIssues) {
      // The issue.id often contains the classification directly
      if (issue.id) {
        classifications.add(issue.id);
      }
    }
  }

  return Array.from(classifications);
}

function matchExercisesToClassifications(
  exercises: Exercise[],
  targetClassifications: string[]
): Exercise[] {
  const scored = exercises.map(exercise => {
    let score = 0;
    const exerciseClassifications = exercise.target_classifications || [];
    
    for (const classification of targetClassifications) {
      if (exerciseClassifications.includes(classification)) {
        score += 1;
      }
    }
    
    return { exercise, score };
  });

  // Filter exercises with at least 1 match and sort by score
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.exercise);
}

function selectExercisesForProtocol(
  matchedExercises: Exercise[],
  maxPerPhase: number = 2
): Exercise[] {
  const phaseOrder = ['mobility', 'inhibition', 'activation', 'stability', 'strength', 'integration'] as const;
  const selected: Exercise[] = [];
  
  for (const phase of phaseOrder) {
    const phaseExercises = matchedExercises.filter(e => e.fabrik_phase === phase);
    const toSelect = phaseExercises.slice(0, maxPerPhase);
    selected.push(...toSelect);
  }
  
  return selected;
}

// ============================================
// Main Handler
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const auth = await validateAuth(req);
    if (!auth) {
      console.error('Unauthorized request to generate-protocol');
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in to use this feature.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated request from user: ${auth.userId}`);

    const { compensations, segmentalResults, anamnesis, priorityAnalysis, primaryIssues, secondaryIssues }: ProtocolRequest = await req.json();

    // ============================================
    // Step 1: Fetch curated exercise library
    // ============================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: exerciseLibrary, error: dbError } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true);

    if (dbError) {
      console.error('Error fetching exercises:', dbError);
      throw new Error('Failed to fetch exercise library');
    }

    console.log(`Loaded ${exerciseLibrary?.length || 0} exercises from library`);

    // ============================================
    // Step 2: Extract classifications from findings
    // ============================================
    const targetClassifications = extractClassificationsFromFindings(
      compensations,
      segmentalResults,
      primaryIssues
    );

    console.log('Target classifications:', targetClassifications);

    // ============================================
    // Step 3: Match exercises to classifications
    // ============================================
    const matchedExercises = matchExercisesToClassifications(
      exerciseLibrary || [],
      targetClassifications
    );

    console.log(`Matched ${matchedExercises.length} exercises`);

    // ============================================
    // Step 4: Pre-select exercises (max 2 per phase)
    // ============================================
    const preSelectedExercises = selectExercisesForProtocol(matchedExercises, 2);

    console.log(`Pre-selected ${preSelectedExercises.length} exercises for AI refinement`);

    // ============================================
    // Step 5: Use AI to refine and customize protocol
    // ============================================
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context summaries
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

    const primaryIssuesSummary = primaryIssues?.map((issue, i) => 
      `${i + 1}. ${issue.label} [${issue.categoria}] - Score: ${issue.priorityScore} (Fontes: ${issue.fontes.join(', ')})`
    ).join('\n') || 'Nenhuma issue primária';

    const secondaryIssuesSummary = secondaryIssues?.map((issue, i) => 
      `${i + 1}. ${issue.label} [${issue.categoria}] - Score: ${issue.priorityScore}`
    ).join('\n') || 'Nenhuma issue secundária';

    // Build available exercises list for AI
    const availableExercisesForAI = preSelectedExercises.map(e => ({
      id: e.id,
      name: e.name,
      phase: e.fabrik_phase,
      bodyRegion: e.body_region,
      targetClassifications: e.target_classifications,
      targetMuscles: e.target_muscles,
      description: e.description,
      videoUrl: e.video_url,
    }));

    const systemPrompt = `Você é um especialista em prescrição de exercícios corretivos usando a metodologia FABRIK.

A metodologia FABRIK segue 6 fases em ORDEM OBRIGATÓRIA:
1. MOBILITY (Mobilidade): Exercícios para aumentar amplitude articular
2. INHIBITION (Inibição): Técnicas para relaxar músculos hiperativos (liberação miofascial, alongamentos)
3. ACTIVATION (Ativação): Exercícios para ativar músculos hipoativos de forma isolada
4. STABILITY (Estabilidade): Exercícios para estabilização articular em posições estáticas
5. STRENGTH (Força): Exercícios para fortalecer em padrões de movimento
6. INTEGRATION (Integração): Exercícios funcionais que integram os padrões corrigidos

REGRAS CRÍTICAS:
- Você DEVE selecionar exercícios APENAS da biblioteca fornecida abaixo
- NÃO invente exercícios novos - use SOMENTE os IDs fornecidos
- Priorize compensações que aparecem em múltiplos testes
- Considere o histórico de dor - evite exercícios que possam agravar
- Adapte séries e repetições ao nível de atividade física do aluno
- Máximo de 8-10 exercícios por protocolo
- Considere os objetivos e horizonte temporal do aluno`;

    const userPrompt = `Crie um protocolo de exercícios corretivos baseado na avaliação abaixo.

## EXERCÍCIOS DISPONÍVEIS (use APENAS estes):
${JSON.stringify(availableExercisesForAI, null, 2)}

## ANÁLISE DE PRIORIDADES:
${priorityAnalysis || 'Análise não disponível'}

### Issues Primárias (PRIORIZAR):
${primaryIssuesSummary}

### Issues Secundárias:
${secondaryIssuesSummary}

## COMPENSAÇÕES DETECTADAS:
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

IMPORTANTE: 
- Selecione exercícios da lista acima usando os IDs exatos
- Organize por fase FABRIK
- Customize séries e repetições conforme o perfil do aluno`;

    console.log("Generating protocol with AI using curated library...");

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
              description: "Gera um protocolo de exercícios corretivos selecionando da biblioteca curada",
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
                        exerciseId: { type: "string", description: "ID do exercício da biblioteca (ex: mob_01, act_05)" },
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
                        videoUrl: { type: "string", description: "URL do vídeo do exercício" },
                        priority: { 
                          type: "number", 
                          description: "Prioridade do exercício (1-10, sendo 10 mais prioritário)" 
                        }
                      },
                      required: ["exerciseId", "name", "phase", "bodyRegion", "targetMuscles", "sets", "reps", "instructions", "rationale", "priority"]
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

    // ============================================
    // Step 6: Enrich exercises with library data
    // ============================================
    const exerciseMap = new Map(exerciseLibrary?.map(e => [e.id, e]) || []);
    
    protocol.exercises = protocol.exercises.map((ex: any) => {
      const libraryExercise = exerciseMap.get(ex.exerciseId);
      if (libraryExercise) {
        return {
          ...ex,
          videoUrl: ex.videoUrl || libraryExercise.video_url,
          description: libraryExercise.description,
          progressionCriteria: libraryExercise.progression_criteria,
        };
      }
      return ex;
    });

    // Sort exercises by phase order and priority
    const phaseOrder = ['mobility', 'inhibition', 'activation', 'stability', 'strength', 'integration'];
    protocol.exercises.sort((a: any, b: any) => {
      const phaseCompare = phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase);
      if (phaseCompare !== 0) return phaseCompare;
      return b.priority - a.priority;
    });

    console.log(`Protocol generated with ${protocol.exercises.length} exercises from curated library`);

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
