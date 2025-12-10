import { useState } from 'react';
import { Trash2, Dumbbell, Trophy } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PhysicalActivitySportsStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const modalityOptions = [
  { value: 'musculacao', label: 'Musculação' },
  { value: 'funcional', label: 'Treinamento Funcional' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'caminhada', label: 'Caminhada' },
  { value: 'danca', label: 'Dança' },
  { value: 'spinning', label: 'Spinning / Bike Indoor' },
  { value: 'corrida_leve', label: 'Corrida (treino leve)' },
  { value: 'ciclismo_recreativo', label: 'Ciclismo recreativo' },
  { value: 'natacao_recreativa', label: 'Natação recreativa' },
];

const sportOptions = [
  { value: 'corrida_competitiva', label: 'Corrida (competitiva / treino estruturado)' },
  { value: 'ciclismo_estrada', label: 'Ciclismo de Estrada' },
  { value: 'mountain_bike', label: 'Mountain Bike' },
  { value: 'natacao_tecnica', label: 'Natação (treino técnico)' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'futebol', label: 'Futebol' },
  { value: 'basquete', label: 'Basquete' },
  { value: 'volei', label: 'Vôlei' },
  { value: 'tenis', label: 'Tênis' },
  { value: 'beach_tennis', label: 'Beach Tennis' },
  { value: 'jiu_jitsu', label: 'Jiu-Jitsu' },
  { value: 'boxe_mma', label: 'Boxe / MMA' },
  { value: 'crossfit_competitivo', label: 'CrossFit (competitivo)' },
  { value: 'surf', label: 'Surf' },
];

const frequencyOptions = [
  { value: '1-2x', label: '1–2x' },
  { value: '3-4x', label: '3–4x' },
  { value: '5+', label: '5+' },
];

const durationOptions = [
  { value: '30-45min', label: '30–45 min' },
  { value: '45-60min', label: '45–60 min' },
  { value: '60-90min', label: '60–90 min' },
];

const levelOptions = [
  { value: 'recreational', label: 'Recreativo' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'competitive', label: 'Competitivo' },
  { value: 'professional', label: 'Profissional' },
];

export function PhysicalActivitySportsStep({ data, updateData }: PhysicalActivitySportsStepProps) {
  const [otherModality, setOtherModality] = useState('');
  const [otherSport, setOtherSport] = useState('');

  // Fallback for persisted data that may not have new fields
  const activityModalities = data.activityModalities || [];
  const sports = data.sports || [];

  const isSedentary = activityModalities.includes('sedentary');

  const handleModalityToggle = (value: string) => {
    if (value === 'sedentary') {
      // "Não pratico nada" is exclusive
      updateData({
        activityModalities: ['sedentary'],
        activityFrequency: null,
        activityDuration: null,
        isSedentary: true,
      });
    } else {
      // Remove sedentary if selecting other modalities
      const currentModalities = activityModalities.filter(m => m !== 'sedentary');
      const newModalities = currentModalities.includes(value)
        ? currentModalities.filter(m => m !== value)
        : [...currentModalities, value];
      
      updateData({
        activityModalities: newModalities,
        isSedentary: false,
      });
    }
  };

  const handleAddOtherModality = () => {
    if (otherModality.trim()) {
      const currentModalities = activityModalities.filter(m => m !== 'sedentary');
      updateData({
        activityModalities: [...currentModalities, `other:${otherModality.trim()}`],
        isSedentary: false,
      });
      setOtherModality('');
    }
  };

  const handleSportToggle = (sportValue: string) => {
    const existingIndex = sports.findIndex(s => s.name === sportValue);
    
    if (existingIndex >= 0) {
      updateData({
        sports: sports.filter((_, i) => i !== existingIndex),
      });
    } else {
      updateData({
        sports: [...sports, { name: sportValue, level: '', frequency: '' }],
      });
    }
  };

  const handleAddOtherSport = () => {
    if (otherSport.trim()) {
      updateData({
        sports: [...sports, { name: `other:${otherSport.trim()}`, level: '', frequency: '' }],
      });
      setOtherSport('');
    }
  };

  const updateSportDetails = (sportName: string, field: 'level' | 'frequency', value: string) => {
    updateData({
      sports: sports.map(s => 
        s.name === sportName ? { ...s, [field]: value } : s
      ),
    });
  };

  const removeSport = (sportName: string) => {
    updateData({
      sports: sports.filter(s => s.name !== sportName),
    });
  };

  const getSportLabel = (value: string) => {
    if (value.startsWith('other:')) return value.replace('other:', '');
    return sportOptions.find(s => s.value === value)?.label || value;
  };

  const getModalityLabel = (value: string) => {
    if (value.startsWith('other:')) return value.replace('other:', '');
    return modalityOptions.find(m => m.value === value)?.label || value;
  };

  const hasModalities = activityModalities.length > 0 && !isSedentary;
  // Fallback: treat undefined as false (default state)
  const practicesSports = data.practicesSports ?? false;
  const practicesSportsSelected = data.practicesSports === true;
  const notPracticesSportsSelected = data.practicesSports === false || data.practicesSports === undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Atividade Física e Esportes</h3>
        <p className="text-sm text-muted-foreground">
          Selecione as atividades que você pratica e informe com que frequência. Considere treinos gerais e esportes em que você participa com regularidade.
        </p>
      </div>

      {/* GROUP 1: Training Modalities */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <Dumbbell className="w-4 h-4" />
          <Label className="text-base font-medium">Modalidades de Treino</Label>
        </div>

        {/* Modality Chips */}
        <div className="flex flex-wrap gap-2">
          {modalityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleModalityToggle(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                activityModalities.includes(option.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {option.label}
            </button>
          ))}
          
          {/* Sedentary option */}
          <button
            type="button"
            onClick={() => handleModalityToggle('sedentary')}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
              isSedentary
                ? "bg-destructive/10 text-destructive border-destructive"
                : "bg-muted/50 text-muted-foreground border-border hover:border-destructive/50"
            )}
          >
            Não pratico nada
          </button>
        </div>

        {/* Other modality input */}
        <div className="flex gap-2">
          <Input
            placeholder="Outra modalidade..."
            value={otherModality}
            onChange={(e) => setOtherModality(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOtherModality()}
            className="flex-1 h-9"
            disabled={isSedentary}
          />
          <button
            type="button"
            onClick={handleAddOtherModality}
            disabled={!otherModality.trim() || isSedentary}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50 transition-colors"
          >
            Adicionar
          </button>
        </div>

        {/* Display selected "other" modalities */}
        {activityModalities.filter(m => m.startsWith('other:')).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activityModalities.filter(m => m.startsWith('other:')).map((m) => (
              <span
                key={m}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground flex items-center gap-2"
              >
                {getModalityLabel(m)}
                <button
                  type="button"
                  onClick={() => handleModalityToggle(m)}
                  className="hover:text-primary-foreground/70"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Frequency and Duration - only show if not sedentary and has modalities */}
        {hasModalities && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/50">
            <div className="space-y-3">
              <Label className="text-sm">Frequência semanal</Label>
              <RadioGroup
                value={data.activityFrequency || ''}
                onValueChange={(value) => updateData({ activityFrequency: value as '1-2x' | '3-4x' | '5+' })}
                className="flex gap-4"
              >
                {frequencyOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`freq-${option.value}`} />
                    <Label htmlFor={`freq-${option.value}`} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm">Duração média da sessão</Label>
              <RadioGroup
                value={data.activityDuration || ''}
                onValueChange={(value) => updateData({ activityDuration: value as '30-45min' | '45-60min' | '60-90min' })}
                className="flex gap-4"
              >
                {durationOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`dur-${option.value}`} />
                    <Label htmlFor={`dur-${option.value}`} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}
      </div>

      {/* GROUP 2: Sports */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-foreground">
          <Trophy className="w-4 h-4" />
          <Label className="text-base font-medium">Esportes Praticados</Label>
        </div>

        {/* Sports toggle question */}
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">
            Você pratica algum esporte com regularidade?
          </Label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => updateData({ practicesSports: true })}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                practicesSportsSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => updateData({ practicesSports: false, sports: [] })}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                notPracticesSportsSelected
                  ? "bg-muted text-foreground border-border"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-muted"
              )}
            >
              Não
            </button>
          </div>
        </div>

        {/* Sports selection - only if practicesSports is true */}
        {practicesSports && (
          <div className="space-y-4 animate-fade-in">
            {/* Sport chips */}
            <div className="flex flex-wrap gap-2">
            {sportOptions.map((option) => {
                const isSelected = sports.some(s => s.name === option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSportToggle(option.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      isSelected
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-accent/50"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Other sport input */}
            <div className="flex gap-2">
              <Input
                placeholder="Outro esporte..."
                value={otherSport}
                onChange={(e) => setOtherSport(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOtherSport()}
                className="flex-1 h-9"
              />
              <button
                type="button"
                onClick={handleAddOtherSport}
                disabled={!otherSport.trim()}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50 transition-colors"
              >
                Adicionar
              </button>
            </div>

            {/* Selected sports with details */}
            {sports.length > 0 && (
              <div className="space-y-3 pt-4">
                <Label className="text-sm text-muted-foreground">
                  Para cada esporte, informe nível e frequência:
                </Label>
                {sports.map((sport) => (
                  <div
                    key={sport.name}
                    className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{getSportLabel(sport.name)}</span>
                      <button
                        type="button"
                        onClick={() => removeSport(sport.name)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={sport.level}
                        onValueChange={(value) => updateSportDetails(sport.name, 'level', value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Nível" />
                        </SelectTrigger>
                        <SelectContent>
                          {levelOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={sport.frequency}
                        onValueChange={(value) => updateSportDetails(sport.name, 'frequency', value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Frequência" />
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {notPracticesSportsSelected && (
          <p className="text-sm text-muted-foreground italic">
            Prossiga para a próxima etapa.
          </p>
        )}
      </div>
    </div>
  );
}

