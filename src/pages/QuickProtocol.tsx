/**
 * Quick Protocol Page
 * Página do Protocolo Rápido FABRIK
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/lib/logger';
import { QuickProtocolWizard } from '@/components/quick-protocol/QuickProtocolWizard';
import { PROTOCOL_METAS, type ProtocolType } from '@/data/quickProtocolMappings';
import { StudentSearchList, type StudentItem } from '@/components/students/StudentSearchList';
import { 
  PageLayout, 
  PageHeader, 
  PageContent, 
  PageLoading,
  PageEmpty 
} from '@/components/layout/PageLayout';

const logger = createLogger('QuickProtocol');

export default function QuickProtocol() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [linkedStudents, setLinkedStudents] = useState<StudentItem[]>([]);
  const [studentData, setStudentData] = useState<{
    studentId: string;
    studentName?: string;
    assessmentId?: string | null;
  } | null>(null);

  const studentId = searchParams.get('studentId');
  const assessmentId = searchParams.get('assessmentId');
  const protocolTypeParam = searchParams.get('type') as ProtocolType | null;
  const protocolType: ProtocolType = protocolTypeParam || 'knee_pain';
  const protocolMeta = PROTOCOL_METAS[protocolType];

  useEffect(() => {
    if (studentId === 'select') {
      loadLinkedStudents();
    } else if (studentId) {
      loadStudentData();
    } else {
      navigate('/dashboard');
    }
  }, [studentId, assessmentId, user]);

  const loadLinkedStudents = async () => {
    if (!user) return;
    try {
      const { data: links } = await supabase
        .from('professional_students')
        .select('student_id')
        .eq('professional_id', user.id);

      if (links && links.length > 0) {
        const studentIds = links.map(l => l.student_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);
        setLinkedStudents(profiles || []);
      }
    } catch (error) {
      logger.error('Error loading students', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentData = async () => {
    if (!studentId || studentId === 'select') return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .maybeSingle();

      setStudentData({
        studentId,
        studentName: profile?.full_name || undefined,
        assessmentId: assessmentId || null,
      });
    } catch (error) {
      logger.error('Error loading student', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStudent = (student: StudentItem) => {
    navigate(`/quick-protocol?studentId=${student.id}&type=${protocolType}`);
  };

  const handleComplete = () => {
    // Could trigger analytics or other side effects
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return <PageLoading variant="minimal" />;
  }

  // Student selection mode
  if (studentId === 'select') {
    return (
      <PageLayout>
        <PageHeader
          variant="minimal"
          title={protocolMeta.shortName}
          subtitle="Selecione o aluno"
          showBack
          onBack={() => navigate('/dashboard')}
        />

        <PageContent size="md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-display mb-2">Selecione o Aluno</h2>
            <p className="text-muted-foreground text-sm">
              {protocolMeta.description}
            </p>
          </div>

          {linkedStudents.length > 0 ? (
            <StudentSearchList
              students={linkedStudents}
              onSelect={handleSelectStudent}
              emptyMessage="Nenhum aluno vinculado"
              emptySubMessage="Adicione alunos no dashboard primeiro"
            />
          ) : (
            <PageEmpty
              icon={<User className="w-8 h-8 text-muted-foreground" />}
              title="Nenhum aluno vinculado"
              description="Adicione alunos no dashboard primeiro"
            />
          )}
        </PageContent>
      </PageLayout>
    );
  }

  if (!studentData) {
    return null;
  }

  return (
    <QuickProtocolWizard
      studentId={studentData.studentId}
      studentName={studentData.studentName}
      assessmentId={studentData.assessmentId}
      protocolType={protocolType}
      onComplete={handleComplete}
      onClose={handleClose}
    />
  );
}
