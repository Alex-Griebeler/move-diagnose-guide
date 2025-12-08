import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface RoutineHabitsStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const workTypes = [
  { value: 'sedentary', label: 'Sedentário (escritório, computador)' },
  { value: 'light', label: 'Leve (em pé, caminhadas curtas)' },
  { value: 'moderate', label: 'Moderado (movimento frequente)' },
  { value: 'heavy', label: 'Pesado (carga física intensa)' },
  { value: 'variable', label: 'Variado (misto)' },
];

export function RoutineHabitsStep({ data, updateData }: RoutineHabitsStepProps) {
  const sedentaryHours = data.sedentaryHoursPerDay ? parseFloat(data.sedentaryHoursPerDay) : 0;

  const getSedentaryWarning = (hours: number) => {
    if (hours >= 10) return { level: 'destructive', message: 'Risco elevado - comportamento muito sedentário' };
    if (hours >= 8) return { level: 'warning', message: 'Atenção - tempo sedentário acima do recomendado' };
    if (hours >= 6) return { level: 'muted', message: 'Moderado - considere pausas ativas' };
    return null;
  };

  const warning = getSedentaryWarning(sedentaryHours);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Rotina e Hábitos</h3>
        <p className="text-sm text-muted-foreground">
          Informações sobre o dia-a-dia que podem influenciar padrões de movimento.
        </p>
      </div>

      <div className="space-y-6">
        {/* Sedentary Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Horas sentado por dia</Label>
            <span className="text-lg font-semibold">{sedentaryHours}h</span>
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
          
          {warning && (
            <div className={`p-3 rounded-lg text-sm ${
              warning.level === 'destructive' 
                ? 'bg-destructive/10 text-destructive' 
                : warning.level === 'warning'
                ? 'bg-warning/10 text-warning'
                : 'bg-muted text-muted-foreground'
            }`}>
              {warning.message}
            </div>
          )}
        </div>

        {/* Work Type */}
        <div className="space-y-2">
          <Label>Tipo de Trabalho</Label>
          <Select
            value={data.workType}
            onValueChange={(value) => updateData({ workType: value })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione o tipo de trabalho" />
            </SelectTrigger>
            <SelectContent>
              {workTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <p className="text-sm">
            <span className="font-medium">Por que isso importa?</span>
            <br />
            <span className="text-muted-foreground">
              O tempo sedentário e o tipo de trabalho influenciam diretamente padrões de movimento, 
              encurtamentos musculares e a priorização de exercícios no protocolo.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
