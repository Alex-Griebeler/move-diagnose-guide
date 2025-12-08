import { Moon, Sun } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SleepRecoveryStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

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

  const sleepHours = data.sleepHours ? parseFloat(data.sleepHours) : 0;
  const getSleepWarning = (hours: number) => {
    if (hours > 0 && hours < 6) return 'Sono insuficiente - pode impactar recuperação';
    if (hours > 9) return 'Sono prolongado - verificar qualidade';
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Sono e Recuperação</h3>
        <p className="text-sm text-muted-foreground">
          A qualidade do sono impacta diretamente a recuperação e adaptação ao exercício.
        </p>
      </div>

      <div className="space-y-8">
        {/* Sleep Quality */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Qualidade do Sono (subjetiva)
            </Label>
            <span className={`font-semibold ${getQualityColor(data.sleepQuality)}`}>
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

        {/* Sleep Hours */}
        <div className="space-y-2">
          <Label htmlFor="sleepHours" className="flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Horas de sono por noite (média)
          </Label>
          <Input
            id="sleepHours"
            type="number"
            step="0.5"
            min="0"
            max="16"
            placeholder="Ex: 7.5"
            value={data.sleepHours}
            onChange={(e) => updateData({ sleepHours: e.target.value })}
            className="h-11"
          />
          
          {getSleepWarning(sleepHours) && (
            <p className="text-sm text-warning">{getSleepWarning(sleepHours)}</p>
          )}
        </div>

        {/* Sleep Recommendations */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Recomendações por faixa etária:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Adultos (18-64 anos): 7-9 horas</li>
            <li>• Idosos (65+ anos): 7-8 horas</li>
            <li>• Atletas: 8-10 horas para otimizar recuperação</li>
          </ul>
        </div>

        {/* Future Integration Note */}
        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">💡 Em breve:</span> Integração com wearables 
            (Oura Ring, Whoop, Garmin) para dados objetivos de sono e HRV.
          </p>
        </div>
      </div>
    </div>
  );
}
