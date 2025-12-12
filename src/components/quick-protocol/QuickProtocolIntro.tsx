/**
 * Quick Protocol Intro Screen
 * Tela de introdução do Protocolo Rápido FABRIK
 */

import { ArrowRight, Clock, Target, Move, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProtocolType, getProtocolMeta, getTestsForProtocol } from '@/data/quickProtocolMappings';

interface QuickProtocolIntroProps {
  protocolType: ProtocolType;
  onStart: () => void;
  hasPriorAssessment?: boolean;
  priorDeficits?: string[];
}

export function QuickProtocolIntro({ 
  protocolType,
  onStart, 
  hasPriorAssessment = false,
  priorDeficits = []
}: QuickProtocolIntroProps) {
  const meta = getProtocolMeta(protocolType);
  const tests = getTestsForProtocol(protocolType);

  // Get body part name for description
  const getBodyPartName = (type: ProtocolType): string => {
    const names: Record<ProtocolType, string> = {
      knee_pain: 'joelho',
      hip_pain: 'quadril',
      low_back_pain: 'lombar',
      shoulder_pain: 'ombro',
      ankle_pain: 'tornozelo',
      elbow_pain: 'cotovelo'
    };
    return names[type];
  };

  const bodyPart = getBodyPartName(protocolType);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-8">
        <Target className="w-10 h-10 text-muted-foreground" />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-display mb-3">
        {meta.name}
      </h1>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Vamos identificar rapidamente o que está sobrecarregando o {bodyPart}.
        <br />
        <span className="text-foreground font-medium">{tests.length} testes simples, ~{meta.estimatedTime} minutos.</span>
      </p>

      {/* Time indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Clock className="w-4 h-4" />
        <span>Duração estimada: {meta.estimatedTime} minutos</span>
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

      {/* Pyramid layers preview - Premium minimalist style with Lucide icons */}
      <div className="flex gap-6 mb-10">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center mb-2">
            <Move className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">Mobilidade</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center mb-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">Estabilidade</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center mb-2">
            <Zap className="w-5 h-5 text-muted-foreground" />
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
        Iniciar Protocolo Rápido
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
