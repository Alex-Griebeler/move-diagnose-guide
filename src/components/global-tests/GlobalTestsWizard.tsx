import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('GlobalTestsWizard');

import { AutoGlobalTest } from './AutoGlobalTest';
import { TestSummary, LegacyTestData } from './TestSummary';
import type { EvidenceMetadata } from '@/lib/clinical/types';

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
// Aggregates SLS compensations from all 6 views (3 per side) into left/right arrays
function toLegacyFormat(data: GlobalTestData): LegacyTestData {
  // Aggregate SLS compensations by side
  // Left = left_anterior + left_lateral + left_posterior
  // Right = right_anterior + right_lateral + right_posterior
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

  // Aggregate Push-up compensations from both views (lateral + posterior)
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

  // Track assessment ID changes to reset when switching assessments
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

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Collect all media URLs for a test
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

      // Save OHS results
      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'ohs',
        anterior_view: { compensations: legacyData.ohs.anteriorView },
        lateral_view: { compensations: legacyData.ohs.lateralView },
        posterior_view: { compensations: legacyData.ohs.posteriorView },
        notes: legacyData.ohs.notes || null,
        media_urls: collectMediaUrls(data.ohs),
      });

      // Save SLS results with detailed view data (including new lateral views)
      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'sls',
        left_side: { 
          compensations: legacyData.sls.leftSide,
          anterior: data.sls.compensations.left_anterior || [],
          lateral: data.sls.compensations.left_lateral || [],
          posterior: data.sls.compensations.left_posterior || [],
        },
        right_side: { 
          compensations: legacyData.sls.rightSide,
          anterior: data.sls.compensations.right_anterior || [],
          lateral: data.sls.compensations.right_lateral || [],
          posterior: data.sls.compensations.right_posterior || [],
        },
        notes: legacyData.sls.notes || null,
        media_urls: collectMediaUrls(data.sls),
      });

      // Save Push-up results (lateral + posterior views)
      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'pushup',
        lateral_view: { compensations: data.pushup.compensations.lateral || [] },
        posterior_view: { compensations: data.pushup.compensations.posterior || [] },
        notes: legacyData.pushup.notes || null,
        media_urls: collectMediaUrls(data.pushup),
      });

      // Update assessment status
      await supabase
        .from('assessments')
        .update({ status: 'in_progress' })
        .eq('id', assessmentId);

      // Clear persisted data after successful save
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
      case 1:
        return (
          <AutoGlobalTest
            testType="ohs"
            assessmentId={assessmentId}
            data={data.ohs}
            onUpdate={(ohs) => updateData({ ohs })}
          />
        );
      case 2:
        return (
          <AutoGlobalTest
            testType="sls"
            assessmentId={assessmentId}
            data={data.sls}
            onUpdate={(sls) => updateData({ sls })}
          />
        );
      case 3:
        return (
          <AutoGlobalTest
            testType="pushup"
            assessmentId={assessmentId}
            data={data.pushup}
            onUpdate={(pushup) => updateData({ pushup })}
          />
        );
      case 4:
        return <TestSummary data={toLegacyFormat(data)} />;
      default:
        return null;
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
                step.id === currentStep
                  ? "text-accent"
                  : step.id < currentStep
                  ? "text-success"
                  : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all",
                  step.id === currentStep
                    ? "border-accent bg-accent text-accent-foreground"
                    : step.id < currentStep
                    ? "border-success bg-success text-success-foreground"
                    : "border-muted-foreground/30"
                )}
              >
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

      {/* Step Content */}
      <div className="bg-card rounded-xl border p-6 mb-6 animate-fade-in">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-3">
        {currentStep > 1 && (
          <Button
            variant="ghost"
            onClick={handlePrevious}
            className="text-muted-foreground"
          >
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
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-success hover:bg-success/90"
          >
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
