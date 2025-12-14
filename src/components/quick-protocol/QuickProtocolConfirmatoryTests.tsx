/**
 * Quick Protocol Confirmatory Tests
 * Executa testes confirmatórios sugeridos pela análise de IA
 * 
 * Fluxo:
 * 1. Recebe lista de testes sugeridos (2-3 max)
 * 2. Usuário executa cada teste (manual ou com IA)
 * 3. Resultados confirmam/descartam hipóteses
 */

import { useState } from 'react';
import { Check, AlertTriangle, ChevronLeft, ChevronRight, Move, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ConfirmatoryTest, KneeDeficitHypothesis } from '@/lib/kneeCompensationMappings';
import type { FindingSide } from '@/lib/quickProtocolEngine';

interface TestResult {
  testId: string;
  selectedOption: string | null;
  isPositive: boolean;
  confirmedHypothesis: KneeDeficitHypothesis | null;
  findingSide?: FindingSide;
  hasPain: boolean;
}

interface QuickProtocolConfirmatoryTestsProps {
  tests: ConfirmatoryTest[];
  hypothesis: string;
  onComplete: (results: TestResult[], confirmedDeficit: KneeDeficitHypothesis | null) => void;
  onBack: () => void;
}

// Layer icon component
function LayerIcon({ layer }: { layer: 'mobility' | 'stability' | 'motor_control' }) {
  const iconClass = "w-3.5 h-3.5";
  switch (layer) {
    case 'mobility':
      return <Move className={iconClass} />;
    case 'stability':
      return <Shield className={iconClass} />;
    case 'motor_control':
      return <Zap className={iconClass} />;
  }
}

const LAYER_LABELS: Record<string, string> = {
  mobility: 'Mobilidade',
  stability: 'Estabilidade',
  motor_control: 'Controle Neuromotor',
};

export function QuickProtocolConfirmatoryTests({
  tests,
  hypothesis,
  onComplete,
  onBack,
}: QuickProtocolConfirmatoryTestsProps) {
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [findingSide, setFindingSide] = useState<FindingSide | undefined>();
  const [hasPain, setHasPain] = useState(false);

  const currentTest = tests[currentTestIndex];
  const progress = ((currentTestIndex + 1) / tests.length) * 100;

  const selectedOptionData = currentTest.options.find(o => o.id === selectedOption);
  const isPositive = selectedOptionData?.isPositive || hasPain;
  const requiresFindingSide = currentTest.isBilateral && isPositive;

  const handleNext = () => {
    // Validar seleção de lado para testes bilaterais positivos
    if (requiresFindingSide && !findingSide) {
      return;
    }

    // Salvar resultado
    const result: TestResult = {
      testId: currentTest.id,
      selectedOption,
      isPositive,
      confirmedHypothesis: selectedOptionData?.confirms || null,
      findingSide: isPositive ? findingSide : undefined,
      hasPain,
    };

    const newResults = [...results, result];
    setResults(newResults);

    // Próximo teste ou finalizar
    if (currentTestIndex < tests.length - 1) {
      setCurrentTestIndex(currentTestIndex + 1);
      setSelectedOption(null);
      setFindingSide(undefined);
      setHasPain(false);
    } else {
      // Determinar déficit confirmado (prioridade MILO: mobilidade > estabilidade > controle)
      const confirmedHypotheses = newResults
        .filter(r => r.confirmedHypothesis)
        .map(r => r.confirmedHypothesis!);

      const priorityOrder: KneeDeficitHypothesis[] = [
        'ankle_mobility', 'hip_mobility',
        'hip_stability', 'ankle_stability',
        'motor_control'
      ];

      const confirmedDeficit = priorityOrder.find(h => confirmedHypotheses.includes(h)) || null;
      onComplete(newResults, confirmedDeficit);
    }
  };

  const handlePrevious = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(currentTestIndex - 1);
      // Restaurar resultado anterior se existir
      const prevResult = results[currentTestIndex - 1];
      if (prevResult) {
        setSelectedOption(prevResult.selectedOption);
        setFindingSide(prevResult.findingSide);
        setHasPain(prevResult.hasPain);
        setResults(results.slice(0, -1));
      }
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Testes Confirmatórios</p>
        <h2 className="text-xl font-semibold">Confirmando hipóteses</h2>
        <p className="text-sm text-muted-foreground mt-2">{hypothesis}</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Teste {currentTestIndex + 1} de {tests.length}
          </span>
          <span className="font-medium">{currentTest.name}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Test Card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Test Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border/50",
                  "text-foreground/70 bg-muted/50"
                )}>
                  <LayerIcon layer={currentTest.layer} />
                  {LAYER_LABELS[currentTest.layer]}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{currentTest.name}</h3>
              <p className="text-sm text-muted-foreground">{currentTest.description}</p>
            </div>
          </div>

          {/* Instructions */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-full text-left text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-lg p-3 transition-colors">
                  <span className="font-medium text-foreground">Como fazer: </span>
                  {currentTest.instructions[0]}
                  {currentTest.instructions.length > 1 && (
                    <span className="text-muted-foreground/60 ml-1">
                      (+{currentTest.instructions.length - 1} passos)
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm p-4">
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  {currentTest.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">O que você observou?</p>
            <RadioGroup value={selectedOption || ''} onValueChange={setSelectedOption}>
              <div className="space-y-2">
                {currentTest.options.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                      selectedOption === option.id
                        ? option.isPositive
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-success/40 bg-success/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                    onClick={() => setSelectedOption(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {selectedOption === option.id && (
                          option.isPositive 
                            ? <AlertTriangle className="w-4 h-4 text-destructive" />
                            : <Check className="w-4 h-4 text-success" />
                        )}
                        <span>{option.label}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Pain Checkbox */}
          <div className="flex items-center space-x-3 pt-2 border-t">
            <Checkbox
              id="pain-confirm"
              checked={hasPain}
              onCheckedChange={(checked) => setHasPain(checked === true)}
              className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
            />
            <label htmlFor="pain-confirm" className="text-sm font-medium cursor-pointer">
              Dor durante o teste
            </label>
          </div>

          {/* Side Selector */}
          {requiresFindingSide && (
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium">Em qual lado você observou o achado?</p>
              <RadioGroup
                value={findingSide || ''}
                onValueChange={(v) => setFindingSide(v as FindingSide)}
                className="flex flex-wrap gap-3"
              >
                {['left', 'right', 'bilateral'].map((side) => (
                  <div key={side} className="flex items-center space-x-2">
                    <RadioGroupItem value={side} id={`side-${side}`} />
                    <Label htmlFor={`side-${side}`} className="cursor-pointer text-sm">
                      {side === 'left' ? 'Esquerdo' : side === 'right' ? 'Direito' : 'Ambos'}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={handlePrevious} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {currentTestIndex === 0 ? 'Voltar' : 'Anterior'}
        </Button>
        
        <Button 
          onClick={handleNext} 
          className="flex-1"
          disabled={!selectedOption || (requiresFindingSide && !findingSide)}
        >
          {currentTestIndex === tests.length - 1 ? 'Ver Resultado' : 'Próximo'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
