import { Shield, FileText, Check } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ConsentStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

export function ConsentStep({ data, updateData }: ConsentStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Consentimento LGPD</h3>
        <p className="text-sm text-muted-foreground">
          Leia os termos abaixo e confirme seu consentimento para prosseguir.
        </p>
      </div>

      {/* Terms */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <FileText className="w-4 h-4" />
          <Label className="text-base font-medium">Termos de Privacidade</Label>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="h-[220px] p-4">
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
              <div>
                <h4 className="text-foreground font-semibold text-sm mb-1">1. Coleta de Dados</h4>
                <p className="text-xs">
                  O FABRIK coleta dados pessoais e de saúde para avaliação de movimento e prescrição de exercícios: 
                  dados pessoais, histórico de saúde, hábitos de vida e resultados de testes.
                </p>
              </div>

              <div>
                <h4 className="text-foreground font-semibold text-sm mb-1">2. Finalidade</h4>
                <p className="text-xs">
                  Os dados são utilizados para realizar avaliação de padrões de movimento, 
                  gerar protocolos personalizados e acompanhar evolução do aluno.
                </p>
              </div>

              <div>
                <h4 className="text-foreground font-semibold text-sm mb-1">3. Compartilhamento</h4>
                <p className="text-xs">
                  Seus dados são compartilhados apenas com o profissional responsável 
                  e não são vendidos ou transferidos para terceiros.
                </p>
              </div>

              <div>
                <h4 className="text-foreground font-semibold text-sm mb-1">4. Seus Direitos (LGPD)</h4>
                <p className="text-xs">
                  Você pode acessar, corrigir, solicitar exclusão ou revogar consentimento a qualquer momento, 
                  conforme Lei 13.709/2018.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Consent Button */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-foreground">
          <Shield className="w-4 h-4" />
          <Label className="text-base font-medium">Confirmação</Label>
        </div>

        <button
          type="button"
          onClick={() => updateData({ lgpdConsent: !data.lgpdConsent })}
          className={cn(
            "w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3",
            data.lgpdConsent
              ? "border-success bg-success/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            data.lgpdConsent
              ? "border-success bg-success text-success-foreground"
              : "border-muted-foreground"
          )}>
            {data.lgpdConsent && <Check className="w-4 h-4" />}
          </div>
          <div className="text-left">
            <p className={cn(
              "font-medium text-sm",
              data.lgpdConsent ? "text-success" : "text-foreground"
            )}>
              Li e concordo com os termos
            </p>
            <p className="text-xs text-muted-foreground">
              Autorizo o tratamento dos meus dados pessoais conforme descrito.
            </p>
          </div>
        </button>

        {!data.lgpdConsent && (
          <p className="text-sm text-warning text-center">
            É necessário aceitar os termos para concluir a anamnese.
          </p>
        )}
      </div>
    </div>
  );
}
