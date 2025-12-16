import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Activity, AlertCircle, Circle, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  slsCompensations,
  pushupCompensations,
  getAggregatedMuscles,
  CompensationMapping,
} from '@/data/compensationMappings';
import {
  categorizeCompensations,
  type AnamnesisContext,
  type CategorizedResult,
  type RelevanceLevel,
} from '@/lib/relevanceFilter';
import { cn } from '@/lib/utils';

// Legacy format for TestSummary (display-only)
export interface LegacyTestData {
  ohs: {
    anteriorView: string[];
    lateralView: string[];
    posteriorView: string[];
    notes: string;
  };
  sls: {
    leftSide: string[];
    rightSide: string[];
    notes: string;
  };
  pushup: {
    compensations: string[];
    notes: string;
  };
}

interface TestSummaryProps {
  data: LegacyTestData;
  anamnesisContext?: AnamnesisContext;
}

export function TestSummary({ data, anamnesisContext }: TestSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  // Get all selected compensations
  const ohsSelected = [
    ...data.ohs.anteriorView,
    ...data.ohs.lateralView,
    ...data.ohs.posteriorView,
  ];
  const slsSelected = [...new Set([...data.sls.leftSide, ...data.sls.rightSide])];
  const pushupSelected = data.pushup.compensations;
  const allCompensationIds = [...new Set([...ohsSelected, ...slsSelected, ...pushupSelected])];

  // Categorize compensations if anamnesis context is available
  const categorized: CategorizedResult | null = anamnesisContext 
    ? categorizeCompensations(allCompensationIds, anamnesisContext)
    : null;

  // Get aggregated muscles
  const allOhsCompensations = [
    ...ohsAnteriorCompensations,
    ...ohsLateralCompensations,
    ...ohsPosteriorCompensations,
  ];
  const ohsAggregated = getAggregatedMuscles(allOhsCompensations, ohsSelected);
  const slsAggregated = getAggregatedMuscles(slsCompensations, slsSelected);
  const pushupAggregated = getAggregatedMuscles(pushupCompensations, pushupSelected);

  // Combine all muscles across tests
  const allHyperactive = new Set([
    ...ohsAggregated.hyperactiveMuscles,
    ...slsAggregated.hyperactiveMuscles,
    ...pushupAggregated.hyperactiveMuscles,
  ]);
  const allHypoactive = new Set([
    ...ohsAggregated.hypoactiveMuscles,
    ...slsAggregated.hypoactiveMuscles,
    ...pushupAggregated.hypoactiveMuscles,
  ]);
  const allInjuries = new Set([
    ...ohsAggregated.associatedInjuries,
    ...slsAggregated.associatedInjuries,
    ...pushupAggregated.associatedInjuries,
  ]);

  // Count frequency of each muscle to prioritize
  const muscleFrequency = (muscles: string[], allSets: Set<string>[]) => {
    const counts: Record<string, number> = {};
    muscles.forEach((m) => {
      counts[m] = allSets.filter((set) => set.has(m)).length;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([muscle, count]) => ({ muscle, count }));
  };

  const hyperactiveWithFreq = muscleFrequency(
    Array.from(allHyperactive),
    [
      new Set(ohsAggregated.hyperactiveMuscles),
      new Set(slsAggregated.hyperactiveMuscles),
      new Set(pushupAggregated.hyperactiveMuscles),
    ]
  );

  const hypoactiveWithFreq = muscleFrequency(
    Array.from(allHypoactive),
    [
      new Set(ohsAggregated.hypoactiveMuscles),
      new Set(slsAggregated.hypoactiveMuscles),
      new Set(pushupAggregated.hypoactiveMuscles),
    ]
  );

  const totalCompensations = allCompensationIds.length;

  if (totalCompensations === 0) {
    return (
      <div className="py-8 text-center">
        <Activity className="w-12 h-12 mx-auto text-success mb-4" />
        <h3 className="text-lg font-semibold text-success mb-2 uppercase tracking-wide">
          Nenhuma compensação identificada
        </h3>
        <p className="text-sm text-muted-foreground">
          O aluno apresenta bons padrões de movimento nos testes globais.
        </p>
      </div>
    );
  }

  // Helper to get compensation label
  const getCompensationLabel = (id: string): string => {
    const allMappings = [...allOhsCompensations, ...slsCompensations, ...pushupCompensations];
    const found = allMappings.find(m => m.id === id);
    return found?.label || id;
  };

  return (
    <Card className="border-primary/20 bg-card">
      <CardContent className="p-6 space-y-4">
        {/* Prominent Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold">Resumo dos Testes Globais</h3>
          </div>
          <p className="text-muted-foreground">
            <span className="text-2xl font-bold text-foreground">{totalCompensations}</span>
            {' '}compensações detectadas nos 3 testes
          </p>
        </div>

        {/* Categorized Summary (if context available) */}
        {categorized && (
          <div className="flex justify-center gap-3 py-3 border-y border-border/50">
            {categorized.critical.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="text-sm">
                  <span className="font-semibold text-destructive">{categorized.critical.length}</span> críticas
                </span>
              </div>
            )}
            {categorized.monitor.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span className="text-sm">
                  <span className="font-semibold text-warning">{categorized.monitor.length}</span> monitorar
                </span>
              </div>
            )}
            {categorized.secondary.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" />
                <span className="text-sm">
                  <span className="font-semibold text-muted-foreground">{categorized.secondary.length}</span> secundárias
                </span>
              </div>
            )}
          </div>
        )}

        {/* Alerts for surgical cases */}
        {categorized?.alerts && categorized.alerts.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Atenção: Histórico Cirúrgico</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  {categorized.alerts.map(alert => (
                    <li key={alert.id}>
                      <span className="font-medium">{getCompensationLabel(alert.id)}</span>: {alert.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Categorized Compensations List */}
        {categorized && (
          <div className="space-y-3">
            {/* Critical */}
            {categorized.critical.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-sm font-medium text-destructive">Críticas</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {categorized.critical.map(comp => (
                    <Badge 
                      key={comp.id} 
                      variant="outline" 
                      className="bg-destructive/10 border-destructive/30 text-destructive text-xs"
                      title={comp.reason}
                    >
                      {getCompensationLabel(comp.id)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Monitor */}
            {categorized.monitor.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-sm font-medium text-warning">Monitorar</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {categorized.monitor.map(comp => (
                    <Badge 
                      key={comp.id} 
                      variant="outline" 
                      className="bg-warning/10 border-warning/30 text-warning text-xs"
                      title={comp.reason}
                    >
                      {getCompensationLabel(comp.id)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary (collapsible) */}
            {categorized.secondary.length > 0 && (
              <Collapsible open={showSecondary} onOpenChange={setShowSecondary}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {showSecondary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecondary ? 'Ocultar' : 'Ver'} {categorized.secondary.length} secundárias</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="flex flex-wrap gap-1.5 pl-4">
                    {categorized.secondary.map(comp => (
                      <Badge 
                        key={comp.id} 
                        variant="outline" 
                        className="bg-muted/50 border-muted-foreground/20 text-muted-foreground text-xs"
                        title={comp.reason}
                      >
                        {getCompensationLabel(comp.id)}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Fallback: Simple stats if no context */}
        {!categorized && (
          <div className="flex justify-center gap-4 py-3 border-y border-border/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-destructive" />
              <span className="text-sm">
                <span className="font-semibold text-destructive">{allHyperactive.size}</span> hiperativos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-success" />
              <span className="text-sm">
                <span className="font-semibold text-success">{allHypoactive.size}</span> hipoativos
              </span>
            </div>
            {allInjuries.size > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm">
                  <span className="font-semibold text-warning">{allInjuries.size}</span> riscos
                </span>
              </div>
            )}
          </div>
        )}

        {/* Expansion Button */}
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2 py-5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar Detalhes Musculares
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver Detalhes Musculares
            </>
          )}
        </Button>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Hyperactive Muscles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-destructive" />
                <h4 className="font-medium text-sm">Músculos Hiperativos</h4>
                <span className="text-xs text-muted-foreground">(Prioridade: inibição/relaxamento)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hyperactiveWithFreq.map(({ muscle, count }) => (
                  <Badge
                    key={muscle}
                    variant="outline"
                    className={`${
                      count >= 2
                        ? 'bg-destructive/20 border-destructive text-destructive'
                        : 'bg-muted border-muted-foreground/30'
                    }`}
                  >
                    {muscle}
                    {count >= 2 && <span className="ml-1 text-xs opacity-70">({count}x)</span>}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Hypoactive Muscles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-success" />
                <h4 className="font-medium text-sm">Músculos Hipoativos</h4>
                <span className="text-xs text-muted-foreground">(Prioridade: ativação/fortalecimento)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hypoactiveWithFreq.map(({ muscle, count }) => (
                  <Badge
                    key={muscle}
                    variant="outline"
                    className={`${
                      count >= 2
                        ? 'bg-success/20 border-success text-success'
                        : 'bg-muted border-muted-foreground/30'
                    }`}
                  >
                    {muscle}
                    {count >= 2 && <span className="ml-1 text-xs opacity-70">({count}x)</span>}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Injury Risks */}
            {allInjuries.size > 0 && (
              <div className="space-y-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h4 className="font-medium text-sm">Riscos de Lesão</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(allInjuries).map((injury) => (
                    <Badge 
                      key={injury} 
                      variant="outline" 
                      className="bg-warning/10 border-warning/30 text-warning"
                    >
                      {injury}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
