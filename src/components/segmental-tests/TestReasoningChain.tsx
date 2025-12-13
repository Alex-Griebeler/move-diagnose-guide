// ============================================
// Test Reasoning Chain
// Shows why a test was suggested - uses centralized labels
// ============================================

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, GitBranch, AlertTriangle, Target, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { compensacaoCausas } from '@/data/weightEngine';
import { causaToTests } from '@/data/causaTestMappings';
import { getCompensationLabel } from '@/data/compensationLabels';
import { getCategoryLabel, getCategoryColor } from '@/data/categoryConfig';
import { cn } from '@/lib/utils';

interface TestReasoningChainProps {
  testId: string;
  compensationIds: string[];
}

interface ReasoningNode {
  compensationId: string;
  compensationLabel: string;
  causas: Array<{
    id: string;
    label: string;
    categoria: string;
    baseWeight: number;
  }>;
}

export function TestReasoningChain({ testId, compensationIds }: TestReasoningChainProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          compensationLabel: getCompensationLabel(compId),
          causas: relevantCausas,
        });
      }
    });

    return nodes;
  }, [testId, compensationIds]);

  if (reasoningNodes.length === 0) {
    return null;
  }

  const totalCausas = reasoningNodes.reduce((sum, node) => sum + node.causas.length, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Por que este teste?</span>
            <Badge variant="secondary" className="text-xs">
              {reasoningNodes.length} compensação(ões) • {totalCausas} causa(s)
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
        <div className="mt-3 space-y-3 pl-2">
          {reasoningNodes.map((node, nodeIndex) => (
            <div key={node.compensationId} className="relative">
              {/* Vertical connector line */}
              {nodeIndex < reasoningNodes.length - 1 && (
                <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
              )}

              <div className="flex items-start gap-3">
                {/* Compensation icon */}
                <div className="w-4 h-4 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
                </div>

                <div className="flex-1 space-y-2">
                  {/* Compensation */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{node.compensationLabel}</span>
                    <span className="text-xs text-muted-foreground">({node.compensationId})</span>
                  </div>

                  {/* Causes */}
                  <div className="pl-4 border-l-2 border-muted space-y-1.5">
                    {node.causas.map((causa) => (
                      <div key={causa.id} className="flex items-center gap-2 flex-wrap">
                        <Target className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">{causa.label}</span>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0', getCategoryColor(causa.categoria))}
                        >
                          {getCategoryLabel(causa.categoria)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/70">
                          peso: {causa.baseWeight}
                        </span>
                      </div>
                    ))}

                    {/* Arrow to test */}
                    <div className="flex items-center gap-2 pt-1">
                      <FlaskConical className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-xs text-primary font-medium">→ Este teste confirma/descarta</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
