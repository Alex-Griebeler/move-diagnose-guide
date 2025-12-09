import { TrendingUp, TrendingDown, AlertTriangle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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

  if (totalCompensations === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium flex items-center gap-2">
            📊 Resumo dos Testes Globais
          </h3>
        </div>
        <div className="py-8 text-center border border-success/30 rounded-lg bg-success/5">
          <p className="text-success font-medium">✅ Nenhuma compensação identificada</p>
          <p className="text-sm text-muted-foreground mt-1">
            O aluno apresenta bons padrões de movimento nos testes globais.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with total findings */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          📊 Resumo dos Testes Globais
        </h3>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalCompensations} achados</span> identificados nos 3 testes
        </p>
      </div>

      {/* Collapsible Accordions */}
      <Accordion type="multiple" className="space-y-3">
        {/* Hyperactive Muscles */}
        <AccordionItem value="hyperactive" className="border border-destructive/30 rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-destructive/5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium">Músculos Hiperativos</span>
              <Badge variant="outline" className="ml-2 text-destructive border-destructive/30">
                {allHyperactive.size}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">Prioridade de inibição/relaxamento</p>
            <div className="flex flex-wrap gap-2">
              {hyperactiveWithFreq.map(({ muscle, count }) => (
                <Badge
                  key={muscle}
                  variant="outline"
                  className={`${
                    count >= 2
                      ? 'bg-destructive/20 border-destructive text-destructive'
                      : 'bg-muted'
                  }`}
                >
                  {muscle}
                  {count >= 2 && <span className="ml-1 text-xs opacity-70">({count}x)</span>}
                </Badge>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Hypoactive Muscles + Injury Risks */}
        <AccordionItem value="hypoactive" className="border border-success/30 rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-success/5">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Músculos Hipoativos e Riscos de Lesão</span>
              <Badge variant="outline" className="ml-2 text-success border-success/30">
                {allHypoactive.size + allInjuries.size}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {/* Hypoactive */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Prioridade de ativação/fortalecimento</p>
              <div className="flex flex-wrap gap-2">
                {hypoactiveWithFreq.map(({ muscle, count }) => (
                  <Badge
                    key={muscle}
                    variant="outline"
                    className={`${
                      count >= 2
                        ? 'bg-success/20 border-success text-success'
                        : 'bg-muted'
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
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3 h-3 text-warning" />
                  <p className="text-xs text-muted-foreground">Riscos de Lesão</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(allInjuries).map((injury) => (
                    <Badge key={injury} variant="outline" className="bg-warning/10 border-warning/30">
                      {injury}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
