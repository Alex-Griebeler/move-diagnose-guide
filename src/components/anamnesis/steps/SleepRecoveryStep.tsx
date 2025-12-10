import { Moon } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface SleepRecoveryStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const sleepHoursOptions = [
  { value: '5', label: '<6h' },
  { value: '6', label: '6h' },
  { value: '7', label: '7h' },
  { value: '8', label: '8h' },
  { value: '9', label: '9h' },
  { value: '10', label: '10h+' },
];

export function SleepRecoveryStep({ data, updateData }: SleepRecoveryStepProps) {
  const getQualityLabel = (quality: number) => {
    if (quality <= 2) return 'Muito ruim';
    if (quality <= 4) return 'Ruim';
    if (quality <= 6) return 'Regular';
    if (quality <= 8) return 'Bom';
    return 'Excelente';
  };

  const getQualityColor = (quality: number) => {
    if (quality <= 3) return 'text-destructive';
    if (quality <= 5) return 'text-warning';
    if (quality <= 7) return 'text-muted-foreground';
    return 'text-success';
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Sono e Recuperação</h3>
        <p className="text-sm text-muted-foreground">
          A qualidade do sono impacta diretamente a recuperação e adaptação ao exercício.
        </p>
      </div>

      {/* Sleep Quality Slider */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <Moon className="w-4 h-4" />
          <Label className="text-base font-medium">Qualidade do Sono</Label>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Como você avalia?</span>
          <span className={cn("font-semibold", getQualityColor(data.sleepQuality))}>
            {data.sleepQuality}/10 - {getQualityLabel(data.sleepQuality)}
          </span>
        </div>
        
        <Slider
          value={[data.sleepQuality]}
          onValueChange={([value]) => updateData({ sleepQuality: value })}
          min={1}
          max={10}
          step={1}
          className="py-2"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Péssimo</span>
          <span>Regular</span>
          <span>Excelente</span>
        </div>
      </div>

      {/* Sleep Hours - Chips */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <Label className="text-sm">Horas de sono por noite (média)</Label>
        
        <div className="flex flex-wrap gap-2">
          {sleepHoursOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ sleepHours: option.value })}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all border min-w-[50px]",
                data.sleepHours === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {data.sleepHours && parseFloat(data.sleepHours) < 6 && (
          <p className="text-sm text-warning">
            Sono insuficiente - pode impactar recuperação
          </p>
        )}
      </div>
    </div>
  );
}
