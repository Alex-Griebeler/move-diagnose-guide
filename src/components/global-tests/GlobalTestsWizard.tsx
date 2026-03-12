import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, AlertCircle, ShieldCheck, ShieldQuestion, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('GlobalTestsWizard');

import { AutoGlobalTest } from './AutoGlobalTest';
import { TestSummary, LegacyTestData } from './TestSummary';
import type { EvidenceMetadata, ViewReliabilityStatus } from '@/lib/clinical/types';

type ViewType = 
  | 'anterior' 
  | 'lateral' 
  | 'posterior' 
  | 'left_anterior' 
  | 'left_lateral'
  | 'left_posterior' 
  | 'right_anterior' 
  | 'right_lateral'
  | 'right_posterior';

interface AutoTestData {
  compensations: Record<ViewType, string[]>;
  mediaUrls: Record<ViewType, { photoUrl?: string; videoUrl?: string }>;
  notes: string;
  evidenceMetadata?: Record<ViewType, EvidenceMetadata>;
}

export interface GlobalTestData {
  ohs: AutoTestData;
  sls: AutoTestData;
  pushup: AutoTestData;
}

const createEmptyAutoTestData = (): AutoTestData => ({
  compensations: {} as Record<ViewType, string[]>,
  mediaUrls: {} as Record<ViewType, { photoUrl?: string; videoUrl?: string }>,
  notes: '',
});

const initialData: GlobalTestData = {
  ohs: createEmptyAutoTestData(),
  sls: createEmptyAutoTestData(),
  pushup: createEmptyAutoTestData(),
};

const steps = [
  { id: 1, title: 'Overhead Squat', shortTitle: 'OHS', icon: '🏋️' },
  { id: 2, title: 'Single-Leg Squat', shortTitle: 'SLS', icon: '🦵' },
  { id: 3, title: 'Push-up Test', shortTitle: 'Push-up', icon: '💪' },
  { id: 4, title: 'Resumo', shortTitle: 'Resumo', icon: '📊' },
];

interface GlobalTestsWizardProps {
  assessmentId: string;
  onComplete: () => void;
}

// Convert new format to legacy format for TestSummary
function toLegacyFormat(data: GlobalTestData): LegacyTestData {
  const leftSideComps = [
    ...(data.sls.compensations.left_anterior || []),
    ...(data.sls.compensations.left_lateral || []),
    ...(data.sls.compensations.left_posterior || []),
  ];
  const rightSideComps = [
    ...(data.sls.compensations.right_anterior || []),
    ...(data.sls.compensations.right_lateral || []),
    ...(data.sls.compensations.right_posterior || []),
  ];
  const pushupComps = [
    ...(data.pushup.compensations.lateral || []),
    ...(data.pushup.compensations.posterior || []),
  ];

  return {
    ohs: {
      anteriorView: data.ohs.compensations.anterior || [],
      lateralView: data.ohs.compensations.lateral || [],
      posteriorView: data.ohs.compensations.posterior || [],
      notes: data.ohs.notes,
    },
    sls: {
      leftSide: leftSideComps,
      rightSide: rightSideComps,
      notes: data.sls.notes,
    },
    pushup: {
      compensations: pushupComps,
      notes: data.pushup.notes,
    },
  };
}

// ============================================
// Evidence Summary Aggregation
// ============================================
interface EvidenceSummary {
  ready: number;
  indeterminate: number;
  blocked: number;
  total: number;
  avgAgreement: number;
}

function aggregateEvidenceSummary(data: GlobalTestData): EvidenceSummary {
  let ready = 0, indeterminate = 0, blocked = 0, total = 0;
  let agreementSum = 0, agreementCount = 0;

  const processTest = (testData: AutoTestData) => {
    if (!testData.evidenceMetadata) return;
    for (const meta of Object.values(testData.evidenceMetadata)) {
      if (!meta) continue;
      total++;
      if (meta.status === 'ready') ready++;
      else if (meta.status === 'indeterminate') indeterminate++;
      else if (meta.status === 'blocked_quality') blocked++;
      if (meta.objectiveAgreementScore > 0) {
        agreementSum += meta.objectiveAgreementScore;
        agreementCount++;
      }
    }
  };

  processTest(data.ohs);
  processTest(data.sls);
  processTest(data.pushup);

  return {
    ready,
    indeterminate,
    blocked,
    total,
    avgAgreement: agreementCount > 0 ? agreementSum / agreementCount : 0,
  };
}

export function GlobalTestsWizard({ assessmentId, onComplete }: GlobalTestsWizardProps) {
  const prevAssessmentIdRef = useRef<string | null>(null);
  
  const {
    data,
    updateData,
    currentStep,
    setCurrentStep,
    clearPersistedData,
    isLoading: isLoadingPersistence,
  } = useWizardPersistence<GlobalTestData>({
    key: 'global_tests_wizard',
    initialData,
    assessmentId,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoadingPersistence) return;
    const savedAssessmentId = localStorage.getItem('globalTests_assessmentId');
    if (savedAssessmentId && savedAssessmentId !== assessmentId && prevAssessmentIdRef.current === savedAssessmentId) {
      logger.debug(`Switching from ${savedAssessmentId} to ${assessmentId}, clearing old data`);
      clearPersistedData();
      setCurrentStep(1);
    }
    localStorage.setItem('globalTests_assessmentId', assessmentId);
    prevAssessmentIdRef.current = assessmentId;
  }, [assessmentId, isLoadingPersistence, clearPersistedData, setCurrentStep]);

  const handleNext = () => { if (currentStep < 4) setCurrentStep(currentStep + 1); };
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const collectMediaUrls = (testData: AutoTestData): string[] => {
    const urls: string[] = [];
    Object.values(testData.mediaUrls).forEach(media => {
      if (media.photoUrl) urls.push(media.photoUrl);
      if (media.videoUrl) urls.push(media.videoUrl);
    });
    return urls;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const legacyData = toLegacyFormat(data);
      const buildViewData = (compensations: string[], evidence?: EvidenceMetadata): Json => {
        const obj: Record<string, unknown> = { compensations };
        if (evidence) obj.evidenceMetadata = evidence;
        return obj as Json;
      };

      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'ohs',
        anterior_view: buildViewData(legacyData.ohs.anteriorView, data.ohs.evidenceMetadata?.anterior),
        lateral_view: buildViewData(legacyData.ohs.lateralView, data.ohs.evidenceMetadata?.lateral),
        posterior_view: buildViewData(legacyData.ohs.posteriorView, data.ohs.evidenceMetadata?.posterior),
        notes: legacyData.ohs.notes || null,
        media_urls: collectMediaUrls(data.ohs) as unknown as Json,
      });

      const slsLeftSide: Record<string, unknown> = {
        compensations: legacyData.sls.leftSide,
        anterior: data.sls.compensations.left_anterior || [],
        lateral: data.sls.compensations.left_lateral || [],
        posterior: data.sls.compensations.left_posterior || [],
      };
      if (data.sls.evidenceMetadata) {
        slsLeftSide.evidenceMetadata = {
          left_anterior: data.sls.evidenceMetadata.left_anterior,
          left_lateral: data.sls.evidenceMetadata.left_lateral,
          left_posterior: data.sls.evidenceMetadata.left_posterior,
        };
      }

      const slsRightSide: Record<string, unknown> = {
        compensations: legacyData.sls.rightSide,
        anterior: data.sls.compensations.right_anterior || [],
        lateral: data.sls.compensations.right_lateral || [],
        posterior: data.sls.compensations.right_posterior || [],
      };
      if (data.sls.evidenceMetadata) {
        slsRightSide.evidenceMetadata = {
          right_anterior: data.sls.evidenceMetadata.right_anterior,
          right_lateral: data.sls.evidenceMetadata.right_lateral,
          right_posterior: data.sls.evidenceMetadata.right_posterior,
        };
      }

      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'sls',
        left_side: slsLeftSide as Json,
        right_side: slsRightSide as Json,
        notes: legacyData.sls.notes || null,
        media_urls: collectMediaUrls(data.sls) as unknown as Json,
      });

      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'pushup',
        lateral_view: buildViewData(data.pushup.compensations.lateral || [], data.pushup.evidenceMetadata?.lateral),
        posterior_view: buildViewData(data.pushup.compensations.posterior || [], data.pushup.evidenceMetadata?.posterior),
        notes: legacyData.pushup.notes || null,
        media_urls: collectMediaUrls(data.pushup) as unknown as Json,
      });

      await supabase.from('assessments').update({ status: 'in_progress' }).eq('id', assessmentId);

      clearPersistedData();
      localStorage.removeItem('globalTests_assessmentId');

      toast({
        title: 'Testes globais salvos!',
        description: 'Os resultados foram registrados. Próximo: Testes Segmentados.',
      });

      onComplete();
    } catch (error) {
      console.error('Error saving global tests:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os testes. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 4) * 100;
  const evidenceSummary = aggregateEvidenceSummary(data);

  const getTotalCompensations = () => {
    const legacyData = toLegacyFormat(data);
    return (
      legacyData.ohs.anteriorView.length +
      legacyData.ohs.lateralView.length +
      legacyData.ohs.posteriorView.length +
      legacyData.sls.leftSide.length +
      legacyData.sls.rightSide.length +
      legacyData.pushup.compensations.length
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <AutoGlobalTest testType="ohs" assessmentId={assessmentId} data={data.ohs} onUpdate={(ohs) => updateData({ ohs })} />;
      case 2: return <AutoGlobalTest testType="sls" assessmentId={assessmentId} data={data.sls} onUpdate={(sls) => updateData({ sls })} />;
      case 3: return <AutoGlobalTest testType="pushup" assessmentId={assessmentId} data={data.pushup} onUpdate={(pushup) => updateData({ pushup })} />;
      case 4: return <TestSummary data={toLegacyFormat(data)} />;
      default: return null;
    }
  };

  if (isLoadingPersistence) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando dados salvos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{steps[currentStep - 1].icon}</span>
            {steps[currentStep - 1].title}
          </h2>
          <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de 4
          </span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "flex flex-col items-center min-w-[70px] transition-colors",
                step.id === currentStep ? "text-accent" : step.id < currentStep ? "text-success" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all",
                step.id === currentStep ? "border-accent bg-accent text-accent-foreground"
                  : step.id < currentStep ? "border-success bg-success text-success-foreground"
                  : "border-muted-foreground/30"
              )}>
                {step.id < currentStep ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{step.shortTitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compensation Counter */}
      {currentStep < 4 && getTotalCompensations() > 0 && (
        <div className="mb-6 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning" />
          <span className="text-sm">
            <strong>{getTotalCompensations()}</strong> compensações identificadas até agora
          </span>
        </div>
      )}

      {/* Evidence Summary (when there are analyzed views) */}
      {evidenceSummary.total > 0 && currentStep < 4 && (
        <div className="mb-6 p-3 bg-muted/50 border border-border/50 rounded-lg">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium text-foreground text-sm">Evidência</span>
            {evidenceSummary.ready > 0 && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                {evidenceSummary.ready} prontas
              </span>
            )}
            {evidenceSummary.indeterminate > 0 && (
              <span className="flex items-center gap-1">
                <ShieldQuestion className="h-3.5 w-3.5 text-warning" />
                {evidenceSummary.indeterminate} revisão
              </span>
            )}
            {evidenceSummary.blocked > 0 && (
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                {evidenceSummary.blocked} bloqueadas
              </span>
            )}
            {evidenceSummary.avgAgreement > 0 && (
              <span>Concordância média: {Math.round(evidenceSummary.avgAgreement * 100)}%</span>
            )}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-card rounded-xl border p-6 mb-6 animate-fade-in">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-3">
        {currentStep > 1 && (
          <Button variant="ghost" onClick={handlePrevious} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
        )}

        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            Próximo
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-success hover:bg-success/90">
            {isSubmitting ? (
              <span className="animate-pulse-soft">Salvando...</span>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Concluir Testes Globais
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
