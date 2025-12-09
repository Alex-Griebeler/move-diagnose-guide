import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  slsCompensations,
  pushupCompensations,
  getAggregatedMuscles,
} from '@/data/compensationMappings';

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
}

export function TestSummary({ data }: TestSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get all selected compensations
  const ohsSelected = [
    ...data.ohs.anteriorView,
    ...data.ohs.lateralView,
    ...data.ohs.posteriorView,
  ];
  const slsSelected = [...new Set([...data.sls.leftSide, ...data.sls.rightSide])];
  const pushupSelected = data.pushup.compensations;

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

  const totalCompensations =
    ohsSelected.length + data.sls.leftSide.length + data.sls.rightSide.length + pushupSelected.length;

  const totalFindings = allHyperactive.size + allHypoactive.size + allInjuries.size;

  if (totalCompensations === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-8 text-center">
          <Activity className="w-12 h-12 mx-auto text-success mb-4" />
          <h3 className="text-lg font-semibold text-success mb-2">
            Nenhuma compensação identificada
          </h3>
          <p className="text-sm text-muted-foreground">
            O aluno apresenta bons padrões de movimento nos testes globais.
          </p>
        </CardContent>
      </Card>
    );
  }

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

        {/* Summary Stats (always visible) */}
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

        {/* Expansion Button */}
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2 py-5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar Detalhes
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver Detalhes dos Achados
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
