import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Stethoscope } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SurgeriesRedFlagsStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const surgeryRegions = [
  { value: 'cervical', label: 'Cervical' },
  { value: 'thoracic', label: 'Torácica' },
  { value: 'lumbar', label: 'Lombar' },
  { value: 'shoulder', label: 'Ombro' },
  { value: 'elbow', label: 'Cotovelo' },
  { value: 'wrist', label: 'Punho/Mão' },
  { value: 'hip', label: 'Quadril' },
  { value: 'knee', label: 'Joelho' },
  { value: 'ankle', label: 'Tornozelo/Pé' },
  { value: 'abdomen', label: 'Abdômen' },
  { value: 'other', label: 'Outro' },
];

const lateralityOptions = [
  { value: 'direito', label: 'D' },
  { value: 'esquerdo', label: 'E' },
  { value: 'bilateral', label: 'Bilateral' },
];

const redFlagItems = [
  { key: 'unexplainedWeightLoss', label: 'Perda de peso inexplicada' },
  { key: 'nightPain', label: 'Dor noturna que não melhora' },
  { key: 'fever', label: 'Febre associada à dor' },
  { key: 'bladderBowelDysfunction', label: 'Disfunção bexiga/intestino' },
  { key: 'progressiveWeakness', label: 'Fraqueza progressiva' },
  { key: 'recentTrauma', label: 'Trauma recente significativo' },
  { key: 'cancerHistory', label: 'Histórico de câncer' },
  { key: 'osteoporosis', label: 'Osteoporose' },
] as const;

export function SurgeriesRedFlagsStep({ data, updateData }: SurgeriesRedFlagsStepProps) {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedLaterality, setSelectedLaterality] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [surgeryYear, setSurgeryYear] = useState('');

  const surgeries = data.surgeries || [];

  const addSurgery = () => {
    if (surgeryType && selectedRegion) {
      const regionLabel = surgeryRegions.find(r => r.value === selectedRegion)?.label || selectedRegion;
      updateData({
        surgeries: [...surgeries, { 
          type: surgeryType, 
          region: regionLabel,
          laterality: selectedLaterality,
          year: surgeryYear 
        }],
      });
      setSelectedRegion('');
      setSelectedLaterality('');
      setSurgeryType('');
      setSurgeryYear('');
    }
  };

  const removeSurgery = (index: number) => {
    updateData({
      surgeries: surgeries.filter((_, i) => i !== index),
    });
  };

  const handleRedFlagChange = (key: keyof typeof data.redFlags) => {
    const newValue = !data.redFlags[key];
    updateData({
      redFlags: { ...data.redFlags, [key]: newValue },
    });
  };

  const hasAnyRedFlag = Object.values(data.redFlags).some(Boolean);

  const formatSurgeryDisplay = (surgery: { region: string; laterality?: string; year?: string }) => {
    const parts = [surgery.region];
    if (surgery.laterality) parts.push(surgery.laterality === 'direito' ? 'D' : surgery.laterality === 'esquerdo' ? 'E' : 'Bil');
    if (surgery.year) parts.push(surgery.year);
    return parts.join(' · ');
  };

  return (
    <div className="space-y-8">
      {/* Surgeries Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Cirurgias Anteriores</h3>
          <p className="text-sm text-muted-foreground">
            Registre procedimentos cirúrgicos relevantes.
          </p>
        </div>

        {/* Region Chips */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Stethoscope className="w-4 h-4" />
            <Label className="text-base font-medium">Região</Label>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {surgeryRegions.map((region) => (
              <button
                key={region.value}
                type="button"
                onClick={() => setSelectedRegion(region.value)}
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

        {/* Surgery Details - Show when region selected */}
        {selectedRegion && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50 animate-fade-in">
            {/* Laterality Chips */}
            <div className="space-y-2">
              <Label className="text-sm">Lado</Label>
              <div className="flex gap-2">
                {lateralityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedLaterality(option.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      selectedLaterality === option.value
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-accent/50"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo de Cirurgia</Label>
                <Input
                  placeholder="Ex: Artroscopia"
                  value={surgeryType}
                  onChange={(e) => setSurgeryType(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ano</Label>
                <Input
                  type="number"
                  placeholder="2022"
                  value={surgeryYear}
                  onChange={(e) => setSurgeryYear(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <Button
              onClick={addSurgery}
              disabled={!surgeryType || !selectedRegion}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cirurgia
            </Button>
          </div>
        )}

        {/* Surgery List */}
        {surgeries.length > 0 && (
          <div className="space-y-2 pt-2">
            {surgeries.map((surgery, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/50 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{surgery.type}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({formatSurgeryDisplay(surgery)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSurgery(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Red Flags Section */}
      <div className={cn(
        "space-y-4 pt-6 border-t",
        hasAnyRedFlag ? "border-destructive/50" : "border-border"
      )}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn("w-5 h-5", hasAnyRedFlag ? "text-destructive" : "text-warning")} />
          <Label className="text-base font-medium">Red Flags</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Marque se o aluno apresentar algum dos sinais abaixo.
        </p>

        <div className="flex flex-wrap gap-2">
          {redFlagItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleRedFlagChange(item.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                data.redFlags[item.key]
                  ? "bg-destructive/10 text-destructive border-destructive"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-destructive/50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {hasAnyRedFlag && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Red Flags detectados - Encaminhar para avaliação médica
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
