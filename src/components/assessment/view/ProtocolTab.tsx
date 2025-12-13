import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Dumbbell } from 'lucide-react';
import { phaseConfig } from '@/data/protocolConfig';
import { getPriorityColor, getPriorityLabel } from '@/lib/assessmentUtils';

interface ProtocolData {
  id: string;
  name: string | null;
  priority_level: string;
  frequency_per_week: number | null;
  duration_weeks: number | null;
  exercises: unknown;
}

interface ProtocolTabProps {
  protocol: ProtocolData | null;
  onGenerateProtocol: () => void;
}

export function ProtocolTab({ protocol, onGenerateProtocol }: ProtocolTabProps) {
  if (!protocol) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum protocolo gerado</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={onGenerateProtocol}
          >
            Gerar Protocolo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{protocol.name || 'Protocolo FABRIK'}</CardTitle>
              <CardDescription className="mt-1">
                {protocol.frequency_per_week}x/semana • {protocol.duration_weeks} semanas
              </CardDescription>
            </div>
            <Badge className={getPriorityColor(protocol.priority_level)}>
              {getPriorityLabel(protocol.priority_level)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Exercises grouped by phase */}
      {protocol.exercises && Array.isArray(protocol.exercises) && (
        <div className="space-y-4">
          {Object.entries(
            (protocol.exercises as any[]).reduce((acc: any, ex: any) => {
              const phase = ex.phase || 'other';
              if (!acc[phase]) acc[phase] = [];
              acc[phase].push(ex);
              return acc;
            }, {})
          ).map(([phase, exercises]) => {
            const config = phaseConfig[phase] || { label: phase, icon: Dumbbell, color: 'text-muted-foreground' };
            const PhaseIcon = config.icon;
            return (
              <Card key={phase}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PhaseIcon className={`w-4 h-4 ${config.color}`} />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(exercises as any[]).map((ex, idx) => (
                      <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{ex.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ex.sets} séries • {ex.reps}
                            </p>
                          </div>
                          {ex.targetMuscles && (
                            <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                              {(ex.targetMuscles as string[]).slice(0, 2).map(m => (
                                <Badge key={m} variant="outline" className="text-xs">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {ex.instructions && (
                          <p className="text-xs text-muted-foreground mt-2">{ex.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
