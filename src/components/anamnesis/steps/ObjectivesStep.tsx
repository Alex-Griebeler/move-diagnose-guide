import { Target } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ObjectivesStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const objectiveOptions = [
  { value: 'mobility', label: 'Melhorar mobilidade' },
  { value: 'pain_reduction', label: 'Reduzir dor' },
  { value: 'injury_prevention', label: 'Prevenir lesões' },
  { value: 'posture', label: 'Melhorar postura' },
  { value: 'muscle_gain', label: 'Ganhar massa muscular' },
  { value: 'health_longevity', label: 'Saúde e longevidade' },
  { value: 'sport_performance', label: 'Performance esportiva' },
  { value: 'competition_prep', label: 'Preparação para competição' },
  { value: 'return_activity', label: 'Retorno pós-lesão' },
  { value: 'functional_strength', label: 'Força funcional' },
];

const timeHorizonOptions = [
  { value: '1month', label: '1 mês' },
  { value: '3months', label: '3 meses' },
  { value: '6months', label: '6 meses' },
  { value: '1year', label: '1 ano' },
  { value: 'ongoing', label: 'Contínuo / Sem prazo' },
];

export function ObjectivesStep({ data, updateData }: ObjectivesStepProps) {
  // Fallback for persisted data
  const selectedObjectives = data.selectedObjectives || [];

  const handleObjectiveToggle = (value: string) => {
    const newObjectives = selectedObjectives.includes(value)
      ? selectedObjectives.filter((o) => o !== value)
      : [...selectedObjectives, value];
    
    updateData({ selectedObjectives: newObjectives });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Objetivos</h3>
        <p className="text-sm text-muted-foreground">
          Selecione os objetivos principais do aluno para direcionar o protocolo.
        </p>
      </div>

      {/* Objectives Chips */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <Target className="w-4 h-4" />
          <Label className="text-base font-medium">Objetivos Principais</Label>
        </div>

        <div className="flex flex-wrap gap-2">
          {objectiveOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleObjectiveToggle(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                selectedObjectives.includes(option.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Horizon */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <Label className="text-sm">Horizonte temporal</Label>
        <Select
          value={data.timeHorizon}
          onValueChange={(value) => updateData({ timeHorizon: value })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Em quanto tempo espera atingir os objetivos?" />
          </SelectTrigger>
          <SelectContent>
            {timeHorizonOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Other Objectives (secondary) */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">Outros objetivos (opcional)</Label>
        <Textarea
          placeholder="Algo mais específico?"
          value={data.otherObjectives || ''}
          onChange={(e) => updateData({ otherObjectives: e.target.value })}
          rows={2}
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
}
