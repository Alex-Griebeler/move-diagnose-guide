import { Shield, FileText } from 'lucide-react';
import { AnamnesisData } from '../AnamnesisWizard';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConsentStepProps {
  data: AnamnesisData;
  updateData: (updates: Partial<AnamnesisData>) => void;
}

export function ConsentStep({ data, updateData }: ConsentStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          Consentimento LGPD
        </h3>
        <p className="text-sm text-muted-foreground">
          Leia os termos abaixo e confirme seu consentimento para prosseguir.
        </p>
      </div>

      {/* Terms */}
      <div className="border rounded-lg">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">Termos de Consentimento e Privacidade</span>
        </div>
        <ScrollArea className="h-[250px] p-4">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <h4 className="text-foreground font-semibold">1. Coleta de Dados</h4>
            <p>
              O FABRIK Movement & Performance Screen coleta dados pessoais e de saúde 
              para fins de avaliação de movimento e prescrição de exercícios. Os dados 
              coletados incluem:
            </p>
            <ul>
              <li>Dados pessoais (nome, idade, peso, altura)</li>
              <li>Histórico de saúde (dores, lesões, cirurgias)</li>
              <li>Hábitos de vida (sono, atividade física, rotina)</li>
              <li>Resultados de testes de movimento</li>
            </ul>

            <h4 className="text-foreground font-semibold mt-4">2. Finalidade</h4>
            <p>
              Os dados são utilizados exclusivamente para:
            </p>
            <ul>
              <li>Realizar avaliação de padrões de movimento</li>
              <li>Gerar protocolos de exercícios personalizados</li>
              <li>Acompanhar evolução e progresso do aluno</li>
              <li>Comunicação entre profissional e aluno</li>
            </ul>

            <h4 className="text-foreground font-semibold mt-4">3. Compartilhamento</h4>
            <p>
              Seus dados são compartilhados apenas com o profissional responsável 
              pela sua avaliação e não são vendidos ou transferidos para terceiros 
              sem seu consentimento expresso.
            </p>

            <h4 className="text-foreground font-semibold mt-4">4. Segurança</h4>
            <p>
              Utilizamos criptografia e medidas de segurança para proteger seus dados. 
              O acesso é restrito a pessoas autorizadas.
            </p>

            <h4 className="text-foreground font-semibold mt-4">5. Seus Direitos (LGPD)</h4>
            <p>
              Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:
            </p>
            <ul>
              <li>Acessar seus dados a qualquer momento</li>
              <li>Corrigir dados incompletos ou incorretos</li>
              <li>Solicitar exclusão dos seus dados</li>
              <li>Revogar este consentimento a qualquer momento</li>
            </ul>

            <h4 className="text-foreground font-semibold mt-4">6. Retenção</h4>
            <p>
              Os dados serão mantidos enquanto houver relação ativa com o profissional 
              ou pelo prazo legal aplicável, o que for maior.
            </p>
          </div>
        </ScrollArea>
      </div>

      {/* Consent Checkbox */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="lgpdConsent"
            checked={data.lgpdConsent}
            onCheckedChange={(checked) => updateData({ lgpdConsent: checked as boolean })}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label htmlFor="lgpdConsent" className="cursor-pointer font-medium">
              Li e concordo com os termos acima
            </Label>
            <p className="text-sm text-muted-foreground">
              Ao marcar esta opção, você declara ter lido e compreendido os termos 
              de consentimento e autoriza o tratamento dos seus dados pessoais 
              conforme descrito.
            </p>
          </div>
        </div>
      </div>

      {!data.lgpdConsent && (
        <p className="text-sm text-warning text-center">
          É necessário aceitar os termos para concluir a anamnese.
        </p>
      )}
    </div>
  );
}
