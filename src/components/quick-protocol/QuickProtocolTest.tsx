/**
 * Quick Protocol Test Component
 * Componente genérico para cada teste do Mini Protocolo
 */

import { useState } from 'react';
import { Check, AlertTriangle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  QuickTestDefinition, 
  QuickTestOption,
  getLayerLabel,
  getLayerIcon 
} from '@/data/quickProtocolMappings';
import type { TestResult, TestId } from '@/lib/quickProtocolEngine';

interface QuickProtocolTestProps {
  test: QuickTestDefinition;
  value?: TestResult;
  onChange: (result: TestResult) => void;
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

  const layerIcon = getLayerIcon(test.layer);
  const layerLabel = getLayerLabel(test.layer);

  // Get layer color
  const layerColorClass = {
    mobility: 'text-blue-500 bg-blue-500/10',
    stability: 'text-amber-500 bg-amber-500/10',
    motor_control: 'text-purple-500 bg-purple-500/10',
  }[test.layer];

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", layerColorClass)}>
              {layerIcon} {layerLabel}
            </span>
          </div>
          <h3 className="text-xl font-semibold">{test.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Info className="w-5 h-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="font-medium mb-2">Instruções:</p>
              <ul className="text-sm space-y-1">
                {test.instructions.map((instruction, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    {instruction}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Instructions collapsed by default - only show first one */}
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
        <span className="font-medium">Como fazer: </span>
        {test.instructions[0]}
        {test.instructions.length > 1 && (
          <span className="text-muted-foreground/60"> (+{test.instructions.length - 1} passos)</span>
        )}
      </div>

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
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-success/50 bg-success/5"
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
