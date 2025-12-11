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
import { Card, CardContent } from '@/components/ui/card';
import { PROTOCOL_METAS, type ProtocolType } from '@/data/quickProtocolMappings';
interface LinkedStudent {
  id: string;
  full_name: string;
  email: string | null;
}
export default function QuickProtocol() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
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
      // Get linked student IDs
      const {
        data: links
      } = await supabase.from('professional_students').select('student_id').eq('professional_id', user.id);
      if (links && links.length > 0) {
        const studentIds = links.map(l => l.student_id);

        // Get student profiles
        const {
          data: profiles
        } = await supabase.from('profiles').select('id, full_name, email').in('id', studentIds);
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
      const {
        data: profile
      } = await supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle();
      setStudentData({
        studentId,
        studentName: profile?.full_name || undefined,
        assessmentId: assessmentId || null
      });
    } catch (error) {
      console.error('Error loading student:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSelectStudent = (student: LinkedStudent) => {
    navigate(`/quick-protocol?studentId=${student.id}&type=${protocolType}`);
  };
  const handleComplete = () => {
    // Could trigger analytics or other side effects
  };
  const handleClose = () => {
    navigate('/dashboard');
  };
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>;
  }

  // Student selection mode
  if (studentId === 'select') {
    return <div className="min-h-screen bg-background">
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
              
            </div>
            <h2 className="text-xl font-display mb-2">Selecione o Aluno</h2>
            <p className="text-muted-foreground text-sm">
              {protocolMeta.description}
            </p>
          </div>

          {linkedStudents.length > 0 ? <div className="space-y-3">
              {linkedStudents.map(student => <Card key={student.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleSelectStudent(student)}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      {student.email && <p className="text-xs text-muted-foreground">{student.email}</p>}
                    </div>
                  </CardContent>
                </Card>)}
            </div> : <Card>
              <CardContent className="py-8 text-center">
                <User className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum aluno vinculado
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione alunos no dashboard primeiro
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>
                  Voltar ao Dashboard
                </Button>
              </CardContent>
            </Card>}
        </main>
      </div>;
  }
  if (!studentData) {
    return null;
  }
  return <QuickProtocolWizard studentId={studentData.studentId} studentName={studentData.studentName} assessmentId={studentData.assessmentId} protocolType={protocolType} onComplete={handleComplete} onClose={handleClose} />;
}