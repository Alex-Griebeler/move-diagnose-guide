import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Users, ClipboardList, LogOut, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddStudentModal } from '@/components/students/AddStudentModal';
import { StudentsList } from '@/components/students/StudentsList';
import { supabase } from '@/integrations/supabase/client';

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
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">FABRIK</h1>
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
  const { user } = useAuth();

  const fetchStudentCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('professional_students')
      .select('*', { count: 'exact', head: true })
      .eq('professional_id', user.id);
    setStudentCount(count || 0);
  };

  useEffect(() => {
    fetchStudentCount();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {studentCount === 0 ? 'Nenhum aluno cadastrado' : 'Alunos vinculados'}
            </p>
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
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nenhuma avaliação em andamento
            </p>
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
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/assessment/new">
            <Card className="card-hover cursor-pointer border-dashed border-2">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-base">Nova Avaliação</CardTitle>
                  <CardDescription>Iniciar uma nova avaliação de movimento</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card 
            className="card-hover cursor-pointer border-dashed border-2"
            onClick={() => setShowAddStudent(true)}
          >
            <CardContent className="flex items-center gap-4 py-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base">Adicionar Aluno</CardTitle>
                <CardDescription>Vincular um aluno por email</CardDescription>
              </div>
            </CardContent>
          </Card>
        </div>

        <AddStudentModal 
          open={showAddStudent} 
          onOpenChange={setShowAddStudent}
          onStudentAdded={fetchStudentCount}
        />
      </div>

      {/* Students List */}
      <StudentsList onStudentRemoved={fetchStudentCount} />

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Atividade Recente</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhuma atividade recente
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Suas avaliações aparecerão aqui
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StudentDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <CardContent className="py-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center shrink-0">
              <Activity className="w-7 h-7 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Bem-vindo ao FABRIK</h2>
              <p className="text-muted-foreground">
                Você ainda não possui avaliações. Aguarde seu profissional iniciar uma avaliação de movimento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Protocol */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Seu Protocolo</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum protocolo ativo
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Após sua avaliação, seus exercícios aparecerão aqui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Seu Progresso</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Exercícios Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
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
              <div className="text-lg font-semibold text-muted-foreground">--</div>
              <p className="text-xs text-muted-foreground mt-1">Não agendada</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
