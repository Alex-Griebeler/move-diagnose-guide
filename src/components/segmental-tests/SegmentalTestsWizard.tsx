import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getSuggestedTests, groupTestsByRegion, SegmentalTest } from '@/data/segmentalTestMappings';
import { SegmentalTestForm } from './SegmentalTestForm';
import { SegmentalTestsSummary } from './SegmentalTestsSummary';

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
}

const STORAGE_KEY_PREFIX = 'segmental_tests_wizard';

export function SegmentalTestsWizard({ assessmentId, onComplete }: SegmentalTestsWizardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestedTests, setSuggestedTests] = useState<SegmentalTest[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [showSummary, setShowSummary] = useState(false);

  // Persist and restore step
  const [currentTestIndex, setCurrentTestIndex] = useState(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${assessmentId}_step`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Save step to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_${assessmentId}_step`, currentTestIndex.toString());
    } catch (e) {
      console.error('Error saving step:', e);
    }
  }, [currentTestIndex, assessmentId]);

  // Save results to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(testResults).length > 0) {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}_${assessmentId}_results`, JSON.stringify(testResults));
      } catch (e) {
        console.error('Error saving results:', e);
      }
    }
  }, [testResults, assessmentId]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_${assessmentId}_step`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}_${assessmentId}_results`);
    } catch (e) {
      console.error('Error clearing persisted data:', e);
    }
  }, [assessmentId]);

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
        // Extract from different views/sides
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
      const tests = getSuggestedTests(uniqueCompensations);
      setSuggestedTests(tests);

      // Try to restore saved results, otherwise initialize
      const savedResults = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${assessmentId}_results`);
      if (savedResults) {
        try {
          const parsed = JSON.parse(savedResults);
          setTestResults(parsed);
        } catch {
          initializeResults(tests);
        }
      } else {
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
    setTestResults(initialResults);
  };

  const handleTestResult = (testId: string, result: Partial<TestResult>) => {
    setTestResults(prev => ({
      ...prev,
      [testId]: { ...prev[testId], ...result },
    }));
  };

  const handleNext = () => {
    if (currentTestIndex < suggestedTests.length - 1) {
      setCurrentTestIndex(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handlePrevious = () => {
    if (showSummary) {
      setShowSummary(false);
    } else if (currentTestIndex > 0) {
      setCurrentTestIndex(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Prepare data for insertion
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Analisando compensações detectadas...</p>
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

  const progress = showSummary 
    ? 100 
    : ((currentTestIndex + 1) / suggestedTests.length) * 100;

  const groupedTests = groupTestsByRegion(suggestedTests);
  const currentTest = suggestedTests[currentTestIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Testes Segmentados Sugeridos</h3>
              <p className="text-sm text-muted-foreground">
                {suggestedTests.length} teste(s) sugerido(s) com base nas {' '}
                compensações detectadas nos testes globais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {showSummary ? 'Resumo' : `Teste ${currentTestIndex + 1} de ${suggestedTests.length}`}
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
      ) : (
        <SegmentalTestForm
          test={currentTest}
          result={testResults[currentTest.id]}
          onUpdate={(result) => handleTestResult(currentTest.id, result)}
        />
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentTestIndex === 0 && !showSummary}
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
