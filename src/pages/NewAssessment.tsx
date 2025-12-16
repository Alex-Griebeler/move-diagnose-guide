import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';
import { AssessmentBreadcrumb } from '@/components/assessment/AssessmentBreadcrumb';
import { StudentSearchList, type StudentItem } from '@/components/students/StudentSearchList';
import { 
  PageLayout, 
  PageHeader, 
  PageContent,
  PageLoading 
} from '@/components/layout/PageLayout';

const logger = createLogger('NewAssessment');

type Step = 'select-student' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

export default function NewAssessment() {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isRestoringState, setIsRestoringState] = useState(true);
  
  const [step, setStep] = useState<Step>('select-student');

  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch student name from database when needed
  const fetchStudentName = async (studentId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .single();
      
      if (error) throw error;
      return data?.full_name || null;
    } catch (error) {
      logger.error('Error fetching student name', error);
      return null;
    }
  };

  // Restore state from localStorage or URL params on mount
  useEffect(() => {
    const restoreState = async () => {
      const studentIdParam = searchParams.get('studentId');
      const assessmentIdParam = searchParams.get('assessmentId');
      const studentNameParam = searchParams.get('studentName');

      // Priority 1: URL parameters (from in-person registration or continue)
      if (studentIdParam && assessmentIdParam) {
        let studentName = studentNameParam ? decodeURIComponent(studentNameParam) : null;
        
        // If no name in URL, fetch from database
        if (!studentName) {
          studentName = await fetchStudentName(studentIdParam);
        }
        
        setSelectedStudent({
          id: studentIdParam,
          full_name: studentName || 'Aluno',
          email: '',
        });
        setAssessmentId(assessmentIdParam);
        
        // Save to localStorage for future reference
        if (studentName) {
          localStorage.setItem('current_student_name', studentName);
        }
        
        const savedStep = localStorage.getItem(`assessment_step_${assessmentIdParam}`);
        if (savedStep && ['anamnesis', 'global-tests', 'segmental-tests', 'protocol'].includes(savedStep)) {
          setStep(savedStep as Step);
        } else {
          setStep('anamnesis');
        }
        setIsRestoringState(false);
        return;
      }

      // Priority 2: Check localStorage for in-progress assessment
      const savedAssessmentId = localStorage.getItem('current_assessment_id');
      const savedStudentId = localStorage.getItem('current_student_id');
      const savedStudentName = localStorage.getItem('current_student_name');
      const savedStep = savedAssessmentId ? localStorage.getItem(`assessment_step_${savedAssessmentId}`) : null;
      
      if (savedAssessmentId && savedStudentId && savedStep) {
        let studentName = savedStudentName;
        
        // If no name in localStorage, fetch from database
        if (!studentName) {
          studentName = await fetchStudentName(savedStudentId);
          if (studentName) {
            localStorage.setItem('current_student_name', studentName);
          }
        }
        
        setAssessmentId(savedAssessmentId);
        setSelectedStudent({
          id: savedStudentId,
          full_name: studentName || 'Aluno',
          email: '',
        });
        setStep(savedStep as Step);
      }
      
      setIsRestoringState(false);
    };

    restoreState();
  }, [searchParams]);

  useEffect(() => {
    if (!loading && (!user || role !== 'professional')) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && step === 'select-student') {
      fetchStudents();
    }
  }, [user, step]);

  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const { data: links, error: linksError } = await supabase
        .from('professional_students')
        .select('student_id')
        .eq('professional_id', user!.id);

      if (linksError) throw linksError;

      if (links && links.length > 0) {
        const studentIds = links.map(l => l.student_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);

        if (profilesError) throw profilesError;
        setStudents(profiles || []);
      }
    } catch (error) {
      logger.error('Error fetching students', error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const createAssessment = async (studentId: string) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          professional_id: user!.id,
          student_id: studentId,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem('current_assessment_id', data.id);
      localStorage.setItem('current_student_id', studentId);
      localStorage.setItem('current_student_name', selectedStudent?.full_name || '');
      localStorage.setItem(`assessment_step_${data.id}`, 'anamnesis');

      setAssessmentId(data.id);
      setStep('anamnesis');
    } catch (error) {
      logger.error('Error creating assessment', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar avaliação',
        description: 'Não foi possível iniciar a avaliação. Tente novamente.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectStudent = (student: StudentItem) => {
    setSelectedStudent(student);
    localStorage.setItem('current_student_name', student.full_name);
    createAssessment(student.id);
  };

  const handleAnamnesisComplete = () => {
    if (assessmentId) {
      localStorage.setItem(`assessment_step_${assessmentId}`, 'global-tests');
    }
    toast({
      title: 'Anamnese concluída!',
      description: 'Prossiga para os testes globais.',
    });
    setStep('global-tests');
  };

  const handleGlobalTestsComplete = () => {
    if (assessmentId) {
      localStorage.setItem(`assessment_step_${assessmentId}`, 'segmental-tests');
    }
    toast({
      title: 'Testes globais concluídos!',
      description: 'Prossiga para os testes segmentados.',
    });
    setStep('segmental-tests');
  };

  const handleSegmentalTestsComplete = () => {
    if (assessmentId) {
      localStorage.setItem(`assessment_step_${assessmentId}`, 'protocol');
    }
    toast({
      title: 'Testes concluídos!',
      description: 'Gerando protocolo de exercícios...',
    });
    setStep('protocol');
  };

  const handleProtocolComplete = () => {
    if (assessmentId) {
      localStorage.removeItem(`assessment_step_${assessmentId}`);
      localStorage.removeItem('globalTests_assessmentId');
    }
    localStorage.removeItem('current_assessment_id');
    localStorage.removeItem('current_student_id');
    localStorage.removeItem('current_student_name');
    
    toast({
      title: 'Avaliação finalizada!',
      description: 'Protocolo salvo com sucesso.',
    });
    navigate('/dashboard');
  };

  if (loading || isRestoringState) {
    return <PageLoading variant="minimal" />;
  }

  return (
    <PageLayout>
      <PageHeader
        variant="minimal"
        title="Nova Avaliação"
        showBack
        onBack={() => navigate('/dashboard')}
        className="border-b"
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b bg-card">
        <AssessmentBreadcrumb 
          currentStep={step} 
          studentName={selectedStudent?.full_name}
        />
      </div>

      <PageContent size="lg" className="py-8">
        {step === 'select-student' && (
          <StudentSearchList
            students={students}
            onSelect={handleSelectStudent}
            isLoading={isLoadingStudents}
            selectedId={selectedStudent?.id}
            emptyMessage="Você ainda não tem alunos cadastrados."
            emptySubMessage="Adicione alunos no dashboard para iniciar avaliações."
            actionLabel={isCreating ? 'Criando...' : 'Iniciar Avaliação'}
          />
        )}

        {step === 'anamnesis' && assessmentId && (
          <AnamnesisWizard
            assessmentId={assessmentId}
            onComplete={handleAnamnesisComplete}
          />
        )}

        {step === 'global-tests' && assessmentId && (
          <GlobalTestsWizard
            assessmentId={assessmentId}
            onComplete={handleGlobalTestsComplete}
          />
        )}

        {step === 'segmental-tests' && assessmentId && (
          <SegmentalTestsWizard
            assessmentId={assessmentId}
            onComplete={handleSegmentalTestsComplete}
          />
        )}

        {step === 'protocol' && assessmentId && (
          <ProtocolGenerator
            assessmentId={assessmentId}
            onComplete={handleProtocolComplete}
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
