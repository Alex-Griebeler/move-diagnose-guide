import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Activity, Target, AlertCircle } from 'lucide-react';
import { getTestLabel, countCompensations } from '@/lib/assessmentUtils';

interface AnamnesisData {
  objectives: string | null;
  activity_frequency: number | null;
  sleep_quality: number | null;
  has_red_flags: boolean | null;
}

interface GlobalTestData {
  test_name: string;
  anterior_view: unknown;
  lateral_view: unknown;
  posterior_view: unknown;
  left_side: unknown;
  right_side: unknown;
}

interface SegmentalTestData {
  test_name: string;
  pass_fail_left: boolean | null;
  pass_fail_right: boolean | null;
}

interface OverviewTabProps {
  anamnesis: AnamnesisData | null;
  globalTests: GlobalTestData[];
  segmentalTests: SegmentalTestData[];
}

export function OverviewTab({ anamnesis, globalTests, segmentalTests }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Anamnesis Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Anamnese
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anamnesis ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {anamnesis.objectives && (
                <div>
                  <p className="text-muted-foreground">Objetivo</p>
                  <p className="font-medium">{anamnesis.objectives}</p>
                </div>
              )}
              {anamnesis.activity_frequency && (
                <div>
                  <p className="text-muted-foreground">Frequência</p>
                  <p className="font-medium">{anamnesis.activity_frequency}x/semana</p>
                </div>
              )}
              {anamnesis.sleep_quality && (
                <div>
                  <p className="text-muted-foreground">Qualidade do Sono</p>
                  <p className="font-medium">{anamnesis.sleep_quality}/10</p>
                </div>
              )}
              {anamnesis.has_red_flags && (
                <div>
                  <p className="text-muted-foreground">Red Flags</p>
                  <p className="font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Presente
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma anamnese registrada</p>
          )}
        </CardContent>
      </Card>

      {/* Tests Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Testes Globais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {globalTests.length > 0 ? (
              <div className="space-y-2">
                {globalTests.map(test => (
                  <div key={test.test_name} className="flex justify-between items-center">
                    <span className="text-sm">{getTestLabel(test.test_name)}</span>
                    <Badge variant="secondary">{countCompensations(test)} achados</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum teste global registrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Testes Segmentais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentalTests.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total de testes</span>
                  <Badge variant="secondary">{segmentalTests.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Com déficit</span>
                  <Badge variant="destructive">
                    {segmentalTests.filter(t => t.pass_fail_left === false || t.pass_fail_right === false).length}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum teste segmental registrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
