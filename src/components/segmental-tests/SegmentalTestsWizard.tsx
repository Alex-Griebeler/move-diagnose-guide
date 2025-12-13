import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Loader2, AlertCircle, Target } from 'lucide-react';
import { groupTestsByRegion, SegmentalTest } from '@/data/segmentalTestMappings';
import { AutoSegmentalTest } from './AutoSegmentalTest';
import { SegmentalTestsSummary } from './SegmentalTestsSummary';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { 
  getSuggestedTestsWithPriority, 
  TestPrioritizationResult,
} from '@/lib/testPrioritization';
import { Anamnese } from '@/lib/priorityEngine';
import { DetectedCompensation } from '@/lib/attentionPointsEngine';
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

// Helper to determine test type from test_name
function getTestTypeFromName(testName: string): 'ohs' | 'sls' | 'pushup' {
  const name = testName.toLowerCase();
  if (name.includes('overhead') || name.includes('ohs')) return 'ohs';
  if (name.includes('single') || name.includes('sls')) return 'sls';
  if (name.includes('push')) return 'pushup';
  return 'ohs';
}

// Helper to determine view from column name
function getViewFromColumn(column: string): string {
  if (column.includes('anterior')) return 'anterior';
  if (column.includes('lateral')) return 'lateral';
  if (column.includes('posterior')) return 'posterior';
  if (column.includes('left')) return 'left';
  if (column.includes('right')) return 'right';
  return column;
}

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

      // NEW: Collect compensations with details (test type, view) for frequency calculation
      const allCompensations: string[] = [];
      const detailedCompensations: DetectedCompensation[] = [];
      
      globalResultsResponse.data?.forEach(result => {
        const testType = getTestTypeFromName(result.test_name);
        const views = ['anterior_view', 'lateral_view', 'posterior_view', 'left_side', 'right_side'];
        
        views.forEach(viewColumn => {
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
                  side: viewColumn.includes('left') ? 'left' : 
                        viewColumn.includes('right') ? 'right' : undefined,
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

      // NEW: Pass detailed compensations for frequency calculation
      const result = getSuggestedTestsWithPriority(uniqueCompensations, anamnese, 5, {
        useAttentionPoints: true,
        maxAttentionPoints: 2,
        detectedCompensationsWithDetails: detailedCompensations,
      });
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

  const getCompletedCount = (): number => {
    return Object.keys(testResults).filter(testId => isTestCompleted(testId)).length;
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
  const completedCount = getCompletedCount();

  // Build steps array like global tests
  const steps = [
    ...suggestedTests.map((test, i) => ({
      id: i + 1,
      title: test.name,
      shortTitle: test.name.length > 12 ? test.name.substring(0, 10) + '...' : test.name,
      icon: '🔬',
      testId: test.id,
    })),
    { id: totalSteps, title: 'Resumo', shortTitle: 'Resumo', icon: '📊', testId: null },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header - Same as Global Tests */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h2 className="text-lg font-semibold flex items-center gap-2 cursor-help hover:text-foreground/80 transition-colors">
                  <span>{steps[currentStep - 1].icon}</span>
                  {steps[currentStep - 1].title}
                </h2>
              </TooltipTrigger>
              {!isSummaryStep && currentTest?.description && (
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>{currentTest.description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators - Same as Global Tests */}
        <div className="flex justify-between mt-4 overflow-x-auto pb-2">
          {steps.map((step) => {
            const isCompleted = step.testId ? isTestCompleted(step.testId) : false;
            const isCurrent = step.id === currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "flex flex-col items-center min-w-[60px] transition-colors shrink-0",
                  isCurrent
                    ? "text-accent"
                    : isCompleted
                    ? "text-success"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all",
                    isCurrent
                      ? "border-accent bg-accent text-accent-foreground"
                      : isCompleted
                      ? "border-success bg-success text-success-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <span className="text-xs mt-1 hidden sm:block text-center max-w-[60px] truncate">
                  {step.shortTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* NEW: Attention Points Banner */}
      {prioritizationResult?.attentionPointsApplied && prioritizationResult.attentionPoints && currentStep === 1 && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Pontos de Atenção Identificados
              </p>
              <div className="flex flex-wrap gap-2">
                {prioritizationResult.attentionPoints.map((ap, i) => (
                  <span
                    key={ap.compensationId}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {ap.label}
                    {ap.frequencyScore > 1 && (
                      <span className="ml-1 opacity-70">×{ap.frequencyScore}</span>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Testes focados nestas {prioritizationResult.attentionPoints.length} compensações mais acentuadas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Counter - Same style as Global Tests */}
      {currentStep < totalSteps && completedCount > 0 && (
        <div className="mb-6 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-success" />
          <span className="text-sm">
            <strong>{completedCount}</strong> de {suggestedTests.length} testes concluídos
          </span>
        </div>
      )}

      {/* Step Content - Card wrapper like Global Tests */}
      <div className="bg-card rounded-xl border p-6 mb-6 animate-fade-in">
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

      {/* Navigation - Same as Global Tests */}
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
