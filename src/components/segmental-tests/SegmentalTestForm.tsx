import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SegmentalTest } from '@/data/segmentalTestMappings';
import { Target, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TestResult {
  testId: string;
  testName: string;
  bodyRegion: string;
  leftValue: number | null;
  rightValue: number | null;
  passFailLeft: boolean | null;
  passFailRight: boolean | null;
  notes: string;
  unit: string;
  cutoffValue?: number;
}

interface SegmentalTestFormProps {
  test: SegmentalTest;
  result: TestResult;
  onUpdate: (result: Partial<TestResult>) => void;
}

export function SegmentalTestForm({ test, result, onUpdate }: SegmentalTestFormProps) {
  const handleValueChange = (side: 'left' | 'right', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const valueKey = side === 'left' ? 'leftValue' : 'rightValue';
    const passKey = side === 'left' ? 'passFailLeft' : 'passFailRight';
    
    // Auto-calculate pass/fail if cutoff exists
    let passFail: boolean | null = null;
    if (numValue !== null && test.cutoffValue !== undefined) {
      passFail = numValue >= test.cutoffValue;
    }

    onUpdate({
      [valueKey]: numValue,
      [passKey]: passFail,
    });
  };

  const handlePassFailChange = (side: 'left' | 'right', pass: boolean) => {
    const passKey = side === 'left' ? 'passFailLeft' : 'passFailRight';
    onUpdate({ [passKey]: pass });
  };

  const renderPassFailIndicator = (value: boolean | null) => {
    if (value === null) return null;
    return value ? (
      <CheckCircle2 className="w-4 h-4 text-success" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-destructive" />
    );
  };

  const isNumericTest = test.unit !== 'positivo/negativo' && test.unit !== 'tipo (I-IV)';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{test.bodyRegion}</Badge>
              {test.isBilateral && <Badge variant="secondary">Bilateral</Badge>}
            </div>
            <CardTitle className="text-lg">{test.name}</CardTitle>
            <CardDescription className="mt-1">{test.description}</CardDescription>
          </div>
          {test.cutoffValue !== undefined && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Valor de corte</p>
              <p className="font-semibold">{test.cutoffValue} {test.unit}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">Instruções</p>
              <p className="text-sm text-muted-foreground">{test.instructions}</p>
            </div>
          </div>
        </div>

        {/* Input Fields */}
        {test.isBilateral ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Left Side */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Lado Esquerdo</Label>
                {renderPassFailIndicator(result.passFailLeft)}
              </div>
              
              {isNumericTest ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={result.leftValue ?? ''}
                      onChange={(e) => handleValueChange('left', e.target.value)}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {test.unit}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={result.passFailLeft === true}
                    onCheckedChange={(checked) => handlePassFailChange('left', checked)}
                  />
                  <span className="text-sm">
                    {result.passFailLeft === null ? 'Não avaliado' : result.passFailLeft ? 'Positivo/Passa' : 'Negativo/Falha'}
                  </span>
                </div>
              )}
            </div>

            {/* Right Side */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Lado Direito</Label>
                {renderPassFailIndicator(result.passFailRight)}
              </div>
              
              {isNumericTest ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={result.rightValue ?? ''}
                      onChange={(e) => handleValueChange('right', e.target.value)}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {test.unit}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={result.passFailRight === true}
                    onCheckedChange={(checked) => handlePassFailChange('right', checked)}
                  />
                  <span className="text-sm">
                    {result.passFailRight === null ? 'Não avaliado' : result.passFailRight ? 'Positivo/Passa' : 'Negativo/Falha'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Unilateral Test */
          <div className="space-y-3">
            <Label className="text-base font-medium">Resultado</Label>
            {isNumericTest ? (
              <div className="relative max-w-xs">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={result.leftValue ?? ''}
                  onChange={(e) => handleValueChange('left', e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {test.unit}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Switch
                  checked={result.passFailLeft === true}
                  onCheckedChange={(checked) => handlePassFailChange('left', checked)}
                />
                <span className="text-sm">
                  {result.passFailLeft === null ? 'Não avaliado' : result.passFailLeft ? 'Positivo' : 'Negativo'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Asymmetry Warning */}
        {test.isBilateral && 
          result.leftValue !== null && 
          result.rightValue !== null && 
          Math.abs(result.leftValue - result.rightValue) > (test.cutoffValue ? test.cutoffValue * 0.15 : 2) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-sm">
              Assimetria detectada: diferença de {Math.abs(result.leftValue - result.rightValue).toFixed(1)} {test.unit}
            </span>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            placeholder="Anotações adicionais sobre o teste..."
            value={result.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
