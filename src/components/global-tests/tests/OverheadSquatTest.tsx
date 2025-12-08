import { Eye, Video, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  getAggregatedMuscles,
  CompensationMapping,
} from '@/data/compensationMappings';

interface OHSData {
  anteriorView: string[];
  lateralView: string[];
  posteriorView: string[];
  notes: string;
}

interface OverheadSquatTestProps {
  data: OHSData;
  updateData: (data: OHSData) => void;
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

export function OverheadSquatTest({ data, updateData }: OverheadSquatTestProps) {
  const handleCompensationChange = (
    view: 'anteriorView' | 'lateralView' | 'posteriorView',
    id: string,
    checked: boolean
  ) => {
    const currentList = data[view];
    const newList = checked
      ? [...currentList, id]
      : currentList.filter((c) => c !== id);
    updateData({ ...data, [view]: newList });
  };

  const allSelected = [...data.anteriorView, ...data.lateralView, ...data.posteriorView];
  const allCompensations = [
    ...ohsAnteriorCompensations,
    ...ohsLateralCompensations,
    ...ohsPosteriorCompensations,
  ];
  const aggregated = getAggregatedMuscles(allCompensations, allSelected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          🏋️ Overhead Squat (OHS)
        </h3>
        <p className="text-sm text-muted-foreground">
          Avalie o padrão de agachamento com braços elevados. Observe compensações em 3 visões.
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
                <li>Pés na largura do quadril, pontas levemente para fora</li>
                <li>Braços elevados acima da cabeça, cotovelos estendidos</li>
                <li>Agachar o mais profundo possível mantendo calcanhares no chão</li>
                <li>Realizar 5 repetições para observação</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for views */}
      <Tabs defaultValue="anterior" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="anterior" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
            <span className="sm:hidden">Ant</span>
            {data.anteriorView.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {data.anteriorView.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lateral" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Lateral</span>
            <span className="sm:hidden">Lat</span>
            {data.lateralView.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {data.lateralView.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posterior" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Posterior</span>
            <span className="sm:hidden">Post</span>
            {data.posteriorView.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {data.posteriorView.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anterior" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Observe de frente: posição dos pés (abdução/eversão), joelhos (valgo/varo) e alinhamento geral.
          </p>
          {ohsAnteriorCompensations.map((comp) => (
            <CompensationCheckbox
              key={comp.id}
              compensation={comp}
              checked={data.anteriorView.includes(comp.id)}
              onCheckedChange={(checked) =>
                handleCompensationChange('anteriorView', comp.id, checked as boolean)
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="lateral" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Observe de lado: inclinação do tronco, lordose/cifose lombar, calcanhares e braços.
          </p>
          {ohsLateralCompensations.map((comp) => (
            <CompensationCheckbox
              key={comp.id}
              compensation={comp}
              checked={data.lateralView.includes(comp.id)}
              onCheckedChange={(checked) =>
                handleCompensationChange('lateralView', comp.id, checked as boolean)
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="posterior" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Observe de trás: simetria pélvica (shift), rotação do tronco e assimetrias.
          </p>
          {ohsPosteriorCompensations.map((comp) => (
            <CompensationCheckbox
              key={comp.id}
              compensation={comp}
              checked={data.posteriorView.includes(comp.id)}
              onCheckedChange={(checked) =>
                handleCompensationChange('posteriorView', comp.id, checked as boolean)
              }
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Aggregated Summary */}
      {allSelected.length > 0 && (
        <Card className="border-accent/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📊 Resumo do OHS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          placeholder="Anote detalhes relevantes sobre o teste..."
          value={data.notes}
          onChange={(e) => updateData({ ...data, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
