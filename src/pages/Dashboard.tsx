import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, ClipboardList, LogOut, Plus, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import fabrikLogo from '@/assets/fabrik-logo.png';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddStudentModal } from '@/components/students/AddStudentModal';
import { StudentsList } from '@/components/students/StudentsList';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AssessmentStats {
  pending: number;
  completed: number;
}

interface RecentAssessment {
  id: string;
  status: string;
  created_at: string;
  student_name: string;
}

export default function Dashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={fabrikLogo} alt="FABRIK" className="h-10 w-auto" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {role === 'professional' ? 'Área Profissional' : 'Área do Aluno'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {role === 'professional' ? (
          <ProfessionalDashboard />
        ) : (
          <StudentDashboard />
        )}
      </main>
    </div>
  );
}

function ProfessionalDashboard() {
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [assessmentStats, setAssessmentStats] = useState<AssessmentStats>({ pending: 0, completed: 0 });
  const [recentAssessments, setRecentAssessments] = useState<RecentAssessment[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<RecentAssessment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentToDelete.id);

      if (error) throw error;
      
      await fetchData();
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    } catch (error) {
      console.error('Error deleting assessment:', error);
    } finally {
      setDeleting(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoadingStats(true);

    try {
      // Fetch student count
      const { count: studentsCount } = await supabase
        .from('professional_students')
        .select('*', { count: 'exact', head: true })
        .eq('professional_id', user.id);
      
      setStudentCount(studentsCount || 0);

      // Fetch assessment stats
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, status')
        .eq('professional_id', user.id);

      if (assessments) {
        const pending = assessments.filter(a => 
          a.status === 'draft' || a.status === 'in_progress'
        ).length;
        const completed = assessments.filter(a => a.status === 'completed').length;
        setAssessmentStats({ pending, completed });
      }

      // Fetch recent assessments with student names
      const { data: recentData } = await supabase
        .from('assessments')
        .select('id, status, created_at, student_id')
        .eq('professional_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentData && recentData.length > 0) {
        // Get student profiles
        const studentIds = recentData.map(a => a.student_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', studentIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        const recent: RecentAssessment[] = recentData.map(a => ({
          id: a.id,
          status: a.status,
          created_at: a.created_at,
          student_name: profileMap.get(a.student_id) || 'Aluno',
        }));
        
        setRecentAssessments(recent);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      in_progress: 'Em andamento',
      completed: 'Concluída',
      archived: 'Arquivada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'text-muted-foreground',
      in_progress: 'text-warning',
      completed: 'text-success',
      archived: 'text-muted-foreground',
    };
    return colors[status] || 'text-muted-foreground';
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-semibold text-foreground">{studentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {studentCount === 0 ? 'Nenhum aluno cadastrado' : 'Alunos vinculados'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avaliações Pendentes
            </CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-semibold text-foreground">{assessmentStats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {assessmentStats.pending === 0 ? 'Nenhuma avaliação pendente' : 'Em rascunho ou andamento'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avaliações Concluídas
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-semibold text-foreground">{assessmentStats.completed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {assessmentStats.completed === 0 ? 'Nenhuma avaliação concluída' : 'Total de avaliações'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/assessment/new">
            <Card className="card-hover cursor-pointer border-dashed border-2 border-border hover:border-primary/40">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Nova Avaliação</CardTitle>
                  <CardDescription className="text-sm">Iniciar uma nova avaliação de movimento</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card 
            className="card-hover cursor-pointer border-dashed border-2 border-border hover:border-primary/40"
            onClick={() => setShowAddStudent(true)}
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">Adicionar Aluno</CardTitle>
                <CardDescription className="text-sm">Vincular um aluno por email</CardDescription>
              </div>
            </CardContent>
          </Card>
        </div>

        <AddStudentModal 
          open={showAddStudent} 
          onOpenChange={setShowAddStudent}
          onStudentAdded={fetchData}
        />
      </div>

      {/* Students List */}
      <StudentsList onStudentRemoved={fetchData} />

      {/* Delete Assessment Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a avaliação de{' '}
              <span className="font-medium text-foreground">{assessmentToDelete?.student_name}</span>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssessment}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recent Activity */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Atividade Recente</h2>
        <Card>
          {loadingStats ? (
            <CardContent className="py-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          ) : recentAssessments.length > 0 ? (
            <CardContent className="py-4 divide-y divide-border">
              {recentAssessments.map((assessment) => (
                <div 
                  key={assessment.id} 
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
                >
                  <Link 
                    to={`/assessment/continue?assessmentId=${assessment.id}&studentName=${encodeURIComponent(assessment.student_name)}`}
                    className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{assessment.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(assessment.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${getStatusColor(assessment.status)}`}>
                      {getStatusLabel(assessment.status)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAssessmentToDelete(assessment);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          ) : (
            <CardContent className="py-8 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade recente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Suas avaliações aparecerão aqui
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function StudentDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <img src={fabrikLogo} alt="FABRIK" className="h-12 w-auto shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Bem-vindo ao FABRIK</h2>
              <p className="text-sm text-muted-foreground">
                Você ainda não possui avaliações. Aguarde seu profissional iniciar uma avaliação de movimento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Protocol */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Seu Protocolo</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum protocolo ativo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Após sua avaliação, seus exercícios aparecerão aqui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Seu Progresso</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Exercícios Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">0</div>
              <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próxima Reavaliação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-muted-foreground">--</div>
              <p className="text-xs text-muted-foreground mt-1">Não agendada</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
