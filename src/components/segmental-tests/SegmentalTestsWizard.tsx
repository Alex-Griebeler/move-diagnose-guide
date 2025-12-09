import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { groupTestsByRegion, SegmentalTest } from '@/data/segmentalTestMappings';
import { AutoSegmentalTest } from './AutoSegmentalTest';
import { SegmentalTestsSummary } from './SegmentalTestsSummary';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { 
  getSuggestedTestsWithPriority, 
  TestPrioritizationResult,
} from '@/lib/testPrioritization';
import { Anamnese } from '@/lib/priorityEngine';
import { cn } from '@/lib/utils';

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

const initialWizardData: WizardData = {
  testResults: {},
};

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

  useEffect(() => {
    const savedAssessmentId = localStorage.getItem('segmentalTests_assessmentId');
    
    if (savedAssessmentId && savedAssessmentId !== assessmentId) {
      clearPersistedData();
      setCurrentStep(1);
    }
    
    localStorage.setItem('segmentalTests_assessmentId', assessmentId);
    prevAssessmentIdRef.current = assessmentId;
  }, [assessmentId, clearPersistedData, setCurrentStep]);

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

      const allCompensations: string[] = [];
      
      globalResultsResponse.data?.forEach(result => {
        const views = ['anterior_view', 'lateral_view', 'posterior_view', 'left_side', 'right_side'];
        views.forEach(view => {
          const viewData = result[view as keyof typeof result] as Record<string, unknown> | null;
          if (viewData && typeof viewData === 'object' && 'compensations' in viewData) {
            const compensations = viewData.compensations as string[];
            if (Array.isArray(compensations)) {
              allCompensations.push(...compensations);
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

      const result = getSuggestedTestsWithPriority(uniqueCompensations, anamnese);
      setPrioritizationResult(result);

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

  const isTestCompleted = (testId: string): boolean => {
    const result = testResults[testId];
    if (!result) return false;
    return result.passFailLeft !== null || result.passFailRight !== null || 
           result.leftValue !== null || result.rightValue !== null;
  };

  if (loading || isLoadingPersistence) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
          <span className="text-muted-foreground">
            {isLoadingPersistence ? 'Carregando dados salvos...' : 'Analisando compensações...'}
          </span>
        </div>
      </div>
    );
  }

  if (suggestedTests.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
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
      </div>
    );
  }

  const isSummaryStep = currentStep === totalSteps;
  const currentTestIndex = currentStep - 1;
  const currentTest = !isSummaryStep ? suggestedTests[currentTestIndex] : null;
  const progress = (currentStep / totalSteps) * 100;
  const groupedTests = groupTestsByRegion(suggestedTests);

  const steps = suggestedTests.map((test, i) => ({
    id: i + 1,
    testId: test.id,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Minimal Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {isSummaryStep ? 'Resumo' : currentTest?.name}
          </h2>
          <span className="text-sm text-muted-foreground">
            {currentStep} de {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />

        {/* Minimal step indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {steps.map((step) => {
            const isCompleted = isTestCompleted(step.testId);
            const isCurrent = step.id === currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  isCurrent
                    ? "bg-primary scale-125"
                    : isCompleted
                    ? "bg-success"
                    : "bg-muted-foreground/30"
                )}
                aria-label={`Etapa ${step.id}`}
              />
            );
          })}
          {/* Summary step indicator */}
          <button
            onClick={() => setCurrentStep(totalSteps)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              isSummaryStep
                ? "bg-primary scale-125"
                : "bg-muted-foreground/30"
            )}
            aria-label="Resumo"
          />
        </div>
      </div>

      {/* Content */}
      <div className="mb-6 animate-fade-in">
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

        <div className="flex gap-2">
          {!isSummaryStep && (
            <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
              Pular
            </Button>
          )}

          {isSummaryStep ? (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-success hover:bg-success/90"
            >
              {saving ? (
                <span className="animate-pulse-soft">Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Concluir
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
