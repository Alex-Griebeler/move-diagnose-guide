import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPriorityColor, getPriorityLabel } from '@/lib/assessmentUtils';

interface AssessmentHeaderProps {
  studentName: string;
  createdAt: string;
  completedAt: string | null;
  priorityLevel?: string;
}

export function AssessmentHeader({ 
  studentName, 
  createdAt, 
  completedAt, 
  priorityLevel 
}: AssessmentHeaderProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{studentName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {completedAt && (
                  <span className="text-success flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Concluída
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          {priorityLevel && (
            <Badge className={getPriorityColor(priorityLevel)}>
              Prioridade {getPriorityLabel(priorityLevel)}
            </Badge>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
