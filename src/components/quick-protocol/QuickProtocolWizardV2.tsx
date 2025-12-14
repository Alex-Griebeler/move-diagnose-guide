/**
 * Quick Protocol Wizard V2 - Novo Fluxo com IA
 * 
 * Fluxo principal (knee_pain):
 * 1. Intro → SideSelection → MovementCapture → AIResult → ConfirmatoryTests → Result → Retest
 * 
 * Fallback manual:
 * 1. Intro → SideSelection → FixedTests → Result → Retest
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
import { QuickProtocolSideSelector } from './QuickProtocolSideSelector';
import { QuickProtocolMovementCapture } from './QuickProtocolMovementCapture';
import { QuickProtocolAIResult } from './QuickProtocolAIResult';
import { QuickProtocolConfirmatoryTests } from './QuickProtocolConfirmatoryTests';
import { QuickProtocolTest } from './QuickProtocolTest';
import { QuickProtocolResult } from './QuickProtocolResult';
import { QuickProtocolRetest } from './QuickProtocolRetest';

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
  DecisionResult,
  FindingSide,
  DeficitType
} from '@/lib/quickProtocolEngine';
import {
  KneeRelevantCompensation,
  KneeDeficitHypothesis,
  selectConfirmatoryTests,
  generateHypothesisExplanation,
  ConfirmatoryTest,
  KNEE_CONFIRMATORY_TESTS
} from '@/lib/kneeCompensationMappings';

const logger = createLogger('QuickProtocolWizardV2');

type WizardStep = 
  | 'intro' 
  | 'side_selection' 
  | 'movement_capture'  // Novo: captura de vídeo
  | 'ai_result'         // Novo: resultado da IA
  | 'confirmatory'      // Novo: testes confirmatórios
  | 'test'              // Fallback: testes fixos
  | 'result' 
  | 'retest' 
  | 'complete';

type AffectedSide = 'left' | 'right' | 'bilateral';
type FlowMode = 'ai' | 'manual';

interface QuickProtocolWizardV2Props {
  studentId: string;
  studentName?: string;
  assessmentId?: string | null;
  protocolType: ProtocolType;
  onComplete?: () => void;
  onClose?: () => void;
}

export function QuickProtocolWizardV2({ 
  studentId, 
  studentName,
  assessmentId = null,
  protocolType,
  onComplete,
  onClose 
}: QuickProtocolWizardV2Props) {
  // Core state
  const [step, setStep] = useState<WizardStep>('intro');
  const [flowMode, setFlowMode] = useState<FlowMode>('ai');
  const [affectedSide, setAffectedSide] = useState<AffectedSide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI flow state
  const [detectedCompensations, setDetectedCompensations] = useState<KneeRelevantCompensation[]>([]);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [suggestedTests, setSuggestedTests] = useState<ConfirmatoryTest[]>([]);
  const [hypothesisExplanation, setHypothesisExplanation] = useState('');

  // Test results state
  const [testResults, setTestResults] = useState<QuickProtocolTestResults>({});
  const [confirmedDeficit, setConfirmedDeficit] = useState<KneeDeficitHypothesis | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);

  // Manual flow state
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const protocolTests = getTestsForProtocol(protocolType);
  const protocolMeta = getProtocolMeta(protocolType);
  const totalTests = protocolTests.length;
  const currentTest = protocolTests[currentTestIndex];

  // Check if AI flow is available (only for knee_pain for now)
  const isAIFlowAvailable = protocolType === 'knee_pain';

  // Create session on side selection
  const handleSideSelected = async (side: AffectedSide) => {
    setAffectedSide(side);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
      
      // Go to AI flow if available, otherwise manual
      if (isAIFlowAvailable && flowMode === 'ai') {
        setStep('movement_capture');
      } else {
        setStep('test');
      }
    } catch (error) {
      logger.error('Error starting session', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar',
        description: 'Não foi possível iniciar o protocolo.',
      });
    }
  };

  // Handle AI analysis complete
  const handleMovementAnalysisComplete = (result: {
    compensations: KneeRelevantCompensation[];
    confidence: number;
    notes: string;
  }) => {
    setDetectedCompensations(result.compensations);
    setAiConfidence(result.confidence);

    // Select confirmatory tests based on compensations
    const tests = selectConfirmatoryTests(result.compensations);
    setSuggestedTests(tests);
    setHypothesisExplanation(generateHypothesisExplanation(result.compensations));

    setStep('ai_result');
  };

  // Skip AI flow and go to manual
  const handleSkipAI = () => {
    setFlowMode('manual');
    setStep('test');
  };

  // Continue from AI result to confirmatory tests
  const handleContinueToConfirmatory = () => {
    if (suggestedTests.length > 0) {
      setStep('confirmatory');
    } else {
      // No tests needed, generate result based on AI
      generateAIBasedResult();
    }
  };

  // Generate result based on AI analysis only
  const generateAIBasedResult = () => {
    // Map compensations to deficit type
    const compensationToDeficit: Record<string, DeficitType> = {
      ankle_mobility: 'ankle_mobility_deficit',
      hip_mobility: 'hip_mobility_deficit',
      hip_stability: 'hip_stability_deficit',
      ankle_stability: 'ankle_stability_deficit',
      motor_control: 'motor_control_deficit',
    };

    // Use calculated decision
    const decision = calculateDecision({}, protocolType, affectedSide || undefined);
    setDecisionResult(decision);
    setStep('result');
  };

  // Handle confirmatory tests complete
  const handleConfirmatoryComplete = (
    results: Array<{ testId: string; confirmedHypothesis: KneeDeficitHypothesis | null; findingSide?: FindingSide }>,
    deficit: KneeDeficitHypothesis | null
  ) => {
    setConfirmedDeficit(deficit);

    // Convert to QuickProtocolTestResults format
    const convertedResults: QuickProtocolTestResults = {};
    for (const r of results) {
      convertedResults[r.testId] = {
        testId: r.testId as any,
        isPositive: !!r.confirmedHypothesis,
        hasPain: false,
        findingSide: r.findingSide,
      };
    }
    setTestResults(convertedResults);

    // Generate decision based on confirmed deficit
    const decision = calculateDecision(convertedResults, protocolType, affectedSide || undefined);
    setDecisionResult(decision);
    setStep('result');
  };

  // Manual flow handlers
  const handleTestResult = (result: TestResult) => {
    setTestResults(prev => ({
      ...prev,
      [result.testId]: result,
    }));
  };

  const handleNextTest = () => {
    const currentResult = testResults[currentTest.id];
    const requiresFindingSide = currentTest.isBilateral && currentResult?.isPositive && !currentResult.findingSide;

    if (requiresFindingSide) {
      toast({
        variant: 'default',
        title: 'Selecione o lado do achado',
      });
      return;
    }

    if (currentTestIndex < totalTests - 1) {
      setCurrentTestIndex(prev => prev + 1);
    } else {
      const decision = calculateDecision(testResults, protocolType, affectedSide || undefined);
      setDecisionResult(decision);
      setStep('result');
    }
  };

  const handlePreviousTest = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(prev => prev - 1);
    }
  };

  // Result handlers
  const handleRetest = () => setStep('retest');

  const handleRetestComplete = async (result: string, feedback?: string) => {
    await saveSession(result, feedback);
  };

  const handleCloseResult = async () => {
    await saveSession();
  };

  const saveSession = async (retestResult?: string, retestFeedback?: string) => {
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

      toast({ title: 'Avaliação concluída!' });
      setStep('complete');
      onComplete?.();
      
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 1500);

    } catch (error) {
      logger.error('Error saving session', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar' });
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

  const getSideLabel = (side: AffectedSide | null): string => {
    if (!side) return '';
    return { left: 'Esquerdo', right: 'Direito', bilateral: 'Bilateral' }[side];
  };

  // Render content based on step
  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <QuickProtocolIntro
            protocolType={protocolType}
            onStart={() => setStep('side_selection')}
            hasPriorAssessment={!!assessmentId}
            priorDeficits={[]}
          />
        );

      case 'side_selection':
        return (
          <QuickProtocolSideSelector
            protocolType={protocolType}
            onSelect={handleSideSelected}
          />
        );

      case 'movement_capture':
        return (
          <QuickProtocolMovementCapture
            assessmentId={assessmentId || sessionId || ''}
            affectedSide={affectedSide!}
            onAnalysisComplete={handleMovementAnalysisComplete}
            onSkip={handleSkipAI}
          />
        );

      case 'ai_result':
        return (
          <QuickProtocolAIResult
            compensations={detectedCompensations}
            confidence={aiConfidence}
            suggestedTests={suggestedTests}
            hypothesisExplanation={hypothesisExplanation}
            onContinue={handleContinueToConfirmatory}
            onBack={() => setStep('movement_capture')}
          />
        );

      case 'confirmatory':
        return (
          <QuickProtocolConfirmatoryTests
            tests={suggestedTests}
            hypothesis={hypothesisExplanation}
            onComplete={handleConfirmatoryComplete}
            onBack={() => setStep('ai_result')}
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
            onSkip={() => saveSession()}
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

  // Calculate progress
  const getProgress = (): number => {
    if (step === 'test') return ((currentTestIndex + 1) / totalTests) * 100;
    if (step === 'movement_capture') return 25;
    if (step === 'ai_result') return 50;
    if (step === 'confirmatory') return 75;
    return 0;
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
                {flowMode === 'ai' && step !== 'intro' && step !== 'side_selection' && (
                  <>
                    <span>•</span>
                    <span className="text-primary">IA</span>
                  </>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress bar */}
          {['movement_capture', 'ai_result', 'confirmatory', 'test'].includes(step) && (
            <div className="px-4 pb-3">
              <div className="max-w-2xl mx-auto">
                <Progress value={getProgress()} className="h-1.5" />
              </div>
            </div>
          )}
        </header>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Navigation Footer (only during manual tests) */}
      {step === 'test' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t">
          <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between">
            <Button variant="outline" onClick={handlePreviousTest} disabled={currentTestIndex === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button onClick={handleNextTest}>
              {currentTestIndex === totalTests - 1 ? 'Ver Resultado' : 'Próximo'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
