import { Info, ArrowLeftRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { slsCompensations, getAggregatedMuscles, CompensationMapping } from '@/data/compensationMappings';

interface SLSData {
  leftSide: string[];
  rightSide: string[];
  notes: string;
}

interface SingleLegSquatTestProps {
  data: SLSData;
  updateData: (data: SLSData) => void;
}

function CompensationCheckbox({
  compensation,
  checked,
  onCheckedChange,
  side,
}: {
  compensation: CompensationMapping;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  side: 'left' | 'right';
}) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        checked ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${compensation.id}-${side}`}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-0.5"
        />
        <div className="space-y-1 flex-1">
          <Label htmlFor={`${compensation.id}-${side}`} className="cursor-pointer font-medium text-sm">
            {compensation.label}
          </Label>
          {checked && (
            <div className="space-y-2 mt-2 animate-fade-in">
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-destructive font-medium">Hiperativos:</span>
                {compensation.hyperactiveMuscles.slice(0, 2).map((m) => (
                  <Badge key={m} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                    {m}
                  </Badge>
                ))}
                {compensation.hyperactiveMuscles.length > 2 && (
                  <Badge variant="outline" className="text-xs">+{compensation.hyperactiveMuscles.length - 2}</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-success font-medium">Hipoativos:</span>
                {compensation.hypoactiveMuscles.slice(0, 2).map((m) => (
                  <Badge key={m} variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                    {m}
                  </Badge>
                ))}
                {compensation.hypoactiveMuscles.length > 2 && (
                  <Badge variant="outline" className="text-xs">+{compensation.hypoactiveMuscles.length - 2}</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SingleLegSquatTest({ data, updateData }: SingleLegSquatTestProps) {
  const handleCompensationChange = (
    side: 'leftSide' | 'rightSide',
    id: string,
    checked: boolean
  ) => {
    const currentList = data[side];
    const newList = checked
      ? [...currentList, id]
      : currentList.filter((c) => c !== id);
    updateData({ ...data, [side]: newList });
  };

  const hasAsymmetry = data.leftSide.length !== data.rightSide.length ||
    !data.leftSide.every((c) => data.rightSide.includes(c));

  const allSelected = [...data.leftSide, ...data.rightSide];
  const aggregated = getAggregatedMuscles(slsCompensations, [...new Set(allSelected)]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          🦵 Single-Leg Squat (SLS)
        </h3>
        <p className="text-sm text-muted-foreground">
          Avalie o controle unilateral em cada perna. Compare simetria bilateral.
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
                <li>Apoiar em uma perna, a outra estendida à frente</li>
                <li>Mãos na cintura ou à frente para equilíbrio</li>
                <li>Agachar até ~60° de flexão do joelho</li>
                <li>Realizar 5 repetições em cada lado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asymmetry Alert */}
      {hasAsymmetry && allSelected.length > 0 && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3">
          <ArrowLeftRight className="w-5 h-5 text-warning" />
          <span className="text-sm">
            <strong>Assimetria detectada</strong> entre os lados
          </span>
        </div>
      )}

      {/* Tabs for sides */}
      <Tabs defaultValue="right" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="right" className="flex items-center gap-2">
            🦶 Direito
            {data.rightSide.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {data.rightSide.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="left" className="flex items-center gap-2">
            🦶 Esquerdo
            {data.leftSide.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {data.leftSide.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="right" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Apoio na perna direita. Observe controle de joelho, quadril e tronco.
          </p>
          {slsCompensations.map((comp) => (
            <CompensationCheckbox
              key={comp.id}
              compensation={comp}
              side="right"
              checked={data.rightSide.includes(comp.id)}
              onCheckedChange={(checked) =>
                handleCompensationChange('rightSide', comp.id, checked as boolean)
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="left" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Apoio na perna esquerda. Observe controle de joelho, quadril e tronco.
          </p>
          {slsCompensations.map((comp) => (
            <CompensationCheckbox
              key={comp.id}
              compensation={comp}
              side="left"
              checked={data.leftSide.includes(comp.id)}
              onCheckedChange={(checked) =>
                handleCompensationChange('leftSide', comp.id, checked as boolean)
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
              📊 Resumo do SLS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Side comparison */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Lado Direito</p>
                <p className="text-2xl font-bold">{data.rightSide.length}</p>
                <p className="text-xs">compensações</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Lado Esquerdo</p>
                <p className="text-2xl font-bold">{data.leftSide.length}</p>
                <p className="text-xs">compensações</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-destructive mb-1">
                Músculos Hiperativos
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
                Músculos Hipoativos
              </p>
              <div className="flex flex-wrap gap-1">
                {aggregated.hypoactiveMuscles.map((m) => (
                  <Badge key={m} variant="outline" className="text-xs">
                    {m}
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
          placeholder="Anote diferenças entre os lados, dificuldades específicas..."
          value={data.notes}
          onChange={(e) => updateData({ ...data, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
