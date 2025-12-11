/**
 * Quick Protocol Retest Screen
 * Tela de reteste do Mini Protocolo FABRIK
 */

import { useState } from 'react';
import { Check, ArrowRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RETEST_OPTIONS } from '@/data/quickProtocolMappings';

type RetestResult = typeof RETEST_OPTIONS[number]['id'];

interface QuickProtocolRetestProps {
  onComplete: (result: RetestResult, feedback?: string) => void;
  onSkip: () => void;
}

export function QuickProtocolRetest({ onComplete, onSkip }: QuickProtocolRetestProps) {
  const [selectedResult, setSelectedResult] = useState<RetestResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const handleComplete = () => {
    if (selectedResult) {
      onComplete(selectedResult, feedback || undefined);
    }
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔄</span>
        </div>
        <h2 className="text-xl font-display mb-2">Reteste do Movimento</h2>
        <p className="text-muted-foreground">
          Agora, refaça o movimento que causou dor
          <br />
          (geralmente o agachamento) e diga como está.
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {RETEST_OPTIONS.map((option) => {
          const isSelected = selectedResult === option.id;
          
          // Color coding based on result
          const resultColors = {
            improved_much: 'border-success/50 bg-success/5',
            improved_little: 'border-success/30 bg-success/5',
            no_change: 'border-warning/50 bg-warning/5',
            worse: 'border-destructive/50 bg-destructive/5',
          };
          
          return (
            <button
              key={option.id}
              onClick={() => setSelectedResult(option.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                isSelected
                  ? resultColors[option.id]
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
              )}
            >
              {/* Emoji */}
              <span className="text-2xl">{option.emoji}</span>

              {/* Label */}
              <span className={cn(
                "flex-1 font-medium",
                isSelected && "text-foreground"
              )}>
                {option.label}
              </span>

              {/* Check indicator */}
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Optional Feedback */}
      {selectedResult && (
        <div className="space-y-3 animate-fade-in">
          {!showFeedback ? (
            <button
              onClick={() => setShowFeedback(true)}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Adicionar observação (opcional)</span>
            </button>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações:</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Descreva como se sentiu durante o reteste..."
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <Button
          onClick={handleComplete}
          disabled={!selectedResult}
          size="lg"
          className="w-full"
        >
          Concluir Avaliação
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Pular reteste
        </Button>
      </div>
    </div>
  );
}
