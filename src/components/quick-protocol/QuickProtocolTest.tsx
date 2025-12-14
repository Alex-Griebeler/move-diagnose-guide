/**
 * Quick Protocol Test Component
 * Componente genérico para cada teste do Protocolo Rápido
 * 
 * Captura:
 * - Achados específicos do teste (opções selecionadas)
 * - Presença de dor durante o teste
 * - Lado onde o déficit foi observado (findingSide) para testes bilaterais
 */

import { useState, useEffect } from 'react';
import { Check, AlertTriangle, X, Move, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  QuickTestDefinition, 
  getLayerLabel 
} from '@/data/quickProtocolMappings';
import type { TestResult, FindingSide } from '@/lib/quickProtocolEngine';

interface QuickProtocolTestProps {
  test: QuickTestDefinition;
  value?: TestResult;
  onChange: (result: TestResult) => void;
}

// Layer icon component using Lucide icons
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

export function QuickProtocolTest({ test, value, onChange }: QuickProtocolTestProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    value?.specificFindings || []
  );
  const [hasPain, setHasPain] = useState(value?.hasPain || false);
  const [findingSide, setFindingSide] = useState<FindingSide | undefined>(
    value?.findingSide
  );

  // Determina se o teste tem achados positivos que requerem seleção de lado
  const hasPositiveFindings = selectedOptions.some(optId => 
    test.options.find(o => o.id === optId)?.isPositive
  ) || hasPain;

  // Mostrar seletor de lado apenas para testes bilaterais com achados positivos
  const shouldShowSideSelector = test.isBilateral && hasPositiveFindings;

  // Reset findingSide when no positive findings
  useEffect(() => {
    if (!hasPositiveFindings && findingSide) {
      setFindingSide(undefined);
      updateResult(selectedOptions, hasPain, undefined);
    }
  }, [hasPositiveFindings]);

  const handleOptionToggle = (optionId: string) => {
    const newSelected = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    
    setSelectedOptions(newSelected);
    updateResult(newSelected, hasPain, findingSide);
  };

  const handlePainToggle = (checked: boolean) => {
    setHasPain(checked);
    updateResult(selectedOptions, checked, findingSide);
  };

  const handleFindingSideChange = (side: FindingSide) => {
    setFindingSide(side);
    updateResult(selectedOptions, hasPain, side);
  };

  const updateResult = (
    options: string[], 
    pain: boolean, 
    side: FindingSide | undefined
  ) => {
    // Determine if any positive option is selected
    const hasPositiveOption = options.some(optId => 
      test.options.find(o => o.id === optId)?.isPositive
    );

    const result: TestResult = {
      testId: test.id,
      hasPain: pain,
      isPositive: hasPositiveOption || pain,
      specificFindings: options,
      findingSide: side,
    };

    // For bilateral tests with side selection, set appropriate side status
    if (test.isBilateral && side && (hasPositiveOption || pain)) {
      if (side === 'left') {
        result.leftSide = 'limited';
      } else if (side === 'right') {
        result.rightSide = 'limited';
      } else if (side === 'bilateral') {
        result.leftSide = 'limited';
        result.rightSide = 'limited';
      }
    }

    onChange(result);
  };

  const layerLabel = getLayerLabel(test.layer);

  // Get layer color - using neutral, premium palette
  const layerColorClass = {
    mobility: 'text-foreground/70 bg-muted/50',
    stability: 'text-foreground/70 bg-muted/50',
    motor_control: 'text-foreground/70 bg-muted/50',
  }[test.layer];

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border/50",
              layerColorClass
            )}>
              <LayerIcon layer={test.layer} />
              {layerLabel}
            </span>
          </div>
          <h3 className="text-xl font-semibold">{test.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
        </div>
      </div>

      {/* Instructions - Single source, clean collapsible */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-full text-left text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-lg p-3 transition-colors">
              <span className="font-medium text-foreground">Como fazer: </span>
              {test.instructions[0]}
              {test.instructions.length > 1 && (
                <span className="text-muted-foreground/60 ml-1">
                  (toque para ver {test.instructions.length - 1} passos)
                </span>
              )}
            </button>
          </TooltipTrigger>
          {test.instructions.length > 1 && (
            <TooltipContent side="bottom" className="max-w-sm p-4">
              <p className="font-medium mb-2">Instruções completas:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                {test.instructions.map((instruction, i) => (
                  <li key={i} className="text-muted-foreground">
                    {instruction}
                  </li>
                ))}
              </ol>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Options Grid */}
      <div className="space-y-3">
        <p className="text-sm font-medium">O que você observou?</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {test.options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const isPositive = option.isPositive;
            
            return (
              <button
                key={option.id}
                onClick={() => handleOptionToggle(option.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  isSelected
                    ? isPositive
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-success/40 bg-success/5"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                )}
              >
                {/* Status Icon */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isSelected
                    ? isPositive
                      ? "bg-destructive/10 text-destructive"
                      : "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}>
                  {isSelected ? (
                    isPositive ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-current" />
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  "text-sm font-medium",
                  isSelected && "text-foreground"
                )}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pain Checkbox */}
      <div className="flex items-center space-x-3 pt-2 border-t">
        <Checkbox
          id={`pain-${test.id}`}
          checked={hasPain}
          onCheckedChange={handlePainToggle}
          className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
        />
        <label
          htmlFor={`pain-${test.id}`}
          className="text-sm font-medium cursor-pointer flex items-center gap-2"
        >
          <span>Dor durante o teste</span>
          {hasPain && <span className="text-destructive text-xs">(Positivo)</span>}
        </label>
      </div>

      {/* Finding Side Selector - Only for bilateral tests with positive findings */}
      {shouldShowSideSelector && (
        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-medium">Em qual lado você observou o achado?</p>
          
          <RadioGroup
            value={findingSide || ''}
            onValueChange={(value) => handleFindingSideChange(value as FindingSide)}
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="left" id={`side-left-${test.id}`} />
              <Label htmlFor={`side-left-${test.id}`} className="text-sm cursor-pointer">
                Esquerdo
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="right" id={`side-right-${test.id}`} />
              <Label htmlFor={`side-right-${test.id}`} className="text-sm cursor-pointer">
                Direito
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bilateral" id={`side-bilateral-${test.id}`} />
              <Label htmlFor={`side-bilateral-${test.id}`} className="text-sm cursor-pointer">
                Ambos os lados
              </Label>
            </div>
          </RadioGroup>

          {!findingSide && (
            <p className="text-xs text-muted-foreground">
              Selecione o lado para uma intervenção mais precisa
            </p>
          )}
        </div>
      )}

      {/* Current Status Summary */}
      {(selectedOptions.length > 0 || hasPain) && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          value?.isPositive 
            ? "bg-warning/10 text-warning-foreground border border-warning/20" 
            : "bg-success/10 text-success-foreground border border-success/20"
        )}>
          {value?.isPositive ? (
            <>
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>
                Teste positivo - possível déficit identificado
                {findingSide && findingSide !== 'bilateral' && (
                  <span className="text-muted-foreground ml-1">
                    (lado {findingSide === 'left' ? 'esquerdo' : 'direito'})
                  </span>
                )}
              </span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-success" />
              <span>Teste normal - sem alterações significativas</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
