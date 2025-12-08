import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface SportsDemandStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const sportsList = [
  'Futebol',
  'Basquete',
  'Vôlei',
  'Tênis',
  'Natação',
  'Corrida',
  'Ciclismo',
  'Triathlon',
  'CrossFit',
  'Jiu-Jitsu',
  'Boxe/MMA',
  'Golfe',
  'Surf',
  'Escalada',
  'Musculação Competitiva',
  'Powerlifting',
  'Outro',
];

const frequencyOptions = [
  { value: 'recreational', label: 'Recreativo (eventual)' },
  { value: 'regular', label: 'Regular (1-2x/semana)' },
  { value: 'frequent', label: 'Frequente (3-4x/semana)' },
  { value: 'intense', label: 'Intenso (5+x/semana)' },
];

const levelOptions = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
  { value: 'competitive', label: 'Competitivo' },
  { value: 'professional', label: 'Profissional' },
];

export function SportsDemandStep({ data, updateData }: SportsDemandStepProps) {
  const [newSport, setNewSport] = useState({
    name: '',
    frequency: '',
    level: '',
  });

  const addSport = () => {
    if (newSport.name) {
      updateData({
        sports: [...data.sports, { ...newSport }],
      });
      setNewSport({ name: '', frequency: '', level: '' });
    }
  };

  const removeSport = (index: number) => {
    updateData({
      sports: data.sports.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Demandas Esportivas</h3>
        <p className="text-sm text-muted-foreground">
          Esportes praticados influenciam os padrões de movimento e prioridades do protocolo.
        </p>
      </div>

      {/* Sports List */}
      {data.sports.length > 0 && (
        <div className="space-y-2">
          {data.sports.map((sport, index) => (
            <Card key={index} className="bg-muted/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{sport.name}</span>
                  <div className="text-sm text-muted-foreground">
                    {frequencyOptions.find(f => f.value === sport.frequency)?.label || sport.frequency}
                    {sport.level && ` • ${levelOptions.find(l => l.value === sport.level)?.label || sport.level}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSport(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Sport Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">Adicionar esporte</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Esporte</Label>
              <Select
                value={newSport.name}
                onValueChange={(value) => setNewSport({ ...newSport, name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sportsList.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={newSport.frequency}
                onValueChange={(value) => setNewSport({ ...newSport, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nível</Label>
              <Select
                value={newSport.level}
                onValueChange={(value) => setNewSport({ ...newSport, level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={addSport}
            disabled={!newSport.name}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Esporte
          </Button>
        </CardContent>
      </Card>

      {data.sports.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum esporte adicionado. Se o aluno não pratica esportes específicos, prossiga para a próxima etapa.
        </p>
      )}

      {/* Sport Patterns Info */}
      <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">💡 Padrões típicos:</span> Cada esporte possui 
          demandas biomecânicas específicas que serão consideradas na análise. Por exemplo, corredores 
          costumam ter maior demanda de dorsiflexão e força de glúteos.
        </p>
      </div>
    </div>
  );
}
