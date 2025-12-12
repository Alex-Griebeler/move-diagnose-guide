/**
 * Quick Protocol Result Screen
 * Tela de resultado do Protocolo Rápido FABRIK
 */

import { Check, AlertCircle, ArrowRight, RotateCcw, Unlock, Move, Zap, Target, Info, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DecisionResult, 
  Intervention,
  formatDeficitName,
  getDeficitLayer,
  getLayerStyle 
} from '@/lib/quickProtocolEngine';

interface QuickProtocolResultProps {
  result: DecisionResult;
  onRetest: () => void;
  onClose: () => void;
}

// Layer icon component using Lucide icons
function LayerIcon({ layer, size = 'md' }: { layer: 'mobility' | 'stability' | 'motor_control', size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }[size];
  
  switch (layer) {
    case 'mobility':
      return <Move className={sizeClass} />;
    case 'stability':
      return <AlertCircle className={sizeClass} />;
    case 'motor_control':
      return <Zap className={sizeClass} />;
  }
}

// Category icon component using Lucide icons
function CategoryIcon({ category }: { category: 'release' | 'mobility' | 'activation' | 'technique' }) {
  const iconClass = "w-4 h-4";
  switch (category) {
    case 'release':
      return <Unlock className={iconClass} />;
    case 'mobility':
      return <Move className={iconClass} />;
    case 'activation':
      return <Zap className={iconClass} />;
    case 'technique':
      return <Target className={iconClass} />;
  }
}

// Helper to format side label
function getSideLabel(side: 'left' | 'right' | 'bilateral'): string {
  const labels = {
    left: 'Esquerdo',
    right: 'Direito',
    bilateral: 'Bilateral'
  };
  return labels[side];
}

export function QuickProtocolResult({ result, onRetest, onClose }: QuickProtocolResultProps) {
  const { primary, secondary, interventions, explanation, recommendRetest, interventionSide, contralateralNote } = result;

  // No deficit found
  if (!primary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-success" />
        </div>
        
        <h2 className="text-2xl font-display mb-3">Nenhum déficit identificado</h2>
        
        <p className="text-muted-foreground max-w-md mb-8">
          {explanation}
        </p>

        <Button onClick={onClose}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const primaryLayer = getDeficitLayer(primary);
  const primaryStyle = getLayerStyle(primaryLayer);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Primary Deficit */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Causa principal identificada</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", primaryStyle.bgClass)}>
              <LayerIcon layer={primaryLayer} size="lg" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{formatDeficitName(primary)}</h2>
              <span className={cn("text-sm", primaryStyle.color)}>{primaryStyle.label}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {explanation}
          </p>
          
          {/* Intervention Side Indicator */}
          {interventionSide && interventionSide !== 'bilateral' && (
            <div className="flex items-center gap-2 text-sm py-2 px-3 bg-primary/5 rounded-lg border border-primary/10">
              <Crosshair className="h-4 w-4 text-primary" />
              <span>
                Foco da intervenção: <strong className="text-foreground">Lado {getSideLabel(interventionSide)}</strong>
              </span>
            </div>
          )}
          
          {/* Contralateral Explanation */}
          {contralateralNote && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm text-muted-foreground">
                {contralateralNote}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Secondary Deficits */}
      {secondary.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Fatores secundários:</h3>
          <div className="flex flex-wrap gap-2">
            {secondary.map((deficit) => {
              const layer = getDeficitLayer(deficit);
              const style = getLayerStyle(layer);
              return (
                <span 
                  key={deficit}
                  className={cn("px-3 py-1.5 rounded-full text-sm", style.bgClass, style.color)}
                >
                  {formatDeficitName(deficit)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Interventions */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Intervenção Imediata
          </h3>
          <p className="text-sm text-muted-foreground">
            Realize estas correções agora (2-3 minutos)
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {interventions.map((intervention, index) => (
            <InterventionCard key={intervention.id} intervention={intervention} index={index} />
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {recommendRetest && (
          <Button 
            onClick={onRetest} 
            className="flex-1"
            size="lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retestar Movimento
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={onClose}
          className="flex-1"
          size="lg"
        >
          Finalizar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

interface InterventionCardProps {
  intervention: Intervention;
  index: number;
}

function InterventionCard({ intervention, index }: InterventionCardProps) {
  const categoryLabels = {
    release: 'Liberação',
    mobility: 'Mobilidade',
    activation: 'Ativação',
    technique: 'Técnica',
  };

  return (
    <div className="flex gap-4 p-3 bg-muted/30 rounded-lg">
      {/* Step number */}
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{intervention.name}</span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background text-muted-foreground border border-border/50">
            <CategoryIcon category={intervention.category} />
            {categoryLabels[intervention.category]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{intervention.description}</p>
        <p className="text-xs text-primary mt-1 flex items-center gap-1">
          <span className="w-3 h-3 inline-flex items-center justify-center">⏱</span>
          {intervention.duration}
        </p>
      </div>
    </div>
  );
}
