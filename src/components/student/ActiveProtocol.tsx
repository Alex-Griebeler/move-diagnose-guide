import { useEffect, useState } from 'react';
import { Calendar, Target, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExerciseCard } from './ExerciseCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Exercise {
  id: string;
  name: string;
  phase: string;
  sets: number;
  reps: string;
  instructions: string;
  video_url?: string;
}

interface Protocol {
  id: string;
  name: string | null;
  exercises: Exercise[];
  frequency_per_week: number | null;
  duration_weeks: number | null;
  next_review_date: string | null;
  priority_level: string;
  created_at: string;
}

const phaseLabels: Record<string, string> = {
  mobility: 'Mobilidade',
  inhibition: 'Inibição',
  activation: 'Ativação',
  stability: 'Estabilidade',
  strength: 'Força',
  integration: 'Integração',
};

const phaseOrder = ['mobility', 'inhibition', 'activation', 'stability', 'strength', 'integration'];

export function ActiveProtocol() {
  const { user } = useAuth();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchActiveProtocol();
      fetchTodayProgress();
    }
  }, [user]);

  const fetchActiveProtocol = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('protocols')
      .select(`
        id,
        name,
        exercises,
        frequency_per_week,
        duration_weeks,
        next_review_date,
        priority_level,
        created_at,
        assessments!inner(student_id, status)
      `)
      .eq('assessments.student_id', user.id)
      .eq('assessments.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setProtocol(data as unknown as Protocol);
    }
    setLoading(false);
  };

  const fetchTodayProgress = async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('progress_logs')
      .select('exercise_id')
      .eq('student_id', user.id)
      .gte('completed_at', today.toISOString());

    if (data) {
      setCompletedToday(new Set(data.map(d => d.exercise_id)));
    }
  };

  const handleExerciseComplete = async (exerciseId: string) => {
    if (!user || !protocol) return;

    const { error } = await supabase
      .from('progress_logs')
      .insert({
        student_id: user.id,
        protocol_id: protocol.id,
        exercise_id: exerciseId,
      });

    if (!error) {
      setCompletedToday(prev => new Set([...prev, exerciseId]));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!protocol) {
    return null;
  }

  const exercises = (protocol.exercises as Exercise[]) || [];
  const groupedExercises = exercises.reduce((acc, ex) => {
    const phase = ex.phase || 'other';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const sortedPhases = phaseOrder.filter(p => groupedExercises[p]);

  return (
    <div className="space-y-6">
      {/* Protocol Header */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                {protocol.name || 'Seu Protocolo'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Criado em {format(new Date(protocol.created_at), "d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Ativo
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{protocol.frequency_per_week || 3}x/semana</p>
                <p className="text-xs text-muted-foreground">Frequência</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{exercises.length} exercícios</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {protocol.next_review_date 
                    ? format(new Date(protocol.next_review_date), 'dd/MM', { locale: ptBR })
                    : '--'}
                </p>
                <p className="text-xs text-muted-foreground">Reavaliação</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercises by Phase */}
      {sortedPhases.map(phase => (
        <div key={phase} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {phaseLabels[phase] || phase}
          </h3>
          <div className="grid gap-3">
            {groupedExercises[phase].map(exercise => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                isCompleted={completedToday.has(exercise.id)}
                onComplete={() => handleExerciseComplete(exercise.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
