/**
 * Quick Protocol AI Result
 * Exibe resultado da análise de IA com compensações detectadas
 * e testes confirmatórios sugeridos
 */

import { AlertTriangle, ChevronRight, Video, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KneeRelevantCompensation, ConfirmatoryTest } from '@/lib/kneeCompensationMappings';

interface QuickProtocolAIResultProps {
  compensations: KneeRelevantCompensation[];
  confidence: number;
  suggestedTests: ConfirmatoryTest[];
  hypothesisExplanation: string;
  onContinue: () => void;
  onBack: () => void;
}

const COMPENSATION_LABELS: Record<KneeRelevantCompensation, string> = {
  knee_valgus: 'Valgo de joelho',
  knee_varus: 'Varo de joelho',
  feet_eversion: 'Eversão dos pés',
  foot_collapse: 'Colapso do arco plantar',
  heels_rise: 'Calcanhares sobem',
  hip_drop: 'Queda do quadril',
  trunk_forward_lean: 'Inclinação do tronco',
  instability: 'Instabilidade geral',
};

const LAYER_LABELS: Record<string, string> = {
  mobility: 'Mobilidade',
  stability: 'Estabilidade',
  motor_control: 'Controle',
};

export function QuickProtocolAIResult({
  compensations,
  confidence,
  suggestedTests,
  hypothesisExplanation,
  onContinue,
  onBack,
}: QuickProtocolAIResultProps) {
  const hasCompensations = compensations.length > 0;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-sm text-primary mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Análise de IA</span>
        </div>
        <h2 className="text-xl font-semibold">
          {hasCompensations ? 'Compensações Detectadas' : 'Análise Concluída'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confiança: {confidencePercent}%
        </p>
      </div>

      {/* Compensations Found */}
      {hasCompensations ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="font-semibold">
                {compensations.length} compensação{compensations.length > 1 ? 'ões' : ''} identificada{compensations.length > 1 ? 's' : ''}
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {compensations.map((comp) => (
                <Badge 
                  key={comp} 
                  variant="secondary"
                  className="bg-warning/10 text-warning border border-warning/20"
                >
                  {COMPENSATION_LABELS[comp] || comp}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {hypothesisExplanation}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="font-semibold text-lg mb-2">A análise não sugeriu compensações.</h3>
            <p className="text-muted-foreground text-sm">
              Faça os testes para concluir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Suggested Tests */}
      {suggestedTests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Testes Confirmatórios Sugeridos</h3>
            <span className="text-xs text-muted-foreground">
              {suggestedTests.length} teste{suggestedTests.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-2">
            {suggestedTests.map((test, index) => (
              <div
                key={test.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{test.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {test.description}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {LAYER_LABELS[test.layer]}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Estes testes vão confirmar as hipóteses da análise de IA
          </p>
        </div>
      )}

      {/* Estimation */}
      {suggestedTests.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
          <Video className="w-4 h-4" />
          <span>~{suggestedTests.length * 2} minutos para concluir os testes</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" size="touch" onClick={onBack} className="flex-1">
          Refazer Captura
        </Button>
        
        <Button size="touch" onClick={onContinue} className="flex-1">
          {suggestedTests.length > 0 ? 'Iniciar Testes' : 'Continuar'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
