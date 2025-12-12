/**
 * Quick Protocol Test Component
 * Componente genérico para cada teste do Protocolo Rápido
 */

import { useState } from 'react';
import { Check, AlertTriangle, X, Move, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  QuickTestDefinition, 
  getLayerLabel 
} from '@/data/quickProtocolMappings';
import type { TestResult, TestId } from '@/lib/quickProtocolEngine';

interface QuickProtocolTestProps {
  test: QuickTestDefinition;
  value?: TestResult;
  onChange: (result: TestResult) => void;
}

// Layer icon component using Lucide icons instead of emojis
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

  const handleOptionToggle = (optionId: string) => {
    const newSelected = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    
    setSelectedOptions(newSelected);
    updateResult(newSelected, hasPain);
  };

  const handlePainToggle = (checked: boolean) => {
    setHasPain(checked);
    updateResult(selectedOptions, checked);
  };

  const updateResult = (options: string[], pain: boolean) => {
    // Determine if any positive option is selected
    const hasPositiveOption = options.some(optId => 
      test.options.find(o => o.id === optId)?.isPositive
    );

    const result: TestResult = {
      testId: test.id,
      hasPain: pain,
      isPositive: hasPositiveOption || pain,
      specificFindings: options,
    };

    // For bilateral tests, we can set generic left/right status
    if (test.isBilateral && hasPositiveOption) {
      result.leftSide = 'limited';
      result.rightSide = 'limited';
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
              <span>Teste positivo - possível déficit identificado</span>
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
