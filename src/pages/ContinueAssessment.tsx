import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';
import { AssessmentBreadcrumb } from '@/components/assessment/AssessmentBreadcrumb';
import { useToast } from '@/hooks/use-toast';
import { 
  PageLayout, 
  PageHeader, 
  PageContent,
  PageLoading 
} from '@/components/layout/PageLayout';

const logger = createLogger('ContinueAssessment');

type Step = 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

export default function ContinueAssessment() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const studentName = searchParams.get('studentName') 
    ? decodeURIComponent(searchParams.get('studentName')!) 
    : 'Aluno';

  const [step, setStep] = useState<Step | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
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
      // Fetch assessment to get student_id
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('student_id')
        .eq('id', assessmentId)
        .maybeSingle();
      
      if (assessmentData?.student_id) {
        setStudentId(assessmentData.student_id);
      }

      // Check if anamnesis exists
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

      // Check if global tests exist
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

      // Check if segmental tests exist
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

      // Check if protocol exists
      const { data: protocol } = await supabase
        .from('protocols')
        .select('id')
        .eq('assessment_id', assessmentId)
        .maybeSingle();

      if (!protocol) {
        setStep('protocol');
      } else {
        // Assessment already completed
        toast({
          title: 'Avaliação já concluída',
          description: 'Esta avaliação já possui um protocolo gerado.',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      logger.error('Error detecting step', error);
      setStep('anamnesis');
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

  if (authLoading || loading) {
    return <PageLoading variant="minimal" />;
  }

  if (!assessmentId) return null;

  return (
    <PageLayout>
      <PageHeader
        variant="minimal"
        title="Continuar Avaliação"
        showBack
        onBack={() => navigate('/dashboard')}
        className="border-b"
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b bg-card">
        <AssessmentBreadcrumb 
          currentStep={step || 'anamnesis'} 
          studentName={studentName}
        />
      </div>

      <PageContent size="lg" className="py-8">
        {step === 'anamnesis' && (
          <AnamnesisWizard
            assessmentId={assessmentId}
            onComplete={handleAnamnesisComplete}
          />
        )}

        {step === 'global-tests' && studentId && (
          <GlobalTestsWizard
            assessmentId={assessmentId}
            studentId={studentId}
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
