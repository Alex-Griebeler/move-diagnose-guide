import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { 
  PageLayout, 
  PageHeader, 
  PageContent,
  PageLoading 
} from '@/components/layout/PageLayout';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';
import { AssessmentBreadcrumb } from '@/components/assessment/AssessmentBreadcrumb';
import { AssessmentHeader } from '@/components/assessment/view/AssessmentHeader';
import { OverviewTab } from '@/components/assessment/view/OverviewTab';
import { TestsTab } from '@/components/assessment/view/TestsTab';
import { ProtocolTab } from '@/components/assessment/view/ProtocolTab';
import { EditTab } from '@/components/assessment/view/EditTab';
import { toast } from 'sonner';

const logger = createLogger('ViewAssessment');

type EditMode = 'view' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

interface AssessmentData {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  student_id: string;
  student_name: string;
}

interface AnamnesisData {
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  occupation: string | null;
  objectives: string | null;
  activity_frequency: number | null;
  sports: unknown;
  sleep_hours: number | null;
  sleep_quality: number | null;
  has_red_flags: boolean | null;
}

interface GlobalTestData {
  test_name: string;
  anterior_view: unknown;
  lateral_view: unknown;
  posterior_view: unknown;
  left_side: unknown;
  right_side: unknown;
  media_urls: unknown;
}

interface SegmentalTestData {
  test_name: string;
  body_region: string;
  left_value: number | null;
  right_value: number | null;
  pass_fail_left: boolean | null;
  pass_fail_right: boolean | null;
  media_urls: unknown;
}

interface ProtocolData {
  id: string;
  name: string | null;
  priority_level: string;
  frequency_per_week: number | null;
  duration_weeks: number | null;
  exercises: unknown;
}

export default function ViewAssessment() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const studentNameParam = searchParams.get('studentName');
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null);
  const [globalTests, setGlobalTests] = useState<GlobalTestData[]>([]);
  const [segmentalTests, setSegmentalTests] = useState<SegmentalTestData[]>([]);
  const [protocol, setProtocol] = useState<ProtocolData | null>(null);

  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'professional')) {
      navigate('/dashboard');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || role !== 'professional') {
      return;
    }
    
    if (!assessmentId) {
      navigate('/dashboard');
      return;
    }
    
    fetchAssessmentData();
  }, [assessmentId, user, role, authLoading]);

  const fetchAssessmentData = async () => {
    if (!assessmentId) return;
    setLoading(true);

    try {
      // Fetch assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .maybeSingle();

      if (assessmentError) throw assessmentError;
      if (!assessmentData) {
        toast.error('Avaliação não encontrada');
        navigate('/dashboard');
        return;
      }

      // Get student name
      let studentName = studentNameParam ? decodeURIComponent(studentNameParam) : 'Aluno';
      if (!studentNameParam) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', assessmentData.student_id)
          .maybeSingle();
        studentName = profile?.full_name || 'Aluno';
      }

      setAssessment({
        ...assessmentData,
        student_name: studentName,
      });

      // Fetch anamnesis
      const { data: anamnesisData } = await supabase
        .from('anamnesis_responses')
        .select('*')
        .eq('assessment_id', assessmentId)
        .maybeSingle();
      setAnamnesis(anamnesisData);

      // Fetch global tests
      const { data: globalTestsData } = await supabase
        .from('global_test_results')
        .select('*')
        .eq('assessment_id', assessmentId);
      setGlobalTests(globalTestsData || []);

      // Fetch segmental tests
      const { data: segmentalTestsData } = await supabase
        .from('segmental_test_results')
        .select('*')
        .eq('assessment_id', assessmentId);
      setSegmentalTests(segmentalTestsData || []);

      // Fetch protocol
      const { data: protocolData } = await supabase
        .from('protocols')
        .select('*')
        .eq('assessment_id', assessmentId)
        .maybeSingle();
      setProtocol(protocolData);

    } catch (error) {
      logger.error('Error fetching assessment data', error);
      toast.error('Erro ao carregar dados da avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComplete = async () => {
    setEditMode('view');
    await fetchAssessmentData();
    toast.success('Alterações salvas com sucesso!');
  };

  const handleCancelEdit = () => {
    setEditMode('view');
  };

  if (authLoading || loading) {
    return <PageLoading variant="minimal" />;
  }

  if (!assessmentId || !assessment) return null;

  // If in edit mode, show the appropriate editor
  if (editMode !== 'view') {
    return (
      <PageLayout>
        <PageHeader
          variant="minimal"
          title={`Editar ${editMode === 'anamnesis' ? 'Anamnese' : editMode === 'global-tests' ? 'Testes Globais' : editMode === 'segmental-tests' ? 'Testes Segmentais' : 'Protocolo'}`}
          showBack
          onBack={handleCancelEdit}
          rightContent={
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          }
          className="border-b"
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b bg-card">
          <AssessmentBreadcrumb 
            currentStep={editMode === 'anamnesis' ? 'anamnesis' : editMode === 'global-tests' ? 'global-tests' : editMode === 'segmental-tests' ? 'segmental-tests' : 'protocol'} 
            studentName={assessment.student_name}
          />
        </div>

        <PageContent size="lg" className="py-8">
          {editMode === 'anamnesis' && (
            <AnamnesisWizard
              assessmentId={assessmentId}
              onComplete={handleEditComplete}
            />
          )}

          {editMode === 'global-tests' && assessment && (
            <GlobalTestsWizard
              assessmentId={assessmentId}
              studentId={assessment.student_id}
              onComplete={handleEditComplete}
            />
          )}

          {editMode === 'segmental-tests' && (
            <SegmentalTestsWizard
              assessmentId={assessmentId}
              onComplete={handleEditComplete}
            />
          )}

          {editMode === 'protocol' && (
            <ProtocolGenerator
              assessmentId={assessmentId}
              onComplete={handleEditComplete}
            />
          )}
        </PageContent>
      </PageLayout>
    );
  }

  // View mode - show assessment summary
  return (
    <PageLayout>
      <PageHeader
        variant="minimal"
        title="Detalhes da Avaliação"
        showBack
        onBack={() => navigate('/dashboard')}
        className="border-b"
      />

      <PageContent size="lg" className="py-8">
        <AssessmentHeader
          studentName={assessment.student_name}
          createdAt={assessment.created_at}
          completedAt={assessment.completed_at}
          priorityLevel={protocol?.priority_level}
        />

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="tests">Testes</TabsTrigger>
            <TabsTrigger value="protocol">Protocolo</TabsTrigger>
            <TabsTrigger value="edit">Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              anamnesis={anamnesis}
              globalTests={globalTests}
              segmentalTests={segmentalTests}
            />
          </TabsContent>

          <TabsContent value="tests">
            <TestsTab
              globalTests={globalTests}
              segmentalTests={segmentalTests}
            />
          </TabsContent>

          <TabsContent value="protocol">
            <ProtocolTab
              protocol={protocol}
              onGenerateProtocol={() => setEditMode('protocol')}
            />
          </TabsContent>

          <TabsContent value="edit">
            <EditTab onSetEditMode={setEditMode} />
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageLayout>
  );
}
