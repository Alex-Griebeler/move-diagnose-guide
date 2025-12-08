import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import { OverheadSquatTest } from './tests/OverheadSquatTest';
import { SingleLegSquatTest } from './tests/SingleLegSquatTest';
import { PushupTest } from './tests/PushupTest';
import { TestSummary } from './TestSummary';

export interface GlobalTestData {
  ohs: {
    anteriorView: string[];
    lateralView: string[];
    posteriorView: string[];
    notes: string;
  };
  sls: {
    leftSide: string[];
    rightSide: string[];
    notes: string;
  };
  pushup: {
    compensations: string[];
    notes: string;
  };
}

const initialData: GlobalTestData = {
  ohs: {
    anteriorView: [],
    lateralView: [],
    posteriorView: [],
    notes: '',
  },
  sls: {
    leftSide: [],
    rightSide: [],
    notes: '',
  },
  pushup: {
    compensations: [],
    notes: '',
  },
};

const steps = [
  { id: 1, title: 'Overhead Squat', shortTitle: 'OHS', icon: '🏋️' },
  { id: 2, title: 'Single-Leg Squat', shortTitle: 'SLS', icon: '🦵' },
  { id: 3, title: 'Push-up Test', shortTitle: 'Push-up', icon: '💪' },
  { id: 4, title: 'Resumo', shortTitle: 'Resumo', icon: '📊' },
];

interface GlobalTestsWizardProps {
  assessmentId: string;
  onComplete: () => void;
}

export function GlobalTestsWizard({ assessmentId, onComplete }: GlobalTestsWizardProps) {
  const {
    data,
    updateData,
    currentStep,
    setCurrentStep,
    clearPersistedData,
  } = useWizardPersistence<GlobalTestData>({
    key: 'global_tests_wizard',
    initialData,
    assessmentId,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Save OHS results
      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'ohs',
        anterior_view: { compensations: data.ohs.anteriorView },
        lateral_view: { compensations: data.ohs.lateralView },
        posterior_view: { compensations: data.ohs.posteriorView },
        notes: data.ohs.notes || null,
      });

      // Save SLS results
      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'sls',
        left_side: { compensations: data.sls.leftSide },
        right_side: { compensations: data.sls.rightSide },
        notes: data.sls.notes || null,
      });

      // Save Push-up results
      await supabase.from('global_test_results').insert({
        assessment_id: assessmentId,
        test_name: 'pushup',
        anterior_view: { compensations: data.pushup.compensations },
        notes: data.pushup.notes || null,
      });

      // Update assessment status
      await supabase
        .from('assessments')
        .update({ status: 'in_progress' })
        .eq('id', assessmentId);

      // Clear persisted data after successful save
      clearPersistedData();

      toast({
        title: 'Testes globais salvos!',
        description: 'Os resultados foram registrados. Próximo: Testes Segmentados.',
      });

      onComplete();
    } catch (error) {
      console.error('Error saving global tests:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os testes. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 4) * 100;

  const getTotalCompensations = () => {
    return (
      data.ohs.anteriorView.length +
      data.ohs.lateralView.length +
      data.ohs.posteriorView.length +
      data.sls.leftSide.length +
      data.sls.rightSide.length +
      data.pushup.compensations.length
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <OverheadSquatTest data={data.ohs} updateData={(ohs) => updateData({ ohs })} />;
      case 2:
        return <SingleLegSquatTest data={data.sls} updateData={(sls) => updateData({ sls })} />;
      case 3:
        return <PushupTest data={data.pushup} updateData={(pushup) => updateData({ pushup })} />;
      case 4:
        return <TestSummary data={data} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{steps[currentStep - 1].icon}</span>
            {steps[currentStep - 1].title}
          </h2>
          <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de 4
          </span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {steps.map((step) => (
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
      {currentStep < 4 && getTotalCompensations() > 0 && (
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

        {currentStep < 4 ? (
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
