import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';
import { AssessmentBreadcrumb } from '@/components/assessment/AssessmentBreadcrumb';
import { useToast } from '@/hooks/use-toast';

type Step = 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

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
      console.error('Error detecting step:', error);
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
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!assessmentId) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Continuar Avaliação</h1>
          </div>
          
          {/* Breadcrumb Navigation */}
          <AssessmentBreadcrumb 
            currentStep={step || 'anamnesis'} 
            studentName={studentName}
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>
    </div>
  );
}
