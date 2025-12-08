import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SegmentalTest } from '@/data/segmentalTestMappings';
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle } from 'lucide-react';

interface TestResult {
  testId: string;
  testName: string;
  bodyRegion: string;
  leftValue: number | null;
  rightValue: number | null;
  passFailLeft: boolean | null;
  passFailRight: boolean | null;
  notes: string;
  unit: string;
  cutoffValue?: number;
}

interface SegmentalTestsSummaryProps {
  results: Record<string, TestResult>;
  tests: SegmentalTest[];
  groupedTests: Record<string, SegmentalTest[]>;
}

export function SegmentalTestsSummary({ results, tests, groupedTests }: SegmentalTestsSummaryProps) {
  const getResultStatus = (result: TestResult, test: SegmentalTest): 'pass' | 'fail' | 'partial' | 'unknown' => {
    if (test.isBilateral) {
      if (result.passFailLeft === null && result.passFailRight === null) return 'unknown';
      if (result.passFailLeft === true && result.passFailRight === true) return 'pass';
      if (result.passFailLeft === false && result.passFailRight === false) return 'fail';
      if ((result.passFailLeft === true && result.passFailRight === false) || 
          (result.passFailLeft === false && result.passFailRight === true)) return 'partial';
      return 'unknown';
    } else {
      if (result.passFailLeft === null) return 'unknown';
      return result.passFailLeft ? 'pass' : 'fail';
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'partial' | 'unknown') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: 'pass' | 'fail' | 'partial' | 'unknown') => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-success/10 text-success border-success/20">Adequado</Badge>;
      case 'fail':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Déficit</Badge>;
      case 'partial':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Assimétrico</Badge>;
      default:
        return <Badge variant="secondary">Não avaliado</Badge>;
    }
  };

  // Calculate summary statistics
  const stats = tests.reduce(
    (acc, test) => {
      const result = results[test.id];
      const status = getResultStatus(result, test);
      acc[status]++;
      return acc;
    },
    { pass: 0, fail: 0, partial: 0, unknown: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-success">{stats.pass}</div>
            <p className="text-xs text-muted-foreground">Adequados</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.fail}</div>
            <p className="text-xs text-muted-foreground">Déficits</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-warning">{stats.partial}</div>
            <p className="text-xs text-muted-foreground">Assimétricos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats.unknown}</div>
            <p className="text-xs text-muted-foreground">Não avaliados</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results by Region */}
      {Object.entries(groupedTests).map(([region, regionTests]) => (
        <Card key={region}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline">{region}</Badge>
              <span className="text-muted-foreground font-normal">
                ({regionTests.length} teste{regionTests.length > 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {regionTests.map(test => {
              const result = results[test.id];
              const status = getResultStatus(result, test);

              return (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div>
                      <p className="font-medium text-sm">{test.name}</p>
                      {test.isBilateral ? (
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>
                            E: {result.leftValue !== null ? `${result.leftValue} ${test.unit}` : '-'}
                          </span>
                          <span>
                            D: {result.rightValue !== null ? `${result.rightValue} ${test.unit}` : '-'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.leftValue !== null ? `${result.leftValue} ${test.unit}` : '-'}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
