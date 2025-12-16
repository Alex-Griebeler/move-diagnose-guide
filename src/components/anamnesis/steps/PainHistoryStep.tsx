import { useState } from 'react';
import { Plus, Trash2, Activity } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface PainHistoryStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const bodyRegions = [
  { value: 'cervical', label: 'Cervical' },
  { value: 'shoulder_r', label: 'Ombro D' },
  { value: 'shoulder_l', label: 'Ombro E' },
  { value: 'elbow_r', label: 'Cotovelo D' },
  { value: 'elbow_l', label: 'Cotovelo E' },
  { value: 'wrist_r', label: 'Punho D' },
  { value: 'wrist_l', label: 'Punho E' },
  { value: 'thoracic', label: 'Torácica' },
  { value: 'lumbar', label: 'Lombar' },
  { value: 'hip_r', label: 'Quadril D' },
  { value: 'hip_l', label: 'Quadril E' },
  { value: 'knee_r', label: 'Joelho D' },
  { value: 'knee_l', label: 'Joelho E' },
  { value: 'ankle_r', label: 'Tornozelo D' },
  { value: 'ankle_l', label: 'Tornozelo E' },
];

const durationOptions = [
  { value: 'acute', label: 'Aguda (< 6 sem)' },
  { value: 'subacute', label: 'Subaguda (6-12 sem)' },
  { value: 'chronic', label: 'Crônica (> 12 sem)' },
  { value: 'recurrent', label: 'Recorrente' },
];

export function PainHistoryStep({ data, updateData }: PainHistoryStepProps) {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [description, setDescription] = useState('');

  const painHistory = data.painHistory || [];

  const addPain = () => {
    if (selectedRegion && selectedDuration) {
      const regionLabel = bodyRegions.find(r => r.value === selectedRegion)?.label || selectedRegion;
      updateData({
        painHistory: [...painHistory, { 
          region: regionLabel, 
          intensity, 
          duration: selectedDuration, 
          description 
        }],
      });
      setSelectedRegion('');
      setSelectedDuration('');
      setIntensity(5);
      setDescription('');
    }
  };

  const removePain = (index: number) => {
    updateData({
      painHistory: painHistory.filter((_, i) => i !== index),
    });
  };

  const getIntensityColor = (val: number) => {
    if (val <= 3) return 'text-success';
    if (val <= 6) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Histórico de Dor</h3>
        <p className="text-sm text-muted-foreground">
          Registre dores atuais ou recentes. Selecione a região e informe os detalhes.
        </p>
      </div>

      {/* Region Selection - Chips */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <Activity className="w-4 h-4" />
          <Label className="text-base font-medium">Região com Dor</Label>
        </div>

        <div className="flex flex-wrap gap-2">
          {bodyRegions.map((region) => (
            <button
              key={region.value}
              type="button"
              onClick={() => setSelectedRegion(selectedRegion === region.value ? '' : region.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                selectedRegion === region.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pain Details - Show when region selected */}
      {selectedRegion && (
        <div className="space-y-6 p-4 bg-muted/30 rounded-lg border border-border/50 animate-fade-in">
          {/* Duration Chips */}
          <div className="space-y-3">
            <Label className="text-sm">Duração</Label>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedDuration(selectedDuration === option.value ? '' : option.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                    selectedDuration === option.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-muted/50 text-muted-foreground border-border hover:border-accent/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Intensidade (EVA)</Label>
              <span className={cn("font-semibold", getIntensityColor(intensity))}>
                {intensity}/10
              </span>
            </div>
            <Slider
              value={[intensity]}
              onValueChange={([value]) => setIntensity(value)}
              min={0}
              max={10}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sem dor</span>
              <span>Dor máxima</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Descrição (opcional)</Label>
            <Textarea
              placeholder="Características, fatores de piora/melhora..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <Button
            onClick={addPain}
            disabled={!selectedRegion || !selectedDuration}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Registro
          </Button>
        </div>
      )}

      {/* Current Pain List */}
      {painHistory.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/50">
          <Label className="text-sm text-muted-foreground">Registros adicionados:</Label>
          {painHistory.map((pain, index) => (
            <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/50 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{pain.region}</span>
                  <span className={cn("text-xs font-semibold", getIntensityColor(pain.intensity))}>
                    EVA {pain.intensity}/10
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {durationOptions.find(d => d.value === pain.duration)?.label}
                </p>
                {pain.description && (
                  <p className="text-xs text-muted-foreground">{pain.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removePain(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {painHistory.length === 0 && !selectedRegion && (
        <p className="text-sm text-muted-foreground text-center py-4 italic">
          Nenhuma dor registrada. Se o aluno não apresenta queixas, prossiga para a próxima etapa.
        </p>
      )}
    </div>
  );
}
