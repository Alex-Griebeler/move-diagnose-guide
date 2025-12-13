import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  PageLayout, 
  PageHeader, 
  PageContent,
  PageLoading 
} from '@/components/layout/PageLayout';
import { ProfessionalDashboard } from '@/components/dashboard/ProfessionalDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';

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
    return <PageLoading variant="cards" />;
  }

  return (
    <PageLayout>
      <PageHeader
        showLogo
        title="Movement Screen"
        subtitle={role === 'professional' ? 'Área Profissional' : 'Área do Aluno'}
        rightContent={
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        }
      />

      <PageContent>
        {role === 'professional' ? (
          <ProfessionalDashboard />
        ) : (
          <StudentDashboard />
        )}
      </PageContent>
    </PageLayout>
  );
}
