/**
 * Quick Protocol Page
 * Página do Mini Protocolo FABRIK
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronLeft, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QuickProtocolWizard } from '@/components/quick-protocol/QuickProtocolWizard';
import { Button } from '@/components/ui/button';
import { PROTOCOL_METAS, type ProtocolType } from '@/data/quickProtocolMappings';
import { StudentSearchList, type StudentItem } from '@/components/students/StudentSearchList';

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
      console.error('Error loading students:', error);
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
      console.error('Error loading student:', error);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Student selection mode
  if (studentId === 'select') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-sm font-medium">{protocolMeta.shortName}</h1>
              <p className="text-xs text-muted-foreground">Selecione o aluno</p>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-display mb-2">Selecione o Aluno</h2>
            <p className="text-muted-foreground text-sm">
              {protocolMeta.description}
            </p>
          </div>

          <StudentSearchList
            students={linkedStudents}
            onSelect={handleSelectStudent}
            emptyMessage="Nenhum aluno vinculado"
            emptySubMessage="Adicione alunos no dashboard primeiro"
          />
        </main>
      </div>
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
