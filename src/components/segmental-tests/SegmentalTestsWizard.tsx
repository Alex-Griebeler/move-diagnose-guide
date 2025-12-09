import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Sparkles, ChevronDown, ChevronUp, Zap } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  showSummary: boolean;
}

const initialWizardData: WizardData = {
  testResults: {},
  showSummary: false,
};

export function SegmentalTestsWizard({ assessmentId, onComplete }: SegmentalTestsWizardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prioritizationResult, setPrioritizationResult] = useState<TestPrioritizationResult | null>(null);
  const [detectedCompensations, setDetectedCompensations] = useState<string[]>([]);
  const [showAdditionalTests, setShowAdditionalTests] = useState(false);
  
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

  // Get prioritized tests
  const suggestedTests = prioritizationResult?.prioritizedTests.map(p => p.test) || [];
  const prioritizedTestsMap = new Map(
    prioritizationResult?.prioritizedTests.map(p => [p.test.id, p]) || []
  );

  const { testResults, showSummary } = wizardData;

  useEffect(() => {
    fetchGlobalTestResults();
  }, [assessmentId]);

  const fetchGlobalTestResults = async () => {
    try {
      // Fetch global test results and anamnesis in parallel
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

      // Extract all compensation IDs from global tests
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

      // Build anamnese object for priority engine
      const anamnesisData = anamnesisResponse.data;
      const anamnese: Anamnese = {
        painHistory: anamnesisData?.pain_history as Array<{ region: string; intensity: number }> || [],
        sports: anamnesisData?.sports as Array<{ name: string }> || [],
        activityTypes: anamnesisData?.activity_types as string[] || [],
        sedentaryHoursPerDay: anamnesisData?.sedentary_hours_per_day || undefined,
        sleepQuality: anamnesisData?.sleep_quality || undefined,
        objectives: anamnesisData?.objectives || undefined,
      };

      // Use prioritization engine instead of simple getSuggestedTests
      const result = getSuggestedTestsWithPriority(uniqueCompensations, anamnese);
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
    if (currentStep < suggestedTests.length) {
      setCurrentStep(currentStep + 1);
    } else {
      updateData({ showSummary: true });
    }
  };

  const handlePrevious = () => {
    if (showSummary) {
      updateData({ showSummary: false });
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const collectMediaUrls = (result: TestResult): string[] => {
    const urls: string[] = [];
    if (result.mediaUrls?.photoUrl) urls.push(result.mediaUrls.photoUrl);
    if (result.mediaUrls?.videoUrl) urls.push(result.mediaUrls.videoUrl);
    return urls;
  };

  const handleSave = async () => {
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
    toast.info('Testes segmentados pulados');
    onComplete();
  };

  if (loading || isLoadingPersistence) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            {isLoadingPersistence ? 'Carregando dados salvos...' : 'Analisando compensações detectadas...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (suggestedTests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum teste segmentado sugerido</h3>
          <p className="text-muted-foreground mb-6">
            Não foram detectadas compensações que exijam testes segmentados adicionais.
          </p>
          <Button onClick={onComplete}>
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // currentStep is 1-indexed, array is 0-indexed
  const currentTestIndex = currentStep - 1;
  const progress = showSummary 
    ? 100 
    : (currentStep / suggestedTests.length) * 100;

  const groupedTests = groupTestsByRegion(suggestedTests);
  const currentTest = suggestedTests[currentTestIndex];

  const completedCount = Object.values(testResults).filter(r => 
    r.passFailLeft !== null || r.passFailRight !== null || r.leftValue !== null || r.rightValue !== null
  ).length;

  const currentTestPriority = currentTest ? prioritizedTestsMap.get(currentTest.id) : null;
  const contextLabels = prioritizationResult ? getContextLabels(prioritizationResult.contextosAplicados) : [];

  return (
    <div className="space-y-6">
      {/* Header with Priority Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium">Testes Priorizados</h3>
                {prioritizationResult?.paretoApplied && (
                  <Badge variant="outline" className="text-xs bg-primary/10">
                    Pareto: {prioritizationResult.totalCausasAnalisadas} causas → {suggestedTests.length} testes
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Ordenados por impacto clínico (maior → menor)
              </p>
              
              {/* Applied Contexts */}
              {contextLabels.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Contextos que elevaram prioridade:</span>
                  {contextLabels.map((label, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-primary/10">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Priority Order Preview */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {prioritizationResult?.prioritizedTests.map((pt, i) => (
                  <div 
                    key={pt.test.id}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                      currentStep === i + 1 ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : '',
                      pt.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                      pt.priority === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    )}
                  >
                    <span className="font-bold">{i + 1}</span>
                    <span className="truncate max-w-[100px]">{pt.test.name.split(' ')[0]}</span>
                    <span className="opacity-70">({pt.score})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {showSummary ? 'Resumo' : `Teste ${currentStep} de ${suggestedTests.length}`}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      {showSummary ? (
        <div className="space-y-4">
          <SegmentalTestsSummary 
            results={testResults} 
            tests={suggestedTests}
            groupedTests={groupedTests}
            prioritizedTests={prioritizationResult?.prioritizedTests}
          />
          
          {/* Additional Tests Section */}
          {prioritizationResult?.additionalTests && prioritizationResult.additionalTests.length > 0 && (
            <Collapsible open={showAdditionalTests} onOpenChange={setShowAdditionalTests}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium">
                    Testes Adicionais ({prioritizationResult.additionalTests.length})
                  </span>
                  {showAdditionalTests ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 p-3 bg-muted/20 rounded-lg">
                  {prioritizationResult.additionalTests.map((pt) => (
                    <div key={pt.test.id} className="flex items-center justify-between text-sm">
                      <span>{pt.test.name}</span>
                      <Badge variant="outline" className={cn('text-xs', priorityConfig[pt.priority].className)}>
                        Score: {pt.score}
                      </Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    Estes testes têm menor prioridade baseado na análise de compensações e anamnese.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ) : currentTest && currentTestPriority ? (
        <div className="space-y-4">
          {/* Priority Badge */}
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', priorityConfig[currentTestPriority.priority].className)}>
              {priorityConfig[currentTestPriority.priority].emoji} Prioridade {priorityConfig[currentTestPriority.priority].label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Score: {currentTestPriority.score} • {currentTestPriority.coveredCausesCount} causa(s)
            </span>
          </div>
          
          {/* Reasoning Chain - Why this test was suggested */}
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

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 && !showSummary}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        <div className="flex gap-2">
          {!showSummary && (
            <Button variant="ghost" onClick={handleSkip}>
              Pular Testes
            </Button>
          )}

          {showSummary ? (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar e Continuar
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
