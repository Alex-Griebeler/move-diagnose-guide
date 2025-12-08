import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PhysicalActivityStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const activityTypeOptions = [
  { value: 'strength', label: 'Musculação/Força' },
  { value: 'cardio', label: 'Cardio (corrida, bike, natação)' },
  { value: 'hiit', label: 'HIIT/Funcional' },
  { value: 'yoga', label: 'Yoga/Pilates' },
  { value: 'sports', label: 'Esportes coletivos' },
  { value: 'martial', label: 'Artes marciais' },
  { value: 'dance', label: 'Dança' },
  { value: 'walking', label: 'Caminhada' },
  { value: 'other', label: 'Outros' },
];

const frequencyOptions = [
  { value: '0', label: 'Sedentário (nenhuma)' },
  { value: '1', label: '1x por semana' },
  { value: '2', label: '2x por semana' },
  { value: '3', label: '3x por semana' },
  { value: '4', label: '4x por semana' },
  { value: '5', label: '5x por semana' },
  { value: '6', label: '6x por semana' },
  { value: '7', label: 'Diariamente' },
];

export function PhysicalActivityStep({ data, updateData }: PhysicalActivityStepProps) {
  const handleActivityTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      updateData({ activityTypes: [...data.activityTypes, type] });
    } else {
      updateData({ activityTypes: data.activityTypes.filter((t) => t !== type) });
    }
  };

  const getActivityLevel = () => {
    const freq = parseInt(data.activityFrequency) || 0;
    if (freq === 0) return { level: 'Sedentário', color: 'text-destructive' };
    if (freq <= 2) return { level: 'Pouco ativo', color: 'text-warning' };
    if (freq <= 4) return { level: 'Moderadamente ativo', color: 'text-muted-foreground' };
    return { level: 'Muito ativo', color: 'text-success' };
  };

  const activityLevel = getActivityLevel();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Atividade Física Atual</h3>
        <p className="text-sm text-muted-foreground">
          Descreva sua rotina de exercícios atual.
        </p>
      </div>

      <div className="space-y-6">
        {/* Frequency */}
        <div className="space-y-2">
          <Label>Frequência de treinos</Label>
          <Select
            value={data.activityFrequency}
            onValueChange={(value) => updateData({ activityFrequency: value })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione a frequência" />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {data.activityFrequency && (
            <p className={`text-sm ${activityLevel.color}`}>
              Nível: {activityLevel.level}
            </p>
          )}
        </div>

        {/* Activity Types */}
        <div className="space-y-3">
          <Label>Tipos de atividade (selecione todos que pratica)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activityTypeOptions.map((type) => (
              <div key={type.value} className="flex items-center space-x-3">
                <Checkbox
                  id={type.value}
                  checked={data.activityTypes.includes(type.value)}
                  onCheckedChange={(checked) => 
                    handleActivityTypeChange(type.value, checked as boolean)
                  }
                />
                <Label htmlFor={type.value} className="cursor-pointer font-normal">
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">Duração média por sessão (minutos)</Label>
          <Input
            id="duration"
            type="number"
            min="0"
            max="300"
            placeholder="Ex: 60"
            value={data.activityDurationMinutes}
            onChange={(e) => updateData({ activityDurationMinutes: e.target.value })}
            className="h-11"
          />
        </div>

        {/* Weekly Volume Estimate */}
        {data.activityFrequency && data.activityDurationMinutes && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Volume semanal estimado:</span>{' '}
              <span className="text-foreground">
                {parseInt(data.activityFrequency) * parseInt(data.activityDurationMinutes)} minutos
              </span>
              <br />
              <span className="text-muted-foreground text-xs">
                (OMS recomenda mínimo de 150 minutos/semana de atividade moderada)
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
