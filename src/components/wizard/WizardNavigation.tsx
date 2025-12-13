import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onSkip?: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submitClassName?: string;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  onSkip,
  isSubmitting,
  submitLabel = 'Salvar Resultados',
  submitClassName,
}: WizardNavigationProps) {
  const isFinalStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1}
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Anterior
      </Button>

      <div className="flex gap-2">
        {!isFinalStep && onSkip && (
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Pular
          </Button>
        )}

        {isFinalStep ? (
          <Button onClick={onSubmit} disabled={isSubmitting} className={submitClassName}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {submitLabel}
                <Check className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button onClick={onNext}>
            Próximo
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
