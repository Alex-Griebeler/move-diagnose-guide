import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

type Step = 'select-student' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

interface AssessmentBreadcrumbProps {
  currentStep: Step;
}

const stepLabels: Record<Step, string> = {
  'select-student': 'Selecionar Aluno',
  'anamnesis': 'Anamnese',
  'global-tests': 'Testes Globais',
  'segmental-tests': 'Testes Segmentados',
  'protocol': 'Protocolo',
};

const stepOrder: Step[] = ['select-student', 'anamnesis', 'global-tests', 'segmental-tests', 'protocol'];

export function AssessmentBreadcrumb({ currentStep }: AssessmentBreadcrumbProps) {
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <nav className="flex items-center gap-1.5 text-sm overflow-x-auto pb-1">
      <Link 
        to="/dashboard" 
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
      
      <span className="text-muted-foreground shrink-0">Avaliação</span>
      
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
      
      <span className="font-medium text-foreground shrink-0">
        {stepLabels[currentStep]}
      </span>
      
      {/* Step indicator pills */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        {stepOrder.slice(1).map((step, index) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-colors ${
              index < currentIndex
                ? 'bg-primary'
                : index === currentIndex - 1 || (currentStep === 'select-student' && index === 0)
                  ? 'bg-primary'
                  : 'bg-muted'
            }`}
            title={stepLabels[step]}
          />
        ))}
      </div>
    </nav>
  );
}
