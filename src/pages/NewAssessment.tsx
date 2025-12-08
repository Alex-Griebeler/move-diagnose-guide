import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';

type Step = 'select-student' | 'anamnesis' | 'global-tests' | 'segmental-tests';

interface Student {
  id: string;
  full_name: string;
  email: string;
}

export default function NewAssessment() {
  const [step, setStep] = useState<Step>('select-student');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);

  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && (!user || role !== 'professional')) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      // Get students linked to this professional
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
      console.error('Error fetching students:', error);
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

      setAssessmentId(data.id);
      setStep('anamnesis');
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar avaliação',
        description: 'Não foi possível iniciar a avaliação. Tente novamente.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    createAssessment(student.id);
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
      title: 'Avaliação concluída!',
      description: 'Todos os testes foram salvos com sucesso.',
    });
    navigate('/dashboard');
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Nova Avaliação</h1>
              <p className="text-sm text-muted-foreground">
                {step === 'select-student' && 'Selecione o aluno'}
                {step === 'anamnesis' && `Anamnese - ${selectedStudent?.full_name}`}
                {step === 'global-tests' && `Testes Globais - ${selectedStudent?.full_name}`}
                {step === 'segmental-tests' && `Testes Segmentados - ${selectedStudent?.full_name}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'select-student' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* Students List */}
            {filteredStudents.length > 0 ? (
              <div className="grid gap-3">
                {filteredStudents.map((student) => (
                  <Card
                    key={student.id}
                    className="cursor-pointer card-hover"
                    onClick={() => handleSelectStudent(student)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{student.full_name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      <Button variant="outline" size="sm" disabled={isCreating}>
                        {isCreating && selectedStudent?.id === student.id
                          ? 'Criando...'
                          : 'Iniciar Avaliação'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : students.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserPlus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Você ainda não tem alunos cadastrados.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Adicione alunos no dashboard para iniciar avaliações.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhum aluno encontrado para "{searchTerm}"
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
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
      </main>
    </div>
  );
}
