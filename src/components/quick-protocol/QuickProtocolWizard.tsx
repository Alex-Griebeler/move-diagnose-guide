/**
 * Quick Protocol Wizard - Main Component
 * Wizard principal do Protocolo Rápido FABRIK
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { createLogger } from '@/lib/logger';

import { QuickProtocolIntro } from './QuickProtocolIntro';
import { QuickProtocolTest } from './QuickProtocolTest';
import { QuickProtocolResult } from './QuickProtocolResult';
import { QuickProtocolRetest } from './QuickProtocolRetest';
import { QuickProtocolSideSelector } from './QuickProtocolSideSelector';

import { 
  ProtocolType,
  RETEST_OPTIONS, 
  getTestsForProtocol,
  getProtocolMeta
} from '@/data/quickProtocolMappings';
import { 
  calculateDecision,
  QuickProtocolTestResults,
  TestResult,
  DecisionResult
} from '@/lib/quickProtocolEngine';

const logger = createLogger('QuickProtocolWizard');

type WizardStep = 'intro' | 'side_selection' | 'test' | 'result' | 'retest' | 'complete';
type AffectedSide = 'left' | 'right' | 'bilateral';

interface QuickProtocolWizardProps {
  studentId: string;
  studentName?: string;
  assessmentId?: string | null;
  protocolType: ProtocolType;
  onComplete?: () => void;
  onClose?: () => void;
}

export function QuickProtocolWizard({ 
  studentId, 
  studentName,
  assessmentId = null,
  protocolType,
  onComplete,
  onClose 
}: QuickProtocolWizardProps) {
  const [step, setStep] = useState<WizardStep>('intro');
  const [affectedSide, setAffectedSide] = useState<AffectedSide | null>(null);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testResults, setTestResults] = useState<QuickProtocolTestResults>({});
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priorDeficits, setPriorDeficits] = useState<string[]>([]);

  const { toast } = useToast();
  const navigate = useNavigate();

  const protocolTests = getTestsForProtocol(protocolType);
  const protocolMeta = getProtocolMeta(protocolType);
  const totalTests = protocolTests.length;
  const currentTest = protocolTests[currentTestIndex];
  const progress = step === 'test' ? ((currentTestIndex + 1) / totalTests) * 100 : 0;

  // Check for prior assessment data
  useEffect(() => {
    if (assessmentId) {
      loadPriorAssessmentContext();
    }
  }, [assessmentId]);

  const loadPriorAssessmentContext = async () => {
    if (!assessmentId) return;

    try {
      const { data: findings } = await supabase
        .from('functional_findings')
        .select('classification_tag, body_region')
        .eq('assessment_id', assessmentId);

      if (findings && findings.length > 0) {
        // Extract relevant deficits for context
        const relevantTags = findings
          .filter(f => 
            f.body_region === 'hip' || 
            f.body_region === 'knee' || 
            f.body_region === 'ankle' ||
            f.body_region === 'shoulder' ||
            f.body_region === 'lumbar'
          )
          .map(f => f.classification_tag);
        
        setPriorDeficits([...new Set(relevantTags)]);
      }
    } catch (error) {
      logger.error('Error loading prior assessment', error);
    }
  };

  const handleStart = () => {
    // Go to side selection before starting tests
    setStep('side_selection');
  };

  const handleSideSelected = async (side: AffectedSide) => {
    setAffectedSide(side);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create session in database with affected side
      const { data: session, error } = await supabase
        .from('quick_protocol_sessions')
        .insert({
          student_id: studentId,
          professional_id: user.id,
          assessment_id: assessmentId,
          protocol_type: protocolType,
          status: 'in_progress',
          test_results: {},
          affected_side: side,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(session.id);
      setStep('test');
    } catch (error) {
      logger.error('Error starting session', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar',
        description: 'Não foi possível iniciar o protocolo. Tente novamente.',
      });
    }
  };

  const handleTestResult = (result: TestResult) => {
    setTestResults(prev => ({
      ...prev,
      [result.testId]: result,
    }));
  };

  const handleNextTest = () => {
    if (currentTestIndex < totalTests - 1) {
      setCurrentTestIndex(prev => prev + 1);
    } else {
      // All tests complete, calculate decision
      const decision = calculateDecision(testResults, protocolType);
      setDecisionResult(decision);
      setStep('result');
    }
  };

  const handlePreviousTest = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(prev => prev - 1);
    }
  };

  const handleRetest = () => {
    setStep('retest');
  };

  const handleRetestComplete = async (
    result: typeof RETEST_OPTIONS[number]['id'], 
    feedback?: string
  ) => {
    await saveSession(result, feedback);
  };

  const handleSkipRetest = async () => {
    await saveSession();
  };

  const handleCloseResult = async () => {
    await saveSession();
  };

  const saveSession = async (
    retestResult?: string, 
    retestFeedback?: string
  ) => {
    if (!sessionId || !decisionResult) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('quick_protocol_sessions')
        .update({
          status: 'completed',
          test_results: JSON.parse(JSON.stringify(testResults)),
          primary_deficit: decisionResult.primary,
          secondary_deficits: JSON.parse(JSON.stringify(decisionResult.secondary)),
          intervention_applied: JSON.parse(JSON.stringify(decisionResult.interventions)),
          retest_result: retestResult || null,
          retest_feedback: retestFeedback || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Avaliação concluída!',
        description: 'Os resultados foram salvos com sucesso.',
      });

      setStep('complete');
      onComplete?.();
      
      // Navigate back after short delay
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 1500);

    } catch (error) {
      logger.error('Error saving session', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os resultados.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/dashboard');
    }
  };

  // Get side label for display
  const getSideLabel = (side: AffectedSide | null): string => {
    if (!side) return '';
    const labels: Record<AffectedSide, string> = {
      left: 'Esquerdo',
      right: 'Direito',
      bilateral: 'Bilateral'
    };
    return labels[side];
  };

  // Render based on step
  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <QuickProtocolIntro
            protocolType={protocolType}
            onStart={handleStart}
            hasPriorAssessment={!!assessmentId}
            priorDeficits={priorDeficits}
          />
        );

      case 'side_selection':
        return (
          <QuickProtocolSideSelector
            protocolType={protocolType}
            onSelect={handleSideSelected}
          />
        );

      case 'test':
        return (
          <QuickProtocolTest
            test={currentTest}
            value={testResults[currentTest.id]}
            onChange={handleTestResult}
          />
        );

      case 'result':
        return decisionResult ? (
          <QuickProtocolResult
            result={decisionResult}
            onRetest={handleRetest}
            onClose={handleCloseResult}
          />
        ) : null;

      case 'retest':
        return (
          <QuickProtocolRetest
            onComplete={handleRetestComplete}
            onSkip={handleSkipRetest}
          />
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6 animate-scale-in">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-display mb-2">Concluído!</h2>
            <p className="text-muted-foreground">Redirecionando...</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {step !== 'complete' && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-medium">{protocolMeta.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {studentName && <span>{studentName}</span>}
                {affectedSide && (
                  <>
                    <span>•</span>
                    <span>Lado {getSideLabel(affectedSide)}</span>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress bar (only during tests) */}
          {step === 'test' && (
            <div className="px-4 pb-3">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Teste {currentTestIndex + 1} de {totalTests}</span>
                  <span>{currentTest.name}</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </div>
          )}
        </header>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Navigation Footer (only during tests) */}
      {step === 'test' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t">
          <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousTest}
              disabled={currentTestIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>

            <Button onClick={handleNextTest}>
              {currentTestIndex === totalTests - 1 ? (
                'Ver Resultado'
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
