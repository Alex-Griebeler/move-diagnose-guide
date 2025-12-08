import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Assessment {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  student_name: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  draft: { label: 'Rascunho', icon: ClipboardList, className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Em andamento', icon: Clock, className: 'bg-warning/10 text-warning' },
  completed: { label: 'Concluída', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelada', icon: AlertCircle, className: 'bg-destructive/10 text-destructive' },
};

export function RecentActivity() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentAssessments();
    }
  }, [user]);

  const fetchRecentAssessments = async () => {
    if (!user) return;

    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('id, status, created_at, updated_at, student_id')
      .eq('professional_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (assessmentData && assessmentData.length > 0) {
      // Fetch student names
      const studentIds = [...new Set(assessmentData.map(a => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const enrichedAssessments: Assessment[] = assessmentData.map(a => ({
        id: a.id,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at,
        student_name: profileMap.get(a.student_id) || 'Aluno',
      }));

      setAssessments(enrichedAssessments);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 py-2">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (assessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Atividade Recente</CardTitle>
        </CardHeader>
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
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {assessments.map(assessment => {
          const config = statusConfig[assessment.status] || statusConfig.draft;
          const StatusIcon = config.icon;

          return (
            <Link
              key={assessment.id}
              to={`/assessment/${assessment.id}`}
              className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.className}`}>
                <StatusIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {assessment.student_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(assessment.updated_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
              <Badge variant="secondary" className={`text-xs ${config.className} border-0`}>
                {config.label}
              </Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
