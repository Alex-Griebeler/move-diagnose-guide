import { AnamnesisData } from '../AnamnesisWizard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ObjectivesStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

const timeHorizonOptions = [
  { value: '1month', label: '1 mês' },
  { value: '3months', label: '3 meses' },
  { value: '6months', label: '6 meses' },
  { value: '1year', label: '1 ano' },
  { value: 'ongoing', label: 'Contínuo/Sem prazo definido' },
];

const objectiveExamples = [
  'Melhorar mobilidade geral',
  'Reduzir dor lombar',
  'Voltar a correr após lesão',
  'Melhorar performance no esporte',
  'Prevenir lesões',
  'Ganhar força funcional',
  'Melhorar postura',
  'Preparação para competição',
];

export function ObjectivesStep({ data, updateData }: ObjectivesStepProps) {
  const addExample = (example: string) => {
    const currentText = data.objectives || '';
    const newText = currentText ? `${currentText}\n• ${example}` : `• ${example}`;
    updateData({ objectives: newText });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Objetivos</h3>
        <p className="text-sm text-muted-foreground">
          Defina as metas do aluno para direcionar o protocolo.
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Objectives */}
        <div className="space-y-2">
          <Label>Objetivos principais</Label>
          <Textarea
            placeholder="Descreva os objetivos do aluno..."
            value={data.objectives}
            onChange={(e) => updateData({ objectives: e.target.value })}
            rows={4}
            className="resize-none"
          />
          
          {/* Quick add examples */}
          <div className="flex flex-wrap gap-2 mt-2">
            {objectiveExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => addExample(example)}
                className="text-xs px-2 py-1 rounded-full border border-border hover:border-accent hover:text-accent transition-colors"
              >
                + {example}
              </button>
            ))}
          </div>
        </div>

        {/* Time Horizon */}
        <div className="space-y-2">
          <Label>Horizonte temporal</Label>
          <Select
            value={data.timeHorizon}
            onValueChange={(value) => updateData({ timeHorizon: value })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Em quanto tempo espera atingir os objetivos?" />
            </SelectTrigger>
            <SelectContent>
              {timeHorizonOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SMART Goals Info */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Dicas para objetivos efetivos:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <span className="font-medium">Específico:</span> O que exatamente quer alcançar?</li>
            <li>• <span className="font-medium">Mensurável:</span> Como saberá que atingiu?</li>
            <li>• <span className="font-medium">Realista:</span> É possível no prazo definido?</li>
            <li>• <span className="font-medium">Relevante:</span> Faz sentido para o aluno?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
