import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';
import { AssessmentNavBar } from '@/components/assessment/AssessmentNavBar';
import { useToast } from '@/hooks/use-toast';
import { 
  PageLayout, 
  PageContent,
  PageLoading 
} from '@/components/layout/PageLayout';

const logger = createLogger('ContinueAssessment');

type Step = 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

const stepOrder: Step[] = ['anamnesis', 'global-tests', 'segmental-tests', 'protocol'];

export default function ContinueAssessment() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const studentName = searchParams.get('studentName') 
    ? decodeURIComponent(searchParams.get('studentName')!) 
    : 'Aluno';

  const [step, setStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(true);

  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'professional')) {
      navigate('/dashboard');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/dashboard');
      return;
    }
    detectCurrentStep();
  }, [assessmentId]);

  const detectCurrentStep = async () => {
    if (!assessmentId) return;
    setLoading(true);

    try {
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, status')
        .eq('id', assessmentId)
        .maybeSingle();

      if (assessmentError || !assessment) {
        logger.error('Assessment not found or error', assessmentError);
        toast({
          title: 'Avaliação não encontrada',
          description: 'Esta avaliação não existe ou foi removida.',
          variant: 'destructive',
        });
        localStorage.removeItem(`wizard_anamnesis_${assessmentId}`);
        localStorage.removeItem(`wizard_global_tests_${assessmentId}`);
        localStorage.removeItem(`wizard_segmental_tests_${assessmentId}`);
        navigate('/dashboard');
        return;
      }

      const { data: anamnesis } = await supabase
        .from('anamnesis_responses')
        .select('id')
        .eq('assessment_id', assessmentId)
        .maybeSingle();

      if (!anamnesis) {
        setStep('anamnesis');
        setLoading(false);
        return;
      }

      const { data: globalTests } = await supabase
        .from('global_test_results')
        .select('id')
        .eq('assessment_id', assessmentId)
        .limit(1);

      if (!globalTests || globalTests.length === 0) {
        setStep('global-tests');
        setLoading(false);
        return;
      }

      const { data: segmentalTests } = await supabase
        .from('segmental_test_results')
        .select('id')
        .eq('assessment_id', assessmentId)
        .limit(1);

      if (!segmentalTests || segmentalTests.length === 0) {
        setStep('segmental-tests');
        setLoading(false);
        return;
      }

      const { data: protocol } = await supabase
        .from('protocols')
        .select('id')
        .eq('assessment_id', assessmentId)
        .maybeSingle();

      if (!protocol) {
        setStep('protocol');
      } else {
        toast({
          title: 'Avaliação já concluída',
          description: 'Esta avaliação já possui um protocolo gerado.',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      logger.error('Error detecting step', error);
      toast({
        title: 'Erro ao carregar avaliação',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnamnesisComplete = () => {
    toast({
      title: 'Anamnese concluída!',
      description: 'Prossiga para os testes globais.',
    });
    setStep('global-tests');
  };

  const handleGlobalTestsComplete = () => {
    toast({
      title: 'Testes globais concluídos!',
      description: 'Prossiga para os testes segmentados.',
    });
    setStep('segmental-tests');
  };

  const handleSegmentalTestsComplete = () => {
    toast({
      title: 'Testes concluídos!',
      description: 'Gerando protocolo de exercícios...',
    });
    setStep('protocol');
  };

  const handleProtocolComplete = () => {
    toast({
      title: 'Avaliação finalizada!',
      description: 'Protocolo salvo com sucesso.',
    });
    navigate('/dashboard');
  };

  // Navigate to previous assessment step (between wizards)
  const handleGoToPreviousStep = () => {
    if (!step) return;
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    } else {
      navigate('/dashboard');
    }
  };

  if (authLoading || loading) {
    return <PageLoading variant="minimal" />;
  }

  if (!assessmentId) return null;

  return (
    <PageLayout>
      <AssessmentNavBar 
        currentStep={step || 'anamnesis'}
        studentName={studentName}
        onGoBack={handleGoToPreviousStep}
        canGoBack={true}
      />

      <PageContent size="lg" className="py-8">
        {step === 'anamnesis' && (
          <AnamnesisWizard
            assessmentId={assessmentId}
            onComplete={handleAnamnesisComplete}
          />
        )}

        {step === 'global-tests' && (
          <GlobalTestsWizard
            assessmentId={assessmentId}
            onComplete={handleGlobalTestsComplete}
          />
        )}

        {step === 'segmental-tests' && (
          <SegmentalTestsWizard
            assessmentId={assessmentId}
            onComplete={handleSegmentalTestsComplete}
          />
        )}

        {step === 'protocol' && (
          <ProtocolGenerator
            assessmentId={assessmentId}
            onComplete={handleProtocolComplete}
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
