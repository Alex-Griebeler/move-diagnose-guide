import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Loader2, Sparkles, CheckCircle2, AlertCircle,
  Dumbbell, Target, Zap, Shield, Flame, RotateCcw, TrendingUp,
  ShieldCheck, ShieldQuestion, ShieldAlert, type LucideIcon
} from 'lucide-react';
import {
  ohsAnteriorCompensations, ohsLateralCompensations, ohsPosteriorCompensations,
  slsCompensations, pushupCompensations, CompensationMapping
} from '@/data/compensationMappings';
import {
  calcularPrioridades,
  formatarParaIA,
  Anamnese,
  CompensacaoDetectada,
  PriorityEngineResult,
} from '@/lib/priorityEngine';
import { logger } from '@/lib/logger';
import { parseGeneratedProtocol, type Exercise, type GeneratedProtocol } from '@/lib/protocolResponse';
import { buildProtocolSave } from '@/lib/protocolSave';
import { PROTOCOL_DRAFT_STEP, cachedProtocol, canonicalJson, requestKey } from '@/lib/protocolCache';
import { isRedFlagGateError, justificationOk, parseRedFlagStatus, type RedFlagStatus } from '@/lib/redFlags';
import { RedFlagClearanceCard, RedFlagClearedNote } from '@/components/red-flags/RedFlagClearance';

interface ProtocolGeneratorProps {
  assessmentId: string;
  onComplete: () => void;
}

interface CompensationForAI {
  id: string;
  label: string;
  testName: string;
  view: string;
  side?: string;
  hyperactiveMuscles: string[];
  hypoactiveMuscles: string[];
  associatedInjuries: string[];
  weightFactor: number;
}

const phaseConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
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

const KNOWN_PHASES = new Set(Object.keys(phaseConfig));

// Supabase errors are plain objects with a message, not Error instances
const messageOf = (err: unknown, fallback: string) =>
  err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message ? err.message : fallback;

// A generation in progress, by assessment and request: coming back to the step while it runs waits for
// the same paid call instead of starting another one
const inFlight = new Map<string, Promise<GeneratedProtocol>>();

// Etapa 5a: the red flags of the assessment, read before anything is generated
async function readRedFlagStatus(assessmentId: string): Promise<RedFlagStatus> {
  const { data, error } = await supabase.rpc('assessment_red_flag_status', { _assessment_id: assessmentId });
  if (error) throw error;
  const status = parseRedFlagStatus(data);
  if (!status) throw new Error('Não foi possível conferir as red flags');
  return status;
}

async function generateAndCache(assessmentId: string, body: Record<string, unknown>, key: string | null): Promise<GeneratedProtocol> {
  // The Edge checks the red flags of this assessment too; the id stays out of the request key
  const { data, error: fnError } = await supabase.functions.invoke('generate-protocol', { body: { ...body, assessmentId } });
  if (fnError) throw fnError;
  if (data?.error) throw new Error(data.error);
  const generated = parseGeneratedProtocol(data?.protocol);
  if (!generated) throw new Error('Resposta inválida do gerador de protocolo');
  if (key) {
    // A cache that fails to save only costs one more generation next time
    try {
      const { error: cacheError } = await supabase.from('assessment_drafts').upsert(
        { assessment_id: assessmentId, step_type: PROTOCOL_DRAFT_STEP, draft_data: { inputKey: key, protocol: generated } as unknown as Json },
        { onConflict: 'assessment_id,step_type' },
      );
      if (cacheError) logger.error('Error saving the generated protocol', cacheError);
    } catch (cacheError) {
      logger.error('Error saving the generated protocol', cacheError);
    }
  }
  return generated;
}

function ExerciseItem({ exercise, showPhase = false }: { exercise: Exercise; showPhase?: boolean }) {
  const muscles = exercise.targetMuscles.slice(0, 3).join(', ')
    + (exercise.targetMuscles.length > 3 ? ` +${exercise.targetMuscles.length - 3}` : '');
  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{exercise.name}</p>
          <p className="text-sm text-muted-foreground">
            {[showPhase && `Fase: ${exercise.phase}`, exercise.bodyRegion, muscles].filter(Boolean).join(' • ')}
          </p>
        </div>
        <Badge variant="outline">{exercise.sets}x{exercise.reps}</Badge>
      </div>
      <p className="text-sm">{exercise.instructions}</p>
      <p className="text-xs text-muted-foreground italic">💡 {exercise.rationale}</p>
    </div>
  );
}

export function ProtocolGenerator({ assessmentId, onComplete }: ProtocolGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [protocol, setProtocol] = useState<GeneratedProtocol | null>(null);
  const [priorityResult, setPriorityResult] = useState<PriorityEngineResult | null>(null);
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Etapa 5a: closed, the card asks for the clearance; open with a clearance, it shows above the protocol
  const [gate, setGate] = useState<RedFlagStatus | null>(null);
  const [justification, setJustification] = useState('');
  const [clearing, setClearing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  // Only the latest load may update the screen: not one started before leaving the step, nor
  // the first mount of StrictMode
  const latestLoad = useRef(0);

  // force: "Regenerar Protocolo" always generates; otherwise the saved generation is shown while the
  // request (tests, anamnesis and engine analysis) is the same
  const loadProtocol = useCallback(async (force: boolean) => {
    const load = ++latestLoad.current;
    const isLatest = () => latestLoad.current === load;
    setLoading(true);
    setGenerating(true);
    setError(null);
    setGate(null);

    try {
      // Red flags first: while one is not cleared, nothing is generated nor shown
      const status = await readRedFlagStatus(assessmentId);
      if (!isLatest()) return;
      setGate(status);
      if (status.blocked) {
        setProtocol(null);
        return;
      }

      const [globalResults, segmentalResults, anamnesisData] = await Promise.all([
        supabase.from('global_test_results').select('*').eq('assessment_id', assessmentId),
        supabase.from('segmental_test_results').select('*').eq('assessment_id', assessmentId),
        supabase.from('anamnesis_responses').select('*').eq('assessment_id', assessmentId).maybeSingle(),
      ]);

      if (globalResults.error) throw globalResults.error;
      if (segmentalResults.error) throw segmentalResults.error;
      // Without the anamnesis the engine would drop the student's context
      if (anamnesisData.error) throw anamnesisData.error;

      const allCompensationMappings = getAllCompensations();
      const compensacoesDetectadas: CompensacaoDetectada[] = [];
      const compensationsForAI: CompensationForAI[] = [];

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

      const anamnesis = anamnesisData.data ? {
        objectives: anamnesisData.data.objectives,
        timeHorizon: anamnesisData.data.time_horizon,
        activityFrequency: anamnesisData.data.activity_frequency,
        activityTypes: anamnesisData.data.activity_types as string[] | undefined,
        sports: anamnesisData.data.sports as Anamnese['sports'],
        painHistory: anamnesisData.data.pain_history as Anamnese['painHistory'],
        sleepQuality: anamnesisData.data.sleep_quality,
        sleepHours: anamnesisData.data.sleep_hours,
        sedentaryHoursPerDay: anamnesisData.data.sedentary_hours_per_day,
      } : {};

      const prioridadesCalculadas = calcularPrioridades(compensacoesDetectadas, anamnesis);
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

      const body = {
        compensations: compensationsForAI,
        segmentalResults: segmentalFormatted,
        anamnesis,
        priorityAnalysis: analiseIA,
        primaryIssues: prioridadesCalculadas.primaryIssues,
        secondaryIssues: prioridadesCalculadas.secondaryIssues,
      };
      const key = await requestKey(body);
      if (!isLatest()) return;

      const flight = `${assessmentId}:${canonicalJson(body)}`;
      let pending = inFlight.get(flight);
      let generated: GeneratedProtocol | null = null;
      if (!pending && !force) {
        // Read only now: with no generation of this request running, one that ran has already saved its result
        const savedDraft = await supabase.from('assessment_drafts').select('draft_data').eq('assessment_id', assessmentId)
          .eq('step_type', PROTOCOL_DRAFT_STEP).maybeSingle();
        if (!isLatest()) return;
        if (savedDraft.error) logger.error('Error loading the generated protocol', savedDraft.error);
        generated = cachedProtocol(savedDraft.data?.draft_data, key);
        pending = inFlight.get(flight);
      }
      if (!generated) {
        if (!pending) {
          pending = generateAndCache(assessmentId, body, key).finally(() => inFlight.delete(flight));
          inFlight.set(flight, pending);
        }
        generated = await pending;
      }
      if (!isLatest()) return;

      // A red flag may have been marked, or the clearance revoked, while the protocol was generated: read the
      // status again before showing it
      const statusNow = await readRedFlagStatus(assessmentId);
      if (!isLatest()) return;
      setGate(statusNow);
      if (statusNow.blocked) {
        setProtocol(null);
        return;
      }

      setEvidenceStats(stats);
      setPriorityResult(prioridadesCalculadas);
      setProtocol(generated);
    } catch (err) {
      if (!isLatest()) return;
      // The Edge stopped on a red flag the screen had not seen: back to the card
      if (isRedFlagGateError(err)) {
        try {
          const status = await readRedFlagStatus(assessmentId);
          if (!isLatest()) return;
          if (status.blocked) {
            setGate(status);
            setProtocol(null);
            return;
          }
        } catch (statusErr) {
          logger.error('Error reading the red flag status', statusErr);
        }
        if (!isLatest()) return;
      }
      console.error('Error generating protocol:', err);
      setError(messageOf(err, 'Erro ao gerar protocolo'));
      toast.error('Erro ao gerar protocolo');
    } finally {
      if (isLatest()) {
        setLoading(false);
        setGenerating(false);
      }
    }
  }, [assessmentId]);

  useEffect(() => {
    loadProtocol(false);
    return () => {
      latestLoad.current += 1;
    };
  }, [loadProtocol]);

  // Etapa 5a: a red flag may be marked, or the clearance revoked, in another tab while the protocol is on screen.
  // Coming back to this tab reads the status again; saving is checked by the database anyway
  const showingProtocol = !!protocol && !gate?.blocked;
  useEffect(() => {
    if (!showingProtocol) return;
    const recheck = async () => {
      if (document.visibilityState !== 'visible') return;
      const load = latestLoad.current;
      try {
        const status = await readRedFlagStatus(assessmentId);
        // A load started meanwhile, or the step was left: that one owns the screen
        if (latestLoad.current !== load) return;
        setGate(status);
        if (status.blocked) setProtocol(null);
      } catch (err) {
        logger.error('Error reading the red flag status', err);
      }
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [showingProtocol, assessmentId]);

  const unknownPhaseExercises = protocol?.exercises.filter(ex => !KNOWN_PHASES.has(ex.phase)) ?? [];

  const saveProtocol = async () => {
    if (!protocol || unknownPhaseExercises.length > 0) return;
    setSaving(true);
    try {
      // Protocol, findings and completion in one transaction: all of it is saved, or nothing
      const { error: saveError } = await supabase.rpc('save_assessment_protocol', buildProtocolSave(assessmentId, protocol, priorityResult));
      if (saveError) throw saveError;

      toast.success('Protocolo salvo com sucesso!');
      onComplete();
    } catch (err) {
      console.error('Error saving protocol:', err);
      // A red flag lit after the generation, or the clearance was revoked: back to the card
      if (isRedFlagGateError(err)) {
        try {
          const status = await readRedFlagStatus(assessmentId);
          if (status.blocked) {
            setGate(status);
            setProtocol(null);
            return;
          }
        } catch (statusErr) {
          logger.error('Error reading the red flag status', statusErr);
        }
      }
      toast.error('Erro ao salvar protocolo', { description: 'Nada foi gravado pela metade. Tente de novo.' });
    } finally {
      setSaving(false);
    }
  };

  const clearRedFlags = async () => {
    setClearing(true);
    try {
      const { error: clearError } = await supabase.rpc('clear_assessment_red_flags', {
        _assessment_id: assessmentId,
        _justification: justification,
      });
      if (clearError) throw clearError;
      setJustification('');
      // The status again, and only then the generation
      loadProtocol(false);
    } catch (err) {
      logger.error('Error clearing the red flags', err);
      toast.error('Erro ao liberar', { description: 'Não foi possível registrar a liberação. Tente novamente.' });
    } finally {
      setClearing(false);
    }
  };

  const revokeClearance = async (reason: string) => {
    if (!gate?.clearance) return;
    setRevoking(true);
    try {
      const { error: revokeError } = await supabase.rpc('revoke_red_flag_clearance', {
        _clearance_id: gate.clearance.id,
        _reason: reason,
      });
      if (revokeError) throw revokeError;
      // The status again: without another valid clearance the card comes back, and the protocol goes away
      loadProtocol(false);
    } catch (err) {
      logger.error('Error revoking the clearance', err);
      toast.error('Erro ao revogar', { description: 'Não foi possível revogar a liberação. Tente novamente.' });
    } finally {
      setRevoking(false);
    }
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

  if (gate?.blocked === 'anamnesis_missing') {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Falta a anamnese desta avaliação. Preencha antes de gerar o protocolo.</p>
        </CardContent>
      </Card>
    );
  }

  if (gate?.blocked) {
    return (
      <RedFlagClearanceCard
        source="anamnese"
        activeFlags={gate.activeFlags}
        justification={justification}
        onJustificationChange={setJustification}
      >
        <Button onClick={clearRedFlags} disabled={clearing || !justificationOk(justification)}>
          {clearing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Liberar e gerar protocolo
        </Button>
      </RedFlagClearanceCard>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao gerar protocolo</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => loadProtocol(false)}>Tentar Novamente</Button>
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
          <Button onClick={() => loadProtocol(false)}>Gerar Protocolo</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {gate?.clearance && <RedFlagClearedNote clearance={gate.clearance} busy={revoking} onRevoke={revokeClearance} />}

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
      <Card className="border-primary/20 gradient-card">
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
              <p className="font-display text-4xl leading-none">{protocol.exercises.length}</p>
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
              <CardTitle className="font-display font-normal tracking-wide text-xl flex items-center gap-2">
                <Icon className={`w-5 h-5 ${config.color}`} />
                {config.label}
                <Badge variant="secondary">{exercises.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exercises.map((exercise, idx) => (
                <ExerciseItem key={idx} exercise={exercise} />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Exercises whose phase the screen does not know: shown, and saving waits for a new generation */}
      {unknownPhaseExercises.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Fase não reconhecida
              <Badge variant="secondary">{unknownPhaseExercises.length}</Badge>
            </CardTitle>
            <CardDescription className="text-destructive">
              Estes exercícios vieram com uma fase que o protocolo não usa. Regenere o protocolo para poder salvar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unknownPhaseExercises.map((exercise, idx) => (
              <ExerciseItem key={idx} exercise={exercise} showPhase />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={() => loadProtocol(true)} disabled={generating}>
          {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Regenerar Protocolo
        </Button>
        <Button onClick={saveProtocol} disabled={saving || unknownPhaseExercises.length > 0}>
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
