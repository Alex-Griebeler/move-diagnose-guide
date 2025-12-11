/**
 * Quick Protocol Intro Screen
 * Tela de introdução do Mini Protocolo FABRIK
 */

import { ArrowRight, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KNEE_PROTOCOL_META } from '@/data/quickProtocolMappings';

interface QuickProtocolIntroProps {
  onStart: () => void;
  hasPriorAssessment?: boolean;
  priorDeficits?: string[];
}

export function QuickProtocolIntro({ 
  onStart, 
  hasPriorAssessment = false,
  priorDeficits = []
}: QuickProtocolIntroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <Target className="w-10 h-10 text-primary" />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-display mb-3">
        {KNEE_PROTOCOL_META.name}
      </h1>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Vamos identificar rapidamente o que está sobrecarregando o joelho.
        <br />
        <span className="text-foreground font-medium">5 testes simples, ~5 minutos.</span>
      </p>

      {/* Time indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Clock className="w-4 h-4" />
        <span>Duração estimada: {KNEE_PROTOCOL_META.estimatedTime} minutos</span>
      </div>

      {/* Prior assessment context */}
      {hasPriorAssessment && priorDeficits.length > 0 && (
        <div className="bg-accent/30 border border-accent/50 rounded-lg p-4 mb-8 max-w-md">
          <p className="text-sm text-muted-foreground mb-2">
            Avaliação anterior detectou:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {priorDeficits.map((deficit, i) => (
              <span 
                key={i} 
                className="px-2 py-1 bg-background rounded text-xs font-medium"
              >
                {deficit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pyramid layers preview */}
      <div className="flex gap-4 mb-10">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
            <span className="text-lg">🔄</span>
          </div>
          <span className="text-xs text-muted-foreground">Mobilidade</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
            <span className="text-lg">⚖️</span>
          </div>
          <span className="text-xs text-muted-foreground">Estabilidade</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
            <span className="text-lg">🧠</span>
          </div>
          <span className="text-xs text-muted-foreground">Controle</span>
        </div>
      </div>

      {/* Start button */}
      <Button 
        size="lg" 
        onClick={onStart}
        className="px-8 shadow-md hover:shadow-lg transition-shadow"
      >
        Iniciar Mini Protocolo
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
