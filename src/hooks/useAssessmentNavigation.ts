import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type Step = 'select-student' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

const stepOrder: Step[] = ['select-student', 'anamnesis', 'global-tests', 'segmental-tests', 'protocol'];

const stepLabels: Record<Step, string> = {
  'select-student': 'Dashboard',
  'anamnesis': 'Anamnese',
  'global-tests': 'Testes Globais',
  'segmental-tests': 'Testes Segmentados',
  'protocol': 'Protocolo',
};

interface UseAssessmentNavigationProps {
  currentStep: Step;
  assessmentId: string | null;
  setStep: (step: Step) => void;
}

interface UseAssessmentNavigationReturn {
  goBack: () => void;
  goToStep: (step: Step) => void;
  canGoBack: boolean;
  backLabel: string;
  currentProgress: {
    step: number;
    total: number;
    percentage: number;
  };
}

export function useAssessmentNavigation({
  currentStep,
  assessmentId,
  setStep,
}: UseAssessmentNavigationProps): UseAssessmentNavigationReturn {
  const navigate = useNavigate();
  const currentIndex = stepOrder.indexOf(currentStep);

  // Calculate progress (excluding select-student)
  const currentProgress = useMemo(() => {
    const progressSteps = stepOrder.slice(1);
    const step = currentStep === 'select-student' ? 0 : progressSteps.indexOf(currentStep) + 1;
    const total = progressSteps.length;
    return {
      step,
      total,
      percentage: total > 0 ? (step / total) * 100 : 0,
    };
  }, [currentStep]);

  // Determine back label
  const backLabel = useMemo(() => {
    if (currentIndex <= 1) {
      return 'Dashboard';
    }
    return stepLabels[stepOrder[currentIndex - 1]];
  }, [currentIndex]);

  // Can go back if not at the beginning
  const canGoBack = currentIndex >= 0;

  // Go back function
  const goBack = useCallback(() => {
    if (currentIndex <= 1 || !assessmentId) {
      // At first step or no assessment → go to dashboard
      navigate('/dashboard');
      return;
    }
    
    // Go to previous step
    const prevStep = stepOrder[currentIndex - 1];
    // Don't allow going back to select-student if assessment exists
    if (prevStep === 'select-student' && assessmentId) {
      navigate('/dashboard');
      return;
    }
    setStep(prevStep);
  }, [currentIndex, assessmentId, navigate, setStep]);

  // Navigate to specific step
  const goToStep = useCallback((targetStep: Step) => {
    const targetIndex = stepOrder.indexOf(targetStep);
    
    // Only allow navigation to previous/completed steps
    if (targetIndex < currentIndex && targetStep !== 'select-student') {
      setStep(targetStep);
    }
  }, [currentIndex, setStep]);

  return {
    goBack,
    goToStep,
    canGoBack,
    backLabel,
    currentProgress,
  };
}
