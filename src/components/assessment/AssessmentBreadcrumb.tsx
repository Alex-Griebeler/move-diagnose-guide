import { ChevronRight, Home, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Step = 'select-student' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

interface AssessmentBreadcrumbProps {
  currentStep: Step;
  studentName?: string;
}

const stepLabels: Record<Step, string> = {
  'select-student': 'Aluno',
  'anamnesis': 'Anamnese',
  'global-tests': 'Testes Globais',
  'segmental-tests': 'Testes Segmentados',
  'protocol': 'Protocolo',
};

// Steps that appear in the progress indicator (excluding select-student)
const progressSteps: Step[] = ['anamnesis', 'global-tests', 'segmental-tests', 'protocol'];

export function AssessmentBreadcrumb({ currentStep, studentName }: AssessmentBreadcrumbProps) {
  const currentIndex = progressSteps.indexOf(currentStep);

  return (
    <nav className="space-y-3">
      {/* Line 1: Location breadcrumb */}
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
        
        {studentName && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium truncate max-w-[200px]" title={studentName}>
              {studentName}
            </span>
          </>
        )}
      </div>
      
      {/* Line 2: Progress steps */}
      {currentStep !== 'select-student' && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {progressSteps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div key={step} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                    isCompleted && "bg-primary/10 text-primary",
                    isCurrent && "bg-primary text-primary-foreground",
                    isFuture && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted && <Check className="w-3 h-3" />}
                  <span>{stepLabels[step]}</span>
                </div>
                
                {/* Connector between steps */}
                {index < progressSteps.length - 1 && (
                  <div 
                    className={cn(
                      "w-4 h-px mx-1",
                      index < currentIndex ? "bg-primary/30" : "bg-border"
                    )} 
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
