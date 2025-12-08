import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface PainHistoryStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const bodyRegions = [
  'Cervical',
  'Ombro Direito',
  'Ombro Esquerdo',
  'Cotovelo Direito',
  'Cotovelo Esquerdo',
  'Punho/Mão Direita',
  'Punho/Mão Esquerda',
  'Torácica',
  'Lombar',
  'Quadril Direito',
  'Quadril Esquerdo',
  'Joelho Direito',
  'Joelho Esquerdo',
  'Tornozelo/Pé Direito',
  'Tornozelo/Pé Esquerdo',
];

const durationOptions = [
  { value: 'acute', label: 'Aguda (< 6 semanas)' },
  { value: 'subacute', label: 'Subaguda (6-12 semanas)' },
  { value: 'chronic', label: 'Crônica (> 12 semanas)' },
  { value: 'recurrent', label: 'Recorrente' },
];

export function PainHistoryStep({ data, updateData }: PainHistoryStepProps) {
  const [newPain, setNewPain] = useState({
    region: '',
    intensity: 5,
    duration: '',
    description: '',
  });

  const addPain = () => {
    if (newPain.region) {
      updateData({
        painHistory: [...data.painHistory, { ...newPain }],
      });
      setNewPain({ region: '', intensity: 5, duration: '', description: '' });
    }
  };

  const removePain = (index: number) => {
    updateData({
      painHistory: data.painHistory.filter((_, i) => i !== index),
    });
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity <= 3) return 'text-success';
    if (intensity <= 6) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Histórico de Dor e Lesões</h3>
        <p className="text-sm text-muted-foreground">
          Registre dores atuais ou recentes por região corporal.
        </p>
      </div>

      {/* Current Pain List */}
      {data.painHistory.length > 0 && (
        <div className="space-y-3">
          {data.painHistory.map((pain, index) => (
            <Card key={index} className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pain.region}</span>
                      <span className={`text-sm font-semibold ${getIntensityColor(pain.intensity)}`}>
                        EVA {pain.intensity}/10
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {durationOptions.find(d => d.value === pain.duration)?.label}
                    </p>
                    {pain.description && (
                      <p className="text-sm">{pain.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePain(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Pain Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">Adicionar novo registro</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Região Corporal</Label>
              <Select
                value={newPain.region}
                onValueChange={(value) => setNewPain({ ...newPain, region: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a região" />
                </SelectTrigger>
                <SelectContent>
                  {bodyRegions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duração</Label>
              <Select
                value={newPain.duration}
                onValueChange={(value) => setNewPain({ ...newPain, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Intensidade (EVA): {newPain.intensity}/10</Label>
            <Slider
              value={[newPain.intensity]}
              onValueChange={([value]) => setNewPain({ ...newPain, intensity: value })}
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

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Descreva características da dor, fatores de piora/melhora..."
              value={newPain.description}
              onChange={(e) => setNewPain({ ...newPain, description: e.target.value })}
              rows={2}
            />
          </div>

          <Button
            onClick={addPain}
            disabled={!newPain.region}
            className="w-full"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Registro
          </Button>
        </CardContent>
      </Card>

      {data.painHistory.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma dor registrada. Se o aluno não apresenta queixas, prossiga para a próxima etapa.
        </p>
      )}
    </div>
  );
}
