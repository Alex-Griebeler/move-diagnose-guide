import { ClipboardList } from 'lucide-react';
import fabrikLogo from '@/assets/fabrik-logo.png';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StudentDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <img src={fabrikLogo} alt="FABRIK" className="h-12 w-auto shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Bem-vindo ao FABRIK</h2>
              <p className="text-sm text-muted-foreground">
                Você ainda não possui avaliações. Aguarde seu profissional iniciar uma avaliação de movimento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Protocol */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Seu Protocolo</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum protocolo ativo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Após sua avaliação, seus exercícios aparecerão aqui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Seu Progresso</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Exercícios Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-foreground">0</div>
              <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próxima Reavaliação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-muted-foreground">--</div>
              <p className="text-xs text-muted-foreground mt-1">Não agendada</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
