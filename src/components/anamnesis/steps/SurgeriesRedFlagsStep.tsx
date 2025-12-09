import { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SurgeriesRedFlagsStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const surgeryRegions = [
  'Coluna Cervical',
  'Coluna Torácica',
  'Coluna Lombar',
  'Ombro',
  'Cotovelo',
  'Punho/Mão',
  'Quadril',
  'Joelho',
  'Tornozelo/Pé',
  'Abdômen',
  'Tórax',
  'Outro',
];

const lateralityOptions = [
  { value: 'direito', label: 'Direito' },
  { value: 'esquerdo', label: 'Esquerdo' },
  { value: 'bilateral', label: 'Bilateral' },
  { value: 'na', label: 'N/A (Central)' },
];

const redFlagItems = [
  { key: 'unexplainedWeightLoss', label: 'Perda de peso inexplicada' },
  { key: 'nightPain', label: 'Dor noturna que não melhora com posição' },
  { key: 'fever', label: 'Febre associada à dor' },
  { key: 'bladderBowelDysfunction', label: 'Disfunção de bexiga ou intestino' },
  { key: 'progressiveWeakness', label: 'Fraqueza progressiva em membros' },
  { key: 'recentTrauma', label: 'Trauma recente significativo' },
  { key: 'cancerHistory', label: 'Histórico de câncer' },
  { key: 'osteoporosis', label: 'Osteoporose diagnosticada' },
] as const;

export function SurgeriesRedFlagsStep({ data, updateData }: SurgeriesRedFlagsStepProps) {
  const [newSurgery, setNewSurgery] = useState({
    type: '',
    year: '',
    region: '',
    laterality: '',
  });

  const addSurgery = () => {
    if (newSurgery.type && newSurgery.region) {
      updateData({
        surgeries: [...data.surgeries, { ...newSurgery }],
      });
      setNewSurgery({ type: '', year: '', region: '', laterality: '' });
    }
  };

  const formatSurgeryDisplay = (surgery: { region: string; laterality?: string; year?: string }) => {
    const lateralityLabel = lateralityOptions.find(l => l.value === surgery.laterality)?.label;
    const parts = [surgery.region];
    if (surgery.laterality && surgery.laterality !== 'na') {
      parts.push(lateralityLabel || surgery.laterality);
    }
    if (surgery.year) {
      parts.push(surgery.year);
    }
    return parts.join(', ');
  };

  const removeSurgery = (index: number) => {
    updateData({
      surgeries: data.surgeries.filter((_, i) => i !== index),
    });
  };

  const handleRedFlagChange = (key: keyof typeof data.redFlags, checked: boolean) => {
    updateData({
      redFlags: { ...data.redFlags, [key]: checked },
    });
  };

  const hasAnyRedFlag = Object.values(data.redFlags).some(Boolean);

  return (
    <div className="space-y-6">
      {/* Surgeries Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Cirurgias Anteriores</h3>
          <p className="text-sm text-muted-foreground">
            Registre procedimentos cirúrgicos relevantes.
          </p>
        </div>

        {/* Surgery List */}
        {data.surgeries.length > 0 && (
          <div className="space-y-2">
            {data.surgeries.map((surgery, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{surgery.type}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({formatSurgeryDisplay(surgery)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSurgery(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Surgery Form */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Cirurgia</Label>
                <Input
                  placeholder="Ex: Artroscopia, Reconstrução LCA..."
                  value={newSurgery.type}
                  onChange={(e) => setNewSurgery({ ...newSurgery, type: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Região</Label>
                <Select
                  value={newSurgery.region}
                  onValueChange={(value) => setNewSurgery({ ...newSurgery, region: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {surgeryRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lado</Label>
                <Select
                  value={newSurgery.laterality}
                  onValueChange={(value) => setNewSurgery({ ...newSurgery, laterality: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o lado" />
                  </SelectTrigger>
                  <SelectContent>
                    {lateralityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  placeholder="Ex: 2022"
                  value={newSurgery.year}
                  onChange={(e) => setNewSurgery({ ...newSurgery, year: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={addSurgery}
              disabled={!newSurgery.type || !newSurgery.region}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cirurgia
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Red Flags Section */}
      <Card className={hasAnyRedFlag ? 'border-destructive' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className={`w-5 h-5 ${hasAnyRedFlag ? 'text-destructive' : 'text-warning'}`} />
            Red Flags - Sinais de Alerta
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Marque se o aluno apresentar algum dos sinais abaixo. Se positivo, encaminhe para avaliação médica.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {redFlagItems.map((item) => (
            <div key={item.key} className="flex items-center space-x-3">
              <Checkbox
                id={item.key}
                checked={data.redFlags[item.key]}
                onCheckedChange={(checked) => 
                  handleRedFlagChange(item.key, checked as boolean)
                }
              />
              <Label
                htmlFor={item.key}
                className={`cursor-pointer ${data.redFlags[item.key] ? 'text-destructive font-medium' : ''}`}
              >
                {item.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {hasAnyRedFlag && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm font-medium text-destructive">
            ⚠️ Atenção: Red Flags detectados
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Recomenda-se avaliação médica antes de prosseguir com exercícios. 
            A avaliação pode continuar para fins de registro, mas o protocolo deve aguardar liberação médica.
          </p>
        </div>
      )}
    </div>
  );
}
