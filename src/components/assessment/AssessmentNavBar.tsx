import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Step = 'select-student' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

interface AssessmentNavBarProps {
  currentStep: Step;
  studentName?: string;
  onGoBack?: () => void;
  canGoBack?: boolean;
}

const stepOrder: Step[] = ['select-student', 'anamnesis', 'global-tests', 'segmental-tests', 'protocol'];

const stepLabels: Record<Step, string> = {
  'select-student': 'Dashboard',
  'anamnesis': 'Anamnese',
  'global-tests': 'Globais',
  'segmental-tests': 'Segmentados',
  'protocol': 'Protocolo',
};

export function AssessmentNavBar({ 
  currentStep, 
  studentName,
  onGoBack,
  canGoBack = true,
}: AssessmentNavBarProps) {
  const navigate = useNavigate();
  const currentIndex = stepOrder.indexOf(currentStep);
  
  // Determine back label and action
  const getBackInfo = () => {
    if (currentIndex <= 1) {
      // At select-student or anamnesis (first real step) → go to Dashboard
      return { label: 'Dashboard', action: () => navigate('/dashboard') };
    }
    // Otherwise, go to previous step
    const prevStep = stepOrder[currentIndex - 1];
    return { label: stepLabels[prevStep], action: onGoBack };
  };

  const backInfo = getBackInfo();

  const handleBack = () => {
    if (backInfo.action) {
      backInfo.action();
    }
  };

  // Calculate progress dots (exclude select-student)
  const progressSteps = stepOrder.slice(1); // anamnesis, global, segmental, protocol
  const progressCurrentIndex = currentStep === 'select-student' 
    ? -1 
    : progressSteps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 border-b bg-card/50 backdrop-blur-sm">
      {/* Left: Back button */}
      <button
        onClick={handleBack}
        disabled={!canGoBack}
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium transition-colors min-w-[100px]",
          canGoBack 
            ? "text-muted-foreground hover:text-foreground" 
            : "text-muted-foreground/30 cursor-not-allowed"
        )}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{backInfo.label}</span>
      </button>

      {/* Center: Progress dots */}
      <div className="flex items-center gap-2">
        {progressSteps.map((step, index) => {
          const isCompleted = index < progressCurrentIndex;
          const isCurrent = index === progressCurrentIndex;
          
          return (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  isCurrent && "w-6 bg-primary",
                  isCompleted && "bg-primary/60",
                  !isCurrent && !isCompleted && "bg-muted-foreground/20"
                )}
              />
              {index < progressSteps.length - 1 && (
                <div 
                  className={cn(
                    "w-4 h-px mx-1 transition-colors duration-300",
                    index < progressCurrentIndex ? "bg-primary/40" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Student name */}
      <div className="min-w-[100px] text-right">
        {studentName && currentStep !== 'select-student' && (
          <span 
            className="text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-[180px] inline-block"
            title={studentName}
          >
            {studentName}
          </span>
        )}
      </div>
    </div>
  );
}
