// ============================================
// Segmental Tests Wizard - Rewritten
// Uses centralized utilities and modular components
// ============================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ChevronRight, Check } from 'lucide-react';
import { groupTestsByRegion, SegmentalTest } from '@/data/segmentalTestMappings';
import { AutoSegmentalTest } from './AutoSegmentalTest';
import { SegmentalTestsSummary } from './SegmentalTestsSummary';
import { AttentionPointsBanner } from './AttentionPointsBanner';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { getSuggestedTestsWithPriority, TestPrioritizationResult } from '@/lib/testPrioritization';
import { Anamnese } from '@/lib/priorityEngine';
import { DetectedCompensation } from '@/lib/attentionPointsEngine';
import { getTestTypeFromName, getViewFromColumn, getSideFromColumn, getViewColumns } from '@/lib/globalTestUtils';
import { 
  WizardProgress, 
  WizardStep, 
  WizardNavigation, 
  WizardContainer, 
  WizardContentCard, 
  WizardLoading 
} from '@/components/wizard';

// ============================================
// Types
// ============================================

interface SegmentalTestsWizardProps {
  assessmentId: string;
  onComplete: () => void;
}

interface TestResult {
  testId: string;
  testName: string;
  bodyRegion: string;
  leftValue: number | null;
  rightValue: number | null;
  passFailLeft: boolean | null;
  passFailRight: boolean | null;
  notes: string;
  unit: string;
  cutoffValue?: number;
  mediaUrls?: { photoUrl?: string; videoUrl?: string };
}

interface WizardData {
  testResults: Record<string, TestResult>;
}

interface StepWithTestId extends WizardStep {
  testId: string | null;
}

const initialWizardData: WizardData = {
  testResults: {},
};

// ============================================
// Component
// ============================================

export function SegmentalTestsWizard({ assessmentId, onComplete }: SegmentalTestsWizardProps) {
  const prevAssessmentIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prioritizationResult, setPrioritizationResult] = useState<TestPrioritizationResult | null>(null);
  const [detectedCompensations, setDetectedCompensations] = useState<string[]>([]);

  const {
    data: wizardData,
    updateData,
    currentStep,
    setCurrentStep,
    clearPersistedData,
    isLoading: isLoadingPersistence,
  } = useWizardPersistence<WizardData>({
    key: 'segmental_tests_wizard',
    initialData: initialWizardData,
    assessmentId,
  });

  const suggestedTests = prioritizationResult?.prioritizedTests.map(p => p.test) || [];
  const totalSteps = suggestedTests.length + 1;
  const { testResults } = wizardData;

  // ============================================
  // Handle assessment ID changes
  // ============================================

  useEffect(() => {
    const savedAssessmentId = localStorage.getItem('segmentalTests_assessmentId');

    if (savedAssessmentId && savedAssessmentId !== assessmentId) {
      clearPersistedData();
      setCurrentStep(1);
    }

    localStorage.setItem('segmentalTests_assessmentId', assessmentId);
    prevAssessmentIdRef.current = assessmentId;
  }, [assessmentId, clearPersistedData, setCurrentStep]);

  // ============================================
  // Fetch global test results and calculate priorities
  // ============================================

  useEffect(() => {
    fetchGlobalTestResults();
  }, [assessmentId]);

  const fetchGlobalTestResults = async () => {
    try {
      const [globalResultsResponse, anamnesisResponse] = await Promise.all([
        supabase
          .from('global_test_results')
          .select('*')
          .eq('assessment_id', assessmentId),
        supabase
          .from('anamnesis_responses')
          .select('pain_history, sports, activity_types, sedentary_hours_per_day, sleep_quality, objectives')
          .eq('assessment_id', assessmentId)
          .single(),
      ]);

      if (globalResultsResponse.error) throw globalResultsResponse.error;

      // Collect compensations with details for frequency calculation
      const allCompensations: string[] = [];
      const detailedCompensations: DetectedCompensation[] = [];
      const viewColumns = getViewColumns();

      globalResultsResponse.data?.forEach(result => {
        const testType = getTestTypeFromName(result.test_name);

        viewColumns.forEach(viewColumn => {
          const viewData = result[viewColumn as keyof typeof result] as Record<string, unknown> | null;
          if (viewData && typeof viewData === 'object' && 'compensations' in viewData) {
            const compensations = viewData.compensations as string[];
            if (Array.isArray(compensations)) {
              compensations.forEach(compId => {
                allCompensations.push(compId);
                detailedCompensations.push({
                  id: compId,
                  testType,
                  view: getViewFromColumn(viewColumn),
                  side: getSideFromColumn(viewColumn),
                });
              });
            }
          }
        });
      });

      const uniqueCompensations = [...new Set(allCompensations)];
      setDetectedCompensations(uniqueCompensations);

      const anamnesisData = anamnesisResponse.data;
      const anamnese: Anamnese = {
        painHistory: anamnesisData?.pain_history as Array<{ region: string; intensity: number }> || [],
        sports: anamnesisData?.sports as Array<{ name: string }> || [],
        activityTypes: anamnesisData?.activity_types as string[] || [],
        sedentaryHoursPerDay: anamnesisData?.sedentary_hours_per_day || undefined,
        sleepQuality: anamnesisData?.sleep_quality || undefined,
        objectives: anamnesisData?.objectives || undefined,
      };

      // Calculate prioritized tests
      const result = getSuggestedTestsWithPriority(uniqueCompensations, anamnese, 5, {
        useAttentionPoints: true,
        maxAttentionPoints: 2,
        detectedCompensationsWithDetails: detailedCompensations,
      });
      setPrioritizationResult(result);

      // Initialize results if empty
      const allTests = [...result.prioritizedTests, ...result.additionalTests].map(p => p.test);
      if (Object.keys(testResults).length === 0) {
        initializeResults(allTests);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar compensações detectadas');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Result management
  // ============================================

  const initializeResults = (tests: SegmentalTest[]) => {
    const initialResults: Record<string, TestResult> = {};
    tests.forEach(test => {
      initialResults[test.id] = {
        testId: test.id,
        testName: test.name,
        bodyRegion: test.bodyRegion,
        leftValue: null,
        rightValue: null,
        passFailLeft: null,
        passFailRight: null,
        notes: '',
        unit: test.unit,
        cutoffValue: test.cutoffValue,
      };
    });
    updateData({ testResults: initialResults });
  };

  const handleTestResult = (testId: string, result: Partial<TestResult>) => {
    updateData({
      testResults: {
        ...testResults,
        [testId]: { ...testResults[testId], ...result },
      },
    });
  };

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
  // Submit
  // ============================================

  const collectMediaUrls = (result: TestResult): string[] => {
    const urls: string[] = [];
    if (result.mediaUrls?.photoUrl) urls.push(result.mediaUrls.photoUrl);
    if (result.mediaUrls?.videoUrl) urls.push(result.mediaUrls.videoUrl);
    return urls;
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const resultsToInsert = Object.values(testResults).map(result => ({
        assessment_id: assessmentId,
        test_name: result.testName,
        body_region: result.bodyRegion,
        left_value: result.leftValue,
        right_value: result.rightValue,
        pass_fail_left: result.passFailLeft,
        pass_fail_right: result.passFailRight,
        cutoff_value: result.cutoffValue || null,
        unit: result.unit,
        notes: result.notes || null,
        media_urls: collectMediaUrls(result),
      }));

      const { error } = await supabase
        .from('segmental_test_results')
        .insert(resultsToInsert);

      if (error) throw error;

      clearPersistedData();
      localStorage.removeItem('segmentalTests_assessmentId');

      toast.success('Testes segmentados salvos com sucesso!');
      onComplete();
    } catch (error) {
      console.error('Error saving segmental tests:', error);
      toast.error('Erro ao salvar testes segmentados');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    clearPersistedData();
    localStorage.removeItem('segmentalTests_assessmentId');
    toast.info('Testes segmentados pulados');
    onComplete();
  };

  // ============================================
  // Helpers
  // ============================================

  const isTestCompleted = (testId: string): boolean => {
    const result = testResults[testId];
    if (!result) return false;
    return result.passFailLeft !== null || result.passFailRight !== null ||
           result.leftValue !== null || result.rightValue !== null;
  };

  const getCompletedCount = (): number => {
    return Object.keys(testResults).filter(testId => isTestCompleted(testId)).length;
  };

  const isStepCompleted = (step: WizardStep): boolean => {
    const stepWithTestId = step as StepWithTestId;
    if (stepWithTestId.testId) {
      return isTestCompleted(stepWithTestId.testId);
    }
    return false;
  };

  // ============================================
  // Loading state
  // ============================================

  if (loading || isLoadingPersistence) {
    return (
      <WizardLoading 
        message={isLoadingPersistence ? 'Carregando dados salvos...' : 'Analisando compensações...'} 
      />
    );
  }

  // ============================================
  // No tests state
  // ============================================

  if (suggestedTests.length === 0) {
    return (
      <WizardContainer>
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum teste segmentado sugerido</h3>
            <p className="text-muted-foreground mb-6">
              Não foram detectadas compensações que exijam testes adicionais.
            </p>
            <Button onClick={onComplete}>
              Continuar <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </WizardContainer>
    );
  }

  // ============================================
  // Main render
  // ============================================

  const isSummaryStep = currentStep === totalSteps;
  const currentTestIndex = currentStep - 1;
  const currentTest = !isSummaryStep ? suggestedTests[currentTestIndex] : null;
  const groupedTests = groupTestsByRegion(suggestedTests);
  const completedCount = getCompletedCount();

  // Build steps array
  const steps: StepWithTestId[] = [
    ...suggestedTests.map((test, i) => ({
      id: i + 1,
      title: test.name,
      shortTitle: test.name.length > 12 ? test.name.substring(0, 10) + '...' : test.name,
      icon: '🔬',
      testId: test.id,
    })),
    { id: totalSteps, title: 'Resumo', shortTitle: 'Resumo', icon: '📊', testId: null },
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <WizardContainer>
      {/* Progress Header */}
      <WizardProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={steps}
        currentTitle={currentStepData.title}
        currentIcon={currentStepData.icon}
        onStepClick={setCurrentStep}
        isStepCompleted={isStepCompleted}
        tooltip={!isSummaryStep && currentTest?.description ? currentTest.description : undefined}
      />

      {/* Attention Points Banner - only on first step */}
      {prioritizationResult?.attentionPointsApplied && prioritizationResult.attentionPoints && currentStep === 1 && (
        <AttentionPointsBanner attentionPoints={prioritizationResult.attentionPoints} />
      )}

      {/* Completion Counter */}
      {currentStep < totalSteps && completedCount > 0 && (
        <div className="mb-6 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-success" />
          <span className="text-sm">
            <strong>{completedCount}</strong> de {suggestedTests.length} testes concluídos
          </span>
        </div>
      )}

      {/* Step Content */}
      <WizardContentCard>
        {isSummaryStep ? (
          <SegmentalTestsSummary
            results={testResults}
            tests={suggestedTests}
            groupedTests={groupedTests}
            prioritizedTests={prioritizationResult?.prioritizedTests}
          />
        ) : currentTest ? (
          <AutoSegmentalTest
            test={currentTest}
            assessmentId={assessmentId}
            result={testResults[currentTest.id]}
            onUpdate={(result) => handleTestResult(currentTest.id, result)}
          />
        ) : null}
      </WizardContentCard>

      {/* Navigation */}
      <WizardNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={handleSubmit}
        onSkip={!isSummaryStep ? handleSkip : undefined}
        isSubmitting={saving}
        submitLabel="Salvar Resultados"
      />
    </WizardContainer>
  );
}
