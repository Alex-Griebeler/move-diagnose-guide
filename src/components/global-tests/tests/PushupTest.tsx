import { Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { pushupCompensations, getAggregatedMuscles, CompensationMapping } from '@/data/compensationMappings';

interface PushupData {
  compensations: string[];
  notes: string;
}

interface PushupTestProps {
  data: PushupData;
  updateData: (data: PushupData) => void;
}

function CompensationCheckbox({
  compensation,
  checked,
  onCheckedChange,
}: {
  compensation: CompensationMapping;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        checked ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={compensation.id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-0.5"
        />
        <div className="space-y-1 flex-1">
          <Label htmlFor={compensation.id} className="cursor-pointer font-medium text-sm">
            {compensation.label}
          </Label>
          {checked && (
            <div className="space-y-2 mt-2 animate-fade-in">
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-destructive font-medium">Hiperativos:</span>
                {compensation.hyperactiveMuscles.slice(0, 3).map((m) => (
                  <Badge key={m} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                    {m}
                  </Badge>
                ))}
                {compensation.hyperactiveMuscles.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{compensation.hyperactiveMuscles.length - 3}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-success font-medium">Hipoativos:</span>
                {compensation.hypoactiveMuscles.slice(0, 3).map((m) => (
                  <Badge key={m} variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                    {m}
                  </Badge>
                ))}
                {compensation.hypoactiveMuscles.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{compensation.hypoactiveMuscles.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PushupTest({ data, updateData }: PushupTestProps) {
  const handleCompensationChange = (id: string, checked: boolean) => {
    const newList = checked
      ? [...data.compensations, id]
      : data.compensations.filter((c) => c !== id);
    updateData({ ...data, compensations: newList });
  };

  const aggregated = getAggregatedMuscles(pushupCompensations, data.compensations);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          💪 Push-up Test
        </h3>
        <p className="text-sm text-muted-foreground">
          Avalie o controle de core, estabilidade escapular e posição da coluna.
        </p>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Instruções do teste:</p>
              <ul className="text-muted-foreground list-disc list-inside space-y-1">
                <li>Posição de prancha alta, mãos na largura dos ombros</li>
                <li>Corpo em linha reta da cabeça aos calcanhares</li>
                <li>Descer até peito próximo ao chão</li>
                <li>Realizar 5-10 repetições para observação</li>
                <li>Versão modificada (joelhos) se necessário</li>
              </ul>
              <p className="text-xs text-muted-foreground/80 mt-2 pt-2 border-t border-border/50">
                💡 Para melhor precisão da análise de IA: homens sem camisa, mulheres com top ajustado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compensations List */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Observe durante a execução e marque as compensações identificadas:
        </p>
        {pushupCompensations.map((comp) => (
          <CompensationCheckbox
            key={comp.id}
            compensation={comp}
            checked={data.compensations.includes(comp.id)}
            onCheckedChange={(checked) =>
              handleCompensationChange(comp.id, checked as boolean)
            }
          />
        ))}
      </div>

      {/* Aggregated Summary */}
      {data.compensations.length > 0 && (
        <Card className="border-accent/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📊 Resumo do Push-up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold">{data.compensations.length}</p>
              <p className="text-xs text-muted-foreground">compensações identificadas</p>
            </div>

            <div>
              <p className="text-xs font-medium text-destructive mb-1">
                Músculos Hiperativos ({aggregated.hyperactiveMuscles.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {aggregated.hyperactiveMuscles.map((m) => (
                  <Badge key={m} variant="outline" className="text-xs">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-success mb-1">
                Músculos Hipoativos ({aggregated.hypoactiveMuscles.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {aggregated.hypoactiveMuscles.map((m) => (
                  <Badge key={m} variant="outline" className="text-xs">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-warning mb-1">
                Lesões Associadas ({aggregated.associatedInjuries.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {aggregated.associatedInjuries.map((i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-warning/10">
                    {i}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Observações adicionais</Label>
        <Textarea
          placeholder="Anote se foi realizado push-up completo ou modificado, dificuldades específicas..."
          value={data.notes}
          onChange={(e) => updateData({ ...data, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
