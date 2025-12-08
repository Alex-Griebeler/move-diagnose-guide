import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlobalTestData } from './GlobalTestsWizard';
import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  slsCompensations,
  pushupCompensations,
  getAggregatedMuscles,
} from '@/data/compensationMappings';

interface TestSummaryProps {
  data: GlobalTestData;
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

  const hasSlsAsymmetry =
    data.sls.leftSide.length !== data.sls.rightSide.length ||
    !data.sls.leftSide.every((c) => data.sls.rightSide.includes(c));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          📊 Resumo dos Testes Globais
        </h3>
        <p className="text-sm text-muted-foreground">
          Visão consolidada das compensações identificadas nos 3 testes.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-3xl font-bold">{totalCompensations}</p>
            <p className="text-xs text-muted-foreground">Compensações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-3xl font-bold">{allHyperactive.size}</p>
            <p className="text-xs text-muted-foreground">Hiperativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-success" />
            <p className="text-3xl font-bold">{allHypoactive.size}</p>
            <p className="text-xs text-muted-foreground">Hipoativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-warning" />
            <p className="text-3xl font-bold">{allInjuries.size}</p>
            <p className="text-xs text-muted-foreground">Riscos</p>
          </CardContent>
        </Card>
      </div>

      {/* Test Breakdown */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={ohsSelected.length > 0 ? 'border-accent/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              🏋️ Overhead Squat
              <Badge variant={ohsSelected.length > 0 ? 'default' : 'secondary'}>
                {ohsSelected.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <div className="space-y-1">
              <p>Anterior: {data.ohs.anteriorView.length}</p>
              <p>Lateral: {data.ohs.lateralView.length}</p>
              <p>Posterior: {data.ohs.posteriorView.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={slsSelected.length > 0 ? 'border-accent/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              🦵 Single-Leg Squat
              <Badge variant={slsSelected.length > 0 ? 'default' : 'secondary'}>
                {data.sls.leftSide.length + data.sls.rightSide.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <div className="space-y-1">
              <p>Direito: {data.sls.rightSide.length}</p>
              <p>Esquerdo: {data.sls.leftSide.length}</p>
              {hasSlsAsymmetry && (
                <p className="text-warning font-medium">⚠️ Assimetria detectada</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={pushupSelected.length > 0 ? 'border-accent/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              💪 Push-up
              <Badge variant={pushupSelected.length > 0 ? 'default' : 'secondary'}>
                {pushupSelected.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <p>Compensações de core e estabilidade escapular</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Muscles */}
      {totalCompensations > 0 && (
        <>
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <TrendingUp className="w-4 h-4" />
                Músculos Hiperativos (prioridade de inibição)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hyperactiveWithFreq.map(({ muscle, count }) => (
                  <Badge
                    key={muscle}
                    variant="outline"
                    className={`${
                      count >= 2
                        ? 'bg-destructive/20 border-destructive text-destructive'
                        : ''
                    }`}
                  >
                    {muscle}
                    {count >= 2 && <span className="ml-1 text-xs">({count}x)</span>}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-success">
                <TrendingDown className="w-4 h-4" />
                Músculos Hipoativos (prioridade de ativação)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hypoactiveWithFreq.map(({ muscle, count }) => (
                  <Badge
                    key={muscle}
                    variant="outline"
                    className={`${
                      count >= 2
                        ? 'bg-success/20 border-success text-success'
                        : ''
                    }`}
                  >
                    {muscle}
                    {count >= 2 && <span className="ml-1 text-xs">({count}x)</span>}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                Lesões Potencialmente Associadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from(allInjuries).map((injury) => (
                  <Badge key={injury} variant="outline" className="bg-warning/10">
                    {injury}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {totalCompensations === 0 && (
        <Card className="border-success/30">
          <CardContent className="py-8 text-center">
            <p className="text-success font-medium">✅ Nenhuma compensação identificada</p>
            <p className="text-sm text-muted-foreground mt-1">
              O aluno apresenta bons padrões de movimento nos testes globais.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="p-4">
          <p className="text-sm">
            <span className="font-medium">📋 Próximos passos:</span>
            <br />
            <span className="text-muted-foreground">
              Com base nas compensações identificadas, o sistema irá sugerir testes segmentados 
              específicos e gerar um protocolo FABRIK personalizado com exercícios priorizados.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
