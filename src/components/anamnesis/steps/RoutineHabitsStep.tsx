import { Briefcase } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface RoutineHabitsStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const workTypeOptions = [
  { value: 'sedentary', label: 'Sedentário', description: 'Escritório, computador' },
  { value: 'light', label: 'Leve', description: 'Em pé, caminhadas curtas' },
  { value: 'moderate', label: 'Moderado', description: 'Movimento frequente' },
  { value: 'heavy', label: 'Pesado', description: 'Carga física intensa' },
  { value: 'variable', label: 'Variado', description: 'Misto' },
];

export function RoutineHabitsStep({ data, updateData }: RoutineHabitsStepProps) {
  const sedentaryHours = data.sedentaryHoursPerDay ? parseFloat(data.sedentaryHoursPerDay) : 0;

  const getSedentaryLevel = (hours: number) => {
    if (hours >= 10) return { color: 'text-destructive', label: 'Muito alto' };
    if (hours >= 8) return { color: 'text-warning', label: 'Alto' };
    if (hours >= 6) return { color: 'text-muted-foreground', label: 'Moderado' };
    return { color: 'text-success', label: 'Baixo' };
  };

  const level = getSedentaryLevel(sedentaryHours);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Rotina e Hábitos</h3>
        <p className="text-sm text-muted-foreground">
          Informações sobre o dia-a-dia que influenciam padrões de movimento.
        </p>
      </div>

      {/* Sedentary Hours */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Horas sentado por dia</Label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tabular-nums">{sedentaryHours}h</span>
            <span className={cn("text-xs", level.color)}>({level.label})</span>
          </div>
        </div>
        <Slider
          value={[sedentaryHours]}
          onValueChange={([value]) => updateData({ sedentaryHoursPerDay: value.toString() })}
          min={0}
          max={16}
          step={0.5}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0h</span>
          <span>8h</span>
          <span>16h</span>
        </div>
      </div>

      {/* Work Type - Chips */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-foreground">
          <Briefcase className="w-4 h-4" />
          <Label className="text-base font-medium">Tipo de Trabalho</Label>
        </div>

        <div className="flex flex-wrap gap-2">
          {workTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ workType: option.value })}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                data.workType === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {data.workType && (
          <p className="text-sm text-muted-foreground">
            {workTypeOptions.find(w => w.value === data.workType)?.description}
          </p>
        )}
      </div>
    </div>
  );
}
