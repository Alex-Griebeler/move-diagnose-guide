import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, GitBranch, AlertTriangle, Target, FlaskConical, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { compensacaoCausas } from '@/data/weightEngine';
import { causaToTests } from '@/data/causaTestMappings';
import { cn } from '@/lib/utils';
import { SuggestedTestWithPriority, priorityConfig, getContextLabels } from '@/lib/testPrioritization';

interface TestReasoningChainWithPriorityProps {
  testId: string;
  prioritizedTest: SuggestedTestWithPriority;
  compensationIds: string[];
  contextosAplicados: string[];
}

interface ReasoningNode {
  compensationId: string;
  compensationLabel: string;
  causas: Array<{
    id: string;
    label: string;
    categoria: string;
    baseWeight: number;
    priorityScore?: number;
    hasContextBoost?: boolean;
  }>;
}

// Compensation labels for display
const compensationLabels: Record<string, string> = {
  knee_valgus: 'Valgo de Joelho',
  knee_varus: 'Varo de Joelho',
  heels_rise: 'Calcanhares Sobem',
  heels_rise_posterior: 'Calcanhares Sobem (Post.)',
  trunk_forward_lean: 'Inclinação Anterior do Tronco',
  lumbar_hyperextension: 'Hiperextensão Lombar',
  spine_flexion: 'Flexão da Coluna',
  butt_wink: 'Butt Wink',
  arms_fall_forward: 'Braços Caem',
  arms_fall: 'Braços Caem',
  foot_pronation: 'Pronação do Pé',
  feet_abduction: 'Pés Abduzidos',
  feet_eversion: 'Eversão dos Pés',
  feet_eversion_posterior: 'Eversão dos Pés (Post.)',
  asymmetric_shift: 'Shift Assimétrico',
  trunk_rotation: 'Rotação do Tronco',
  hip_drop: 'Queda Pélvica',
  hip_hike: 'Elevação Pélvica',
  trunk_rotation_medial: 'Rotação Medial do Tronco',
  trunk_rotation_lateral: 'Rotação Lateral do Tronco',
  trunk_forward_lean_sls: 'Inclinação Anterior (SLS)',
  knee_flexion_insufficient: 'Flexão de Joelho Insuficiente',
  foot_collapse: 'Colapso do Pé',
  balance_loss: 'Perda de Equilíbrio',
  scapular_winging: 'Escápula Alada',
  hips_drop: 'Quadril Cai',
  hip_elevation: 'Elevação do Quadril',
  lumbar_extension: 'Extensão Lombar',
  elbow_flare: 'Cotovelos Abertos',
  shoulder_protraction: 'Protração de Ombro',
  shoulder_retraction_insufficient: 'Retração Insuficiente',
  head_forward: 'Cabeça Projetada',
  misalignment: 'Desalinhamento',
};

// Category colors
const categoryColors: Record<string, string> = {
  HYPO: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  HYPER: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  MOB_L: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  INSTAB: 'bg-red-500/10 text-red-600 border-red-500/30',
  CM: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  TECH: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

const categoryLabels: Record<string, string> = {
  HYPO: 'Hipoativo',
  HYPER: 'Hiperativo',
  MOB_L: 'Mobilidade',
  INSTAB: 'Instabilidade',
  CM: 'Controle Motor',
  TECH: 'Técnico',
};

export function TestReasoningChainWithPriority({ 
  testId, 
  prioritizedTest,
  compensationIds,
  contextosAplicados,
}: TestReasoningChainWithPriorityProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get cause IDs that are prioritized for this test
  const prioritizedCauseIds = new Set(prioritizedTest.relatedCauses.map(c => c.id));
  const prioritizedCausesMap = new Map(prioritizedTest.relatedCauses.map(c => [c.id, c]));

  // Build reasoning chain: which compensations → causes → this test
  const reasoningNodes = useMemo(() => {
    const nodes: ReasoningNode[] = [];

    compensationIds.forEach(compId => {
      const causas = compensacaoCausas[compId] || [];
      
      // Filter causes that lead to this specific test
      const relevantCausas = causas.filter(causa => {
        const testsForCausa = causaToTests[causa.id] || [];
        return testsForCausa.includes(testId);
      });

      if (relevantCausas.length > 0) {
        nodes.push({
          compensationId: compId,
          compensationLabel: compensationLabels[compId] || compId,
          causas: relevantCausas.map(causa => {
            const prioritizedCausa = prioritizedCausesMap.get(causa.id);
            return {
              ...causa,
              priorityScore: prioritizedCausa?.priorityScore,
              hasContextBoost: (prioritizedCausa?.contextAdjustment ?? 0) > 0,
            };
          }),
        });
      }
    });

    return nodes;
  }, [testId, compensationIds, prioritizedCausesMap]);

  if (reasoningNodes.length === 0) {
    return null;
  }

  const totalCausas = reasoningNodes.reduce((sum, node) => sum + node.causas.length, 0);
  const contextLabels = getContextLabels(contextosAplicados);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Por que este teste?</span>
            <Badge variant="secondary" className="text-xs">
              {prioritizedTest.coveredCausesCount} causa(s) priorizada(s)
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-3 space-y-4 pl-2">
          {/* Context Boosts */}
          {contextLabels.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Contextos que elevaram prioridade:</span>
              <div className="flex gap-1 flex-wrap">
                {contextLabels.map((label, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-primary/10 border-primary/20">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Prioritized Causes for this test */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Causas que este teste investiga:
            </span>
            <div className="space-y-2 pl-2 border-l-2 border-primary/30">
              {prioritizedTest.relatedCauses.map((causa) => (
                <div key={causa.id} className="flex items-center gap-2 flex-wrap">
                  <Target className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-sm">{causa.label}</span>
                  <Badge 
                    variant="outline" 
                    className={cn('text-[10px] px-1.5 py-0', categoryColors[causa.categoria])}
                  >
                    {categoryLabels[causa.categoria]}
                  </Badge>
                  <span className="text-xs text-primary font-medium">
                    Score: {causa.priorityScore}
                  </span>
                  {causa.contextAdjustment > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-primary/10">
                      +{causa.contextAdjustment} contexto
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Source compensations */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Compensações que geraram essas causas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {reasoningNodes.map((node) => (
                <Badge key={node.compensationId} variant="outline" className="text-xs bg-destructive/5 border-destructive/20">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1 text-destructive" />
                  {node.compensationLabel}
                </Badge>
              ))}
            </div>
          </div>

          {/* Test purpose */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <FlaskConical className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">
              Este teste <span className="text-foreground font-medium">confirma ou descarta</span> as causas acima
            </span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}