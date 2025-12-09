import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { getSuggestedTests, groupTestsByRegion, SegmentalTest, getTestById } from '@/data/segmentalTestMappings';
import { AutoSegmentalTest } from './AutoSegmentalTest';
import { SegmentalTestsSummary } from './SegmentalTestsSummary';
import { TestReasoningChain } from './TestReasoningChain';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { compensacaoCausas } from '@/data/weightEngine';
import { causaToTests } from '@/data/causaTestMappings';

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
  const [suggestedTests, setSuggestedTests] = useState<SegmentalTest[]>([]);
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

  const { testResults, showSummary } = wizardData;

  useEffect(() => {
    fetchGlobalTestResults();
  }, [assessmentId]);

  const fetchGlobalTestResults = async () => {
    try {
      const { data: globalResults, error } = await supabase
        .from('global_test_results')
        .select('*')
        .eq('assessment_id', assessmentId);

      if (error) throw error;

      // Extract all compensation IDs from global tests
      const allCompensations: string[] = [];
      
      globalResults?.forEach(result => {
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

      // Get unique suggested tests
      const uniqueCompensations = [...new Set(allCompensations)];
      setDetectedCompensations(uniqueCompensations);
      const tests = getSuggestedTests(uniqueCompensations);
      setSuggestedTests(tests);

      // ============================================
      // LOGGING DETALHADO: Cadeia de Raciocínio
      // Compensação → Causas → Testes Sugeridos
      // ============================================
      console.group('[FABRIK] Cadeia de Raciocínio - Testes Segmentados');
      console.log('📊 Compensações detectadas:', uniqueCompensations);
      
      // Build detailed reasoning chain
      const reasoningChain: Record<string, { causas: string[]; testes: string[] }> = {};
      
      uniqueCompensations.forEach(compId => {
        const causas = compensacaoCausas[compId] || [];
        const causaIds = causas.map(c => c.id);
        
        // Find tests triggered by these causes
        const testesFromCausas = new Set<string>();
        causaIds.forEach(causaId => {
          const testsForCausa = causaToTests[causaId] || [];
          testsForCausa.forEach(t => testesFromCausas.add(t));
        });
        
        reasoningChain[compId] = {
          causas: causas.map(c => `${c.label} (${c.id})`),
          testes: Array.from(testesFromCausas),
        };
      });

      console.log('🔗 Cadeia Completa:');
      Object.entries(reasoningChain).forEach(([compId, chain]) => {
        console.group(`  Compensação: ${compId}`);
        console.log('    → Causas prováveis:', chain.causas);
        console.log('    → Testes indicados:', chain.testes);
        console.groupEnd();
      });

      console.log('✅ Testes Sugeridos Finais:', tests.map(t => `${t.name} (${t.id})`));
      console.groupEnd();
      // ============================================

      // Initialize results if empty
      if (Object.keys(testResults).length === 0) {
        initializeResults(tests);
      }
    } catch (error) {
      console.error('Error fetching global test results:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Testes Segmentados Automatizados</h3>
              <p className="text-sm text-muted-foreground">
                {suggestedTests.length} teste(s) sugerido(s) • {completedCount} completo(s) • 
                Capture fotos para análise por IA
              </p>
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
        <SegmentalTestsSummary 
          results={testResults} 
          tests={suggestedTests}
          groupedTests={groupedTests}
        />
      ) : currentTest ? (
        <div className="space-y-4">
          {/* Reasoning Chain - Why this test was suggested */}
          <TestReasoningChain 
            testId={currentTest.id} 
            compensationIds={detectedCompensations} 
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
