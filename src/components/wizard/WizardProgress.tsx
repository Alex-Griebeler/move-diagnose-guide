import { Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: number;
  title: string;
  shortTitle: string;
  icon: string;
}

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: WizardStep[];
  currentTitle: string;
  currentIcon: string;
  onStepClick: (stepId: number) => void;
  isStepCompleted: (step: WizardStep) => boolean;
  tooltip?: string;
}

export function WizardProgress({
  currentStep,
  totalSteps,
  steps,
  currentTitle,
  currentIcon,
  onStepClick,
  isStepCompleted,
  tooltip,
}: WizardProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h2 className="text-lg font-semibold flex items-center gap-2 cursor-help hover:text-foreground/80 transition-colors">
                <span>{currentIcon}</span>
                {currentTitle}
              </h2>
            </TooltipTrigger>
            {tooltip && (
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <span className="text-sm text-muted-foreground">
          Etapa {currentStep} de {totalSteps}
        </span>
      </div>
      <Progress value={progress} className="h-2" />

      {/* Step indicators */}
      <div className="flex justify-between mt-4 overflow-x-auto pb-2">
        {steps.map((step) => {
          const isCompleted = isStepCompleted(step);
          const isCurrent = step.id === currentStep;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
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
  );
}
