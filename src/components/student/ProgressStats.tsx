import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Target, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProtocolInfo {
  id: string;
  exercises: unknown[];
  frequency_per_week: number | null;
  next_review_date: string | null;
}

export function ProgressStats() {
  const { user } = useAuth();
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [weeklyTarget, setWeeklyTarget] = useState(0);
  const [nextReview, setNextReview] = useState<string | null>(null);
  const [daysUntilReview, setDaysUntilReview] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    // Get active protocol
    const { data: protocol } = await supabase
      .from('protocols')
      .select(`
        id,
        exercises,
        frequency_per_week,
        next_review_date,
        assessments!inner(student_id, status)
      `)
      .eq('assessments.student_id', user.id)
      .eq('assessments.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (protocol) {
      const protocolInfo = protocol as unknown as ProtocolInfo;
      const exerciseCount = (protocolInfo.exercises as unknown[])?.length || 0;
      const frequency = protocolInfo.frequency_per_week || 3;
      setWeeklyTarget(exerciseCount * frequency);

      if (protocolInfo.next_review_date) {
        setNextReview(protocolInfo.next_review_date);
        const days = differenceInDays(new Date(protocolInfo.next_review_date), new Date());
        setDaysUntilReview(days > 0 ? days : 0);
      }

      // Get weekly progress
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { count } = await supabase
        .from('progress_logs')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('protocol_id', protocolInfo.id)
        .gte('completed_at', weekStart.toISOString())
        .lte('completed_at', weekEnd.toISOString());

      setWeeklyCompleted(count || 0);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-6">
              <div className="h-4 bg-muted rounded w-1/2 mb-4" />
              <div className="h-8 bg-muted rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const progressPercent = weeklyTarget > 0 
    ? Math.min((weeklyCompleted / weeklyTarget) * 100, 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Weekly Progress */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso Semanal
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{weeklyCompleted}</span>
              <span className="text-sm text-muted-foreground">/ {weeklyTarget}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {weeklyTarget > 0 
                ? `${Math.round(progressPercent)}% da meta semanal`
                : 'Nenhum protocolo ativo'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Review */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próxima Reavaliação
            </CardTitle>
            <Calendar className="w-4 h-4 text-warning" />
          </div>
        </CardHeader>
        <CardContent>
          {nextReview ? (
            <div>
              <p className="text-xl font-semibold">
                {format(new Date(nextReview), "d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {daysUntilReview === 0 
                  ? 'Hoje!' 
                  : daysUntilReview === 1 
                    ? 'Amanhã' 
                    : `Em ${daysUntilReview} dias`}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-semibold text-muted-foreground">--</p>
              <p className="text-xs text-muted-foreground mt-1">Não agendada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
