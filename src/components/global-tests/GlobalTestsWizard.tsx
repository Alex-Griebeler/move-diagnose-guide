import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import { 
  getRelevantGlobalTestsWithHistory, 
  GlobalTestMiloResult, 
  GlobalTestType,
  GLOBAL_TEST_LABELS,
  PainEntry 
} from '@/lib/miloRegionFilter';

import { AutoGlobalTest } from './AutoGlobalTest';
import { TestSummary, LegacyTestData } from './TestSummary';

const logger = createLogger('GlobalTestsWizard');

// ============================================
// Types
// ============================================

type ViewType = 
  | 'anterior' 
  | 'lateral' 
  | 'posterior' 
  | 'left_anterior' 
  | 'left_posterior' 
  | 'right_anterior' 
  | 'right_posterior';

interface AutoTestData {
  compensations: Record<ViewType, string[]>;
  mediaUrls: Record<ViewType, { photoUrl?: string; videoUrl?: string }>;
  notes: string;
}

export interface GlobalTestData {
  ohs: AutoTestData;
  sls: AutoTestData;
  pushup: AutoTestData;
}

interface Step {
  id: number;
  testType: GlobalTestType | 'summary';
  title: string;
  shortTitle: string;
  icon: string;
}

interface GlobalTestsWizardProps {
  assessmentId: string;
  studentId: string;
  onComplete: () => void;
}

// ============================================
// Constants
// ============================================

const ALL_STEPS: Step[] = [
  { id: 1, testType: 'ohs', title: 'Overhead Squat', shortTitle: 'OHS', icon: '🏋️' },
  { id: 2, testType: 'sls', title: 'Single-Leg Squat', shortTitle: 'SLS', icon: '🦵' },
  { id: 3, testType: 'pushup', title: 'Push-up Test', shortTitle: 'Push-up', icon: '💪' },
  { id: 4, testType: 'summary', title: 'Resumo', shortTitle: 'Resumo', icon: '📊' },
];

// ============================================
// Helpers
// ============================================

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

function toLegacyFormat(data: GlobalTestData): LegacyTestData {
  const leftSideComps = [
    ...(data.sls.compensations.left_anterior || []),
    ...(data.sls.compensations.left_posterior || []),
  ];
  const rightSideComps = [
    ...(data.sls.compensations.right_anterior || []),
    ...(data.sls.compensations.right_posterior || []),
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
      compensations: data.pushup.compensations.posterior || [],
      notes: data.pushup.notes,
    },
  };
}

function collectMediaUrls(testData: AutoTestData): string[] {
  const urls: string[] = [];
  Object.values(testData.mediaUrls).forEach(media => {
    if (media.photoUrl) urls.push(media.photoUrl);
    if (media.videoUrl) urls.push(media.videoUrl);
  });
  return urls;
}

// ============================================
// Component
// ============================================

export function GlobalTestsWizard({ assessmentId, studentId, onComplete }: GlobalTestsWizardProps) {
  const prevAssessmentIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Wizard persistence
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
  
  // MILO state
  const [miloResult, setMiloResult] = useState<GlobalTestMiloResult | null>(null);
  const [isLoadingMilo, setIsLoadingMilo] = useState(true);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // Calculate Active Steps based on MILO
  // ============================================
  
  const activeSteps = useMemo((): Step[] => {
    if (!miloResult) return ALL_STEPS;
    
    const filteredSteps = ALL_STEPS.filter(step => 
      step.testType === 'summary' || 
      miloResult.testsToRun.includes(step.testType as GlobalTestType)
    );
    
    // Re-number sequentially
    return filteredSteps.map((step, index) => ({
      ...step,
      id: index + 1,
    }));
  }, [miloResult]);

  const totalSteps = activeSteps.length;
  const currentStepData = activeSteps[currentStep - 1];

  // ============================================
  // Load MILO Configuration
  // ============================================
  
  useEffect(() => {
    async function loadMiloConfig() {
      setIsLoadingMilo(true);
      try {
        // Buscar pain_history da anamnese
        const { data: anamnesis, error } = await supabase
          .from('anamnesis_responses')
          .select('pain_history')
          .eq('assessment_id', assessmentId)
          .single();
        
        const rawPainHistory = anamnesis?.pain_history;
        const painHistory: PainEntry[] = Array.isArray(rawPainHistory) 
          ? (rawPainHistory as unknown as PainEntry[])
          : [];
        
        // Usar nova função com histórico
        const result = await getRelevantGlobalTestsWithHistory(
          assessmentId,
          studentId,
          painHistory
        );
        
        setMiloResult(result);
      } catch (error) {
        logger.error('Error loading MILO config', error);
        // Fallback: todos os testes
        setMiloResult({
          testsToRun: ['ohs', 'sls', 'pushup'],
          testsSkipped: [],
          reason: 'Erro ao carregar - avaliação completa',
        });
      } finally {
        setIsLoadingMilo(false);
      }
    }
    
    loadMiloConfig();
  }, [assessmentId, studentId]);

  // ============================================
  // Track Assessment Changes
  // ============================================
  
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

  // ============================================
  // Navigation
  // ============================================
  
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ============================================
  // Submission
  // ============================================
  
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const legacyData = toLegacyFormat(data);

      // Save only tests that were actually run
      const testsToSave = miloResult?.testsToRun || ['ohs', 'sls', 'pushup'];

      if (testsToSave.includes('ohs')) {
        await supabase.from('global_test_results').insert({
          assessment_id: assessmentId,
          test_name: 'ohs',
          anterior_view: { compensations: legacyData.ohs.anteriorView },
          lateral_view: { compensations: legacyData.ohs.lateralView },
          posterior_view: { compensations: legacyData.ohs.posteriorView },
          notes: legacyData.ohs.notes || null,
          media_urls: collectMediaUrls(data.ohs),
        });
      }

      if (testsToSave.includes('sls')) {
        await supabase.from('global_test_results').insert({
          assessment_id: assessmentId,
          test_name: 'sls',
          left_side: { 
            compensations: legacyData.sls.leftSide,
            anterior: data.sls.compensations.left_anterior || [],
            posterior: data.sls.compensations.left_posterior || [],
          },
          right_side: { 
            compensations: legacyData.sls.rightSide,
            anterior: data.sls.compensations.right_anterior || [],
            posterior: data.sls.compensations.right_posterior || [],
          },
          notes: legacyData.sls.notes || null,
          media_urls: collectMediaUrls(data.sls),
        });
      }

      if (testsToSave.includes('pushup')) {
        await supabase.from('global_test_results').insert({
          assessment_id: assessmentId,
          test_name: 'pushup',
          posterior_view: { compensations: legacyData.pushup.compensations },
          notes: legacyData.pushup.notes || null,
          media_urls: collectMediaUrls(data.pushup),
        });
      }

      await supabase
        .from('assessments')
        .update({ status: 'in_progress' })
        .eq('id', assessmentId);

      clearPersistedData();
      localStorage.removeItem('globalTests_assessmentId');

      toast({
        title: 'Testes globais salvos!',
        description: 'Os resultados foram registrados. Próximo: Testes Segmentados.',
      });

      onComplete();
    } catch (error) {
      logger.error('Error saving global tests:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os testes. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // Computed Values
  // ============================================
  
  const progress = (currentStep / totalSteps) * 100;

  const getTotalCompensations = (): number => {
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

  // ============================================
  // Render Step Content
  // ============================================
  
  const renderStep = () => {
    if (!currentStepData) return null;
    
    switch (currentStepData.testType) {
      case 'ohs':
        return (
          <AutoGlobalTest
            testType="ohs"
            assessmentId={assessmentId}
            data={data.ohs}
            onUpdate={(ohs) => updateData({ ohs })}
          />
        );
      case 'sls':
        return (
          <AutoGlobalTest
            testType="sls"
            assessmentId={assessmentId}
            data={data.sls}
            onUpdate={(sls) => updateData({ sls })}
          />
        );
      case 'pushup':
        return (
          <AutoGlobalTest
            testType="pushup"
            assessmentId={assessmentId}
            data={data.pushup}
            onUpdate={(pushup) => updateData({ pushup })}
          />
        );
      case 'summary':
        return <TestSummary data={toLegacyFormat(data)} />;
      default:
        return null;
    }
  };

  // ============================================
  // Loading State
  // ============================================
  
  if (isLoadingPersistence || isLoadingMilo) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* MILO Info Banner */}
      {miloResult && miloResult.testsSkipped.length > 0 && (
        <div className="mb-6 p-3 bg-muted/50 border border-border/50 rounded-lg flex items-start gap-3">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span>Testes omitidos com base na região de dor: </span>
            <span className="font-medium text-foreground">
              {miloResult.testsSkipped.map(t => GLOBAL_TEST_LABELS[t]).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{currentStepData?.icon}</span>
            {currentStepData?.title}
          </h2>
          <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {activeSteps.map((step) => (
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
      {currentStepData?.testType !== 'summary' && getTotalCompensations() > 0 && (
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
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        {currentStep < totalSteps ? (
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
