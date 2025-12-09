import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Loader2, Zap } from 'lucide-react';
import { groupTestsByRegion, SegmentalTest } from '@/data/segmentalTestMappings';
import { AutoSegmentalTest } from './AutoSegmentalTest';
import { SegmentalTestsSummary } from './SegmentalTestsSummary';
import { TestReasoningChainWithPriority } from './TestReasoningChainWithPriority';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { 
  getSuggestedTestsWithPriority, 
  SuggestedTestWithPriority, 
  TestPrioritizationResult,
  priorityConfig,
  getContextLabels,
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
  
  // Use unified wizard persistence hook
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

  // Get prioritized tests - add 1 for summary step
  const suggestedTests = prioritizationResult?.prioritizedTests.map(p => p.test) || [];
  const totalSteps = suggestedTests.length + 1; // +1 for summary
  const prioritizedTestsMap = new Map(
    prioritizationResult?.prioritizedTests.map(p => [p.test.id, p]) || []
  );

  const { testResults } = wizardData;

  // Detect new assessment and reset wizard
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

  // Check if a test step is completed
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
            {isLoadingPersistence ? 'Carregando dados salvos...' : 'Analisando compensações detectadas...'}
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
              Não foram detectadas compensações que exijam testes segmentados adicionais.
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
  const currentTestPriority = currentTest ? prioritizedTestsMap.get(currentTest.id) : null;
  const contextLabels = prioritizationResult ? getContextLabels(prioritizationResult.contextosAplicados) : [];

  const progress = (currentStep / totalSteps) * 100;
  const groupedTests = groupTestsByRegion(suggestedTests);
  
  const completedCount = suggestedTests.filter(t => isTestCompleted(t.id)).length;

  // Build steps array for visual indicators
  const steps = [
    ...prioritizationResult!.prioritizedTests.map((pt, i) => ({
      id: i + 1,
      title: pt.test.name,
      shortTitle: pt.test.name.split(' ')[0],
      icon: priorityConfig[pt.priority].emoji,
      testId: pt.test.id,
      priority: pt.priority,
      score: pt.score,
    })),
    { id: totalSteps, title: 'Resumo', shortTitle: 'Resumo', icon: '📊', testId: null, priority: 'low' as const, score: 0 },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {isSummaryStep ? (
              <>📊 Resumo dos Testes</>
            ) : (
              <>
                <span>{steps[currentTestIndex].icon}</span>
                {currentTest?.name}
              </>
            )}
          </h2>
          <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between mt-4 overflow-x-auto pb-2">
          {steps.map((step) => {
            const isCompleted = step.testId ? isTestCompleted(step.testId) : completedCount === suggestedTests.length;
            const isCurrent = step.id === currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "flex flex-col items-center min-w-[60px] transition-colors",
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                    ? "text-success"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                      ? "border-success bg-success text-success-foreground"
                      : step.testId ? cn(
                          "border-muted-foreground/30",
                          step.priority === 'high' ? 'bg-destructive/5' :
                          step.priority === 'medium' ? 'bg-warning/5' : ''
                        )
                      : "border-muted-foreground/30"
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <span className="text-[10px] mt-1 hidden sm:block truncate max-w-[60px]">
                  {step.shortTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Context Banner */}
      {contextLabels.length > 0 && !isSummaryStep && (
        <div className="mb-6 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3 flex-wrap">
          <Zap className="w-5 h-5 text-primary" />
          <span className="text-sm">Contextos aplicados:</span>
          {contextLabels.map((label, i) => (
            <Badge key={i} variant="secondary" className="text-xs bg-primary/10">
              {label}
            </Badge>
          ))}
        </div>
      )}

      {/* Completion Counter */}
      {!isSummaryStep && completedCount > 0 && (
        <div className="mb-6 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-success" />
          <span className="text-sm">
            <strong>{completedCount}</strong> de {suggestedTests.length} testes completos
          </span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-card rounded-xl border p-6 mb-6 animate-fade-in">
        {isSummaryStep ? (
          <SegmentalTestsSummary 
            results={testResults} 
            tests={suggestedTests}
            groupedTests={groupedTests}
            prioritizedTests={prioritizationResult?.prioritizedTests}
          />
        ) : currentTest && currentTestPriority ? (
          <div className="space-y-4">
            {/* Priority Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-xs', priorityConfig[currentTestPriority.priority].className)}>
                {priorityConfig[currentTestPriority.priority].emoji} Prioridade {priorityConfig[currentTestPriority.priority].label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Score: {currentTestPriority.score} • {currentTestPriority.coveredCausesCount} causa(s)
              </span>
            </div>
            
            {/* Reasoning Chain */}
            <TestReasoningChainWithPriority 
              testId={currentTest.id}
              prioritizedTest={currentTestPriority}
              compensationIds={detectedCompensations}
              contextosAplicados={prioritizationResult?.contextosAplicados || []}
            />
            
            <AutoSegmentalTest
              test={currentTest}
              assessmentId={assessmentId}
              result={testResults[currentTest.id]}
              onUpdate={(result) => handleTestResult(currentTest.id, result)}
            />
          </div>
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
            <Button variant="ghost" onClick={handleSkip}>
              Pular Testes
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
                  Concluir Testes Segmentados
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