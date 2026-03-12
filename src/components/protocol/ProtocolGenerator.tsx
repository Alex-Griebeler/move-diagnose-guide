import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { 
  Loader2, Sparkles, CheckCircle2, AlertCircle, 
  Dumbbell, Target, Zap, Shield, Flame, RotateCcw, TrendingUp,
  ShieldCheck, ShieldQuestion, ShieldAlert
} from 'lucide-react';
import { 
  ohsAnteriorCompensations, ohsLateralCompensations, ohsPosteriorCompensations,
  slsCompensations, pushupCompensations, CompensationMapping 
} from '@/data/compensationMappings';
import { 
  calcularPrioridades, 
  formatarParaIA, 
  CompensacaoDetectada,
  PriorityEngineResult,
  CausaPriorizada
} from '@/lib/priorityEngine';

interface ProtocolGeneratorProps {
  assessmentId: string;
  onComplete: () => void;
}

interface Exercise {
  name: string;
  phase: string;
  bodyRegion: string;
  targetMuscles: string[];
  sets: number;
  reps: string;
  instructions: string;
  rationale: string;
  priority: number;
}

interface GeneratedProtocol {
  protocolName: string;
  priorityLevel: string;
  frequencyPerWeek: number;
  durationWeeks: number;
  summary: string;
  exercises: Exercise[];
}

const phaseConfig: Record<string, { label: string; icon: any; color: string }> = {
  mobility: { label: 'Mobilidade', icon: RotateCcw, color: 'text-blue-500' },
  inhibition: { label: 'Inibição', icon: Target, color: 'text-purple-500' },
  activation: { label: 'Ativação', icon: Zap, color: 'text-yellow-500' },
  stability: { label: 'Estabilidade', icon: Shield, color: 'text-green-500' },
  strength: { label: 'Força', icon: Dumbbell, color: 'text-orange-500' },
  integration: { label: 'Integração', icon: Flame, color: 'text-red-500' },
};

const priorityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
  maintenance: 'bg-green-500 text-white',
};

const categoriaLabels: Record<string, string> = {
  HYPO: 'Hipoativo',
  HYPER: 'Hiperativo',
  MOB_L: 'Mobilidade',
  INSTAB: 'Instabilidade',
  CM: 'Controle Motor',
  TECH: 'Técnica',
};

const getAllCompensations = (): Record<string, CompensationMapping> => {
  const all: Record<string, CompensationMapping> = {};
  [...ohsAnteriorCompensations, ...ohsLateralCompensations, ...ohsPosteriorCompensations,
   ...slsCompensations, ...pushupCompensations].forEach(c => {
    all[c.id] = c;
  });
  return all;
};

// ============================================
// Evidence Statistics for Protocol
// ============================================
interface EvidenceStats {
  totalViews: number;
  readyViews: number;
  indeterminateViews: number;
  blockedViews: number;
  skippedCompensations: number;
  reducedWeightCompensations: number;
}

export function ProtocolGenerator({ assessmentId, onComplete }: ProtocolGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [protocol, setProtocol] = useState<GeneratedProtocol | null>(null);
  const [priorityResult, setPriorityResult] = useState<PriorityEngineResult | null>(null);
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateProtocol();
  }, [assessmentId]);

  const generateProtocol = async () => {
    setLoading(true);
    setGenerating(true);
    setError(null);

    try {
      const [globalResults, segmentalResults, anamnesisData] = await Promise.all([
        supabase.from('global_test_results').select('*').eq('assessment_id', assessmentId),
        supabase.from('segmental_test_results').select('*').eq('assessment_id', assessmentId),
        supabase.from('anamnesis_responses').select('*').eq('assessment_id', assessmentId).maybeSingle(),
      ]);

      if (globalResults.error) throw globalResults.error;
      if (segmentalResults.error) throw segmentalResults.error;

      const allCompensationMappings = getAllCompensations();
      const compensacoesDetectadas: CompensacaoDetectada[] = [];
      const compensationsForAI: any[] = [];

      // Evidence statistics tracking
      const stats: EvidenceStats = {
        totalViews: 0,
        readyViews: 0,
        indeterminateViews: 0,
        blockedViews: 0,
        skippedCompensations: 0,
        reducedWeightCompensations: 0,
      };

      globalResults.data?.forEach(result => {
        const views = [
          { key: 'anterior_view', name: 'Vista Anterior', testName: result.test_name },
          { key: 'lateral_view', name: 'Vista Lateral', testName: result.test_name },
          { key: 'posterior_view', name: 'Vista Posterior', testName: result.test_name },
          { key: 'left_side', name: 'Lado Esquerdo', testName: result.test_name, side: 'esquerdo' },
          { key: 'right_side', name: 'Lado Direito', testName: result.test_name, side: 'direito' },
        ];

        views.forEach(view => {
          const viewData = result[view.key as keyof typeof result] as Record<string, unknown> | null;
          if (!viewData || typeof viewData !== 'object' || !('compensations' in viewData)) return;

          // Check evidence metadata status
          const evidenceMeta = viewData.evidenceMetadata as { status?: string } | undefined;
          const status = evidenceMeta?.status;

          stats.totalViews++;

          if (status === 'blocked_quality') {
            stats.blockedViews++;
            const compIds = viewData.compensations as string[];
            if (Array.isArray(compIds)) stats.skippedCompensations += compIds.length;
            return; // Skip entirely — weight 0
          }

          if (status === 'indeterminate') {
            stats.indeterminateViews++;
          } else if (status === 'ready') {
            stats.readyViews++;
          } else {
            // Legacy data (no status) — treat as ready
            stats.readyViews++;
          }

          // Weight factor: reduce for indeterminate views
          const weightFactor = status === 'indeterminate' ? 0.5 : 1;

          const compIds = viewData.compensations as string[];
          if (Array.isArray(compIds)) {
            if (status === 'indeterminate') stats.reducedWeightCompensations += compIds.length;

            compIds.forEach(id => {
              const mapping = allCompensationMappings[id];
              if (mapping) {
                compensacoesDetectadas.push({
                  id,
                  testName: view.testName,
                  view: view.name,
                  side: view.side,
                });
                
                compensationsForAI.push({
                  id,
                  label: mapping.label,
                  testName: view.testName,
                  view: view.name,
                  side: view.side,
                  hyperactiveMuscles: mapping.hyperactiveMuscles,
                  hypoactiveMuscles: mapping.hypoactiveMuscles,
                  associatedInjuries: mapping.associatedInjuries,
                  weightFactor,
                });
              }
            });
          }
        });
      });

      setEvidenceStats(stats);

      const anamnesis = anamnesisData.data ? {
        objectives: anamnesisData.data.objectives,
        timeHorizon: anamnesisData.data.time_horizon,
        activityFrequency: anamnesisData.data.activity_frequency,
        activityTypes: anamnesisData.data.activity_types as string[] | undefined,
        sports: anamnesisData.data.sports as any[] | undefined,
        painHistory: anamnesisData.data.pain_history as any[] | undefined,
        sleepQuality: anamnesisData.data.sleep_quality,
        sleepHours: anamnesisData.data.sleep_hours,
        sedentaryHoursPerDay: anamnesisData.data.sedentary_hours_per_day,
      } : {};

      const prioridadesCalculadas = calcularPrioridades(compensacoesDetectadas, anamnesis);
      setPriorityResult(prioridadesCalculadas);
      const analiseIA = formatarParaIA(prioridadesCalculadas);

      const segmentalFormatted = segmentalResults.data?.map(s => ({
        testName: s.test_name,
        bodyRegion: s.body_region,
        leftValue: s.left_value,
        rightValue: s.right_value,
        passFailLeft: s.pass_fail_left,
        passFailRight: s.pass_fail_right,
        unit: s.unit || '',
        cutoffValue: s.cutoff_value,
      })) || [];

      const { data, error: fnError } = await supabase.functions.invoke('generate-protocol', {
        body: {
          compensations: compensationsForAI,
          segmentalResults: segmentalFormatted,
          anamnesis,
          priorityAnalysis: analiseIA,
          primaryIssues: prioridadesCalculadas.primaryIssues,
          secondaryIssues: prioridadesCalculadas.secondaryIssues,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setProtocol(data.protocol);
    } catch (err: any) {
      console.error('Error generating protocol:', err);
      setError(err.message || 'Erro ao gerar protocolo');
      toast.error('Erro ao gerar protocolo');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const saveProtocol = async () => {
    if (!protocol) return;
    setSaving(true);
    try {
      const { error: protocolError } = await supabase.from('protocols').insert([{
        assessment_id: assessmentId,
        name: protocol.protocolName,
        priority_level: protocol.priorityLevel as "critical" | "high" | "medium" | "low" | "maintenance",
        frequency_per_week: protocol.frequencyPerWeek,
        duration_weeks: protocol.durationWeeks,
        phase: 1,
        exercises: protocol.exercises as unknown as any,
      }]);
      if (protocolError) throw protocolError;

      if (priorityResult) {
        const findingsToInsert = priorityResult.primaryIssues.map(issue => ({
          assessment_id: assessmentId,
          classification_tag: issue.id,
          body_region: getBodyRegionFromCausa(issue.id),
          severity: getSeverityFromScore(issue.priorityScore) as "none" | "mild" | "moderate" | "severe",
          hyperactive_muscles: issue.categoria === 'HYPER' ? [issue.label] : [],
          hypoactive_muscles: issue.categoria === 'HYPO' ? [issue.label] : [],
          priority_score: issue.priorityScore,
          context_weight: issue.contextAdjustment,
          biomechanical_importance: issue.baseWeight,
        }));
        if (findingsToInsert.length > 0) {
          await supabase.from('functional_findings').insert(findingsToInsert);
        }
      }

      const { error: assessmentError } = await supabase.from('assessments').update({ 
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', assessmentId);
      if (assessmentError) throw assessmentError;

      toast.success('Protocolo salvo com sucesso!');
      onComplete();
    } catch (err: any) {
      console.error('Error saving protocol:', err);
      toast.error('Erro ao salvar protocolo');
    } finally {
      setSaving(false);
    }
  };

  const getBodyRegionFromCausa = (causaId: string): string => {
    if (causaId.includes('glute') || causaId.includes('hip') || causaId.includes('tfl') || causaId.includes('piriformis')) return 'Quadril';
    if (causaId.includes('ankle') || causaId.includes('dorsi') || causaId.includes('tib') || causaId.includes('calf') || causaId.includes('foot')) return 'Tornozelo/Pé';
    if (causaId.includes('core') || causaId.includes('lumbar') || causaId.includes('spine')) return 'Core/Lombar';
    if (causaId.includes('shoulder') || causaId.includes('scapula') || causaId.includes('serratus') || causaId.includes('trap') || causaId.includes('pec')) return 'Ombro/Escápula';
    if (causaId.includes('neck') || causaId.includes('cervical')) return 'Cervical';
    if (causaId.includes('knee') || causaId.includes('quad')) return 'Joelho';
    return 'Geral';
  };

  const getSeverityFromScore = (score: number): string => {
    if (score >= 6) return 'severe';
    if (score >= 4) return 'moderate';
    return 'mild';
  };

  const groupedExercises = protocol?.exercises.reduce((acc, ex) => {
    if (!acc[ex.phase]) acc[ex.phase] = [];
    acc[ex.phase].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>) || {};

  if (loading || generating) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold mt-6 mb-2">Gerando Protocolo FABRIK</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Calculando prioridades com Engine de Pesos e gerando protocolo personalizado...
          </p>
          <Progress value={generating ? 66 : 33} className="w-64 mt-6" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao gerar protocolo</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={generateProtocol}>Tentar Novamente</Button>
        </CardContent>
      </Card>
    );
  }

  if (!protocol) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum protocolo gerado</h3>
          <Button onClick={generateProtocol}>Gerar Protocolo</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evidence Statistics */}
      {evidenceStats && evidenceStats.totalViews > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              Estatísticas de Evidência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {evidenceStats.readyViews > 0 && (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  {evidenceStats.readyViews} vistas prontas
                </span>
              )}
              {evidenceStats.indeterminateViews > 0 && (
                <span className="flex items-center gap-1">
                  <ShieldQuestion className="h-3.5 w-3.5 text-warning" />
                  {evidenceStats.indeterminateViews} revisão ({evidenceStats.reducedWeightCompensations} comp. peso ×0.5)
                </span>
              )}
              {evidenceStats.blockedViews > 0 && (
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  {evidenceStats.blockedViews} bloqueadas ({evidenceStats.skippedCompensations} comp. ignoradas)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Analysis Section */}
      {priorityResult && priorityResult.primaryIssues.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-warning" />
              Análise de Prioridades (Engine FABRIK)
            </CardTitle>
            <CardDescription>
              {priorityResult.contextosAplicados.length > 0 && (
                <span>Contextos aplicados: {priorityResult.contextosAplicados.join(', ')}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="primary" className="border-none">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <span className="text-sm font-medium">
                    Issues Primárias ({priorityResult.primaryIssues.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {priorityResult.primaryIssues.map((issue, idx) => (
                      <div key={issue.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                          <div>
                            <p className="text-sm font-medium">{issue.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {categoriaLabels[issue.categoria]} • Fontes: {issue.fontes.join(', ')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Score: {issue.priorityScore}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {priorityResult.secondaryIssues.length > 0 && (
                <AccordionItem value="secondary" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <span className="text-sm font-medium text-muted-foreground">
                      Issues Secundárias ({priorityResult.secondaryIssues.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {priorityResult.secondaryIssues.map((issue) => (
                        <div key={issue.id} className="flex items-center justify-between p-2 text-sm">
                          <span className="text-muted-foreground">{issue.label}</span>
                          <span className="text-xs">{issue.priorityScore}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Protocol Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <Badge className={priorityColors[protocol.priorityLevel]}>
                  {protocol.priorityLevel === 'critical' && 'Crítico'}
                  {protocol.priorityLevel === 'high' && 'Alta Prioridade'}
                  {protocol.priorityLevel === 'medium' && 'Média Prioridade'}
                  {protocol.priorityLevel === 'low' && 'Baixa Prioridade'}
                  {protocol.priorityLevel === 'maintenance' && 'Manutenção'}
                </Badge>
              </div>
              <CardTitle className="text-xl">{protocol.protocolName}</CardTitle>
              <CardDescription className="mt-2">{protocol.summary}</CardDescription>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold">{protocol.exercises.length}</p>
              <p className="text-xs text-muted-foreground">exercícios</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground">Frequência</p>
              <p className="font-semibold">{protocol.frequencyPerWeek}x por semana</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground">Duração</p>
              <p className="font-semibold">{protocol.durationWeeks} semanas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercises by Phase */}
      {Object.entries(phaseConfig).map(([phase, config]) => {
        const exercises = groupedExercises[phase];
        if (!exercises || exercises.length === 0) return null;
        const Icon = config.icon;

        return (
          <Card key={phase}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className={`w-5 h-5 ${config.color}`} />
                {config.label}
                <Badge variant="secondary">{exercises.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exercises.map((exercise, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exercise.bodyRegion} • {exercise.targetMuscles.slice(0, 3).join(', ')}
                        {exercise.targetMuscles.length > 3 && ` +${exercise.targetMuscles.length - 3}`}
                      </p>
                    </div>
                    <Badge variant="outline">{exercise.sets}x{exercise.reps}</Badge>
                  </div>
                  <p className="text-sm">{exercise.instructions}</p>
                  <p className="text-xs text-muted-foreground italic">💡 {exercise.rationale}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={generateProtocol} disabled={generating}>
          {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Regenerar Protocolo
        </Button>
        <Button onClick={saveProtocol} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          )}
          Salvar e Finalizar
        </Button>
      </div>
    </div>
  );
}
