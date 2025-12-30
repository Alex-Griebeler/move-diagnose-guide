import { ChevronRight, Home, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Step = 'select-student' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

interface AssessmentBreadcrumbProps {
  currentStep: Step;
  studentName?: string;
  onNavigateToStep?: (step: Step) => void;
}

const stepLabels: Record<Step, string> = {
  'select-student': 'Aluno',
  'anamnesis': 'Anamnese',
  'global-tests': 'Globais',
  'segmental-tests': 'Segmentados',
  'protocol': 'Protocolo',
};

const stepOrder: Step[] = ['select-student', 'anamnesis', 'global-tests', 'segmental-tests', 'protocol'];

export function AssessmentBreadcrumb({ currentStep, studentName, onNavigateToStep }: AssessmentBreadcrumbProps) {
  const currentIndex = stepOrder.indexOf(currentStep);

  const handleStepClick = (step: Step, index: number) => {
    // Só permite navegar para etapas anteriores à atual
    if (index < currentIndex && onNavigateToStep) {
      onNavigateToStep(step);
    }
  };

  return (
    <nav className="flex flex-col gap-3">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-muted-foreground">Avaliação</span>
        
        {studentName && currentStep !== 'select-student' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium truncate max-w-[150px]" title={studentName}>
              {studentName}
            </span>
          </>
        )}
      </div>

      {/* Step progress indicators - só mostra após selecionar aluno */}
      {currentStep !== 'select-student' && (
        <div className="flex items-center gap-1">
          {stepOrder.slice(1).map((step, index) => {
            const stepIndex = index + 1; // +1 porque pulamos 'select-student'
            const isCompleted = stepIndex < currentIndex;
            const isCurrent = stepIndex === currentIndex;
            const isClickable = isCompleted && onNavigateToStep;

            return (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step, stepIndex)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                    isCompleted && "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                    isCurrent && "bg-foreground text-background",
                    !isCompleted && !isCurrent && "bg-muted/50 text-muted-foreground/50",
                    !isClickable && "cursor-default"
                  )}
                  title={isClickable ? `Voltar para ${stepLabels[step]}` : stepLabels[step]}
                >
                  {isCompleted && <Check className="w-3 h-3" />}
                  <span>{stepLabels[step]}</span>
                </button>
                
                {index < stepOrder.length - 2 && (
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 mx-0.5",
                    stepIndex < currentIndex ? "text-primary/50" : "text-muted-foreground/30"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
