/**
 * Etapa 5a: triagem de red flags do protocolo rápido, antes da escolha do lado.
 * Sem red flag, "Continuar" segue. Com alguma, o cartão de liberação: "Continuar" só com a justificativa,
 * que é gravada logo depois de criar a sessão. "Encerrar" sai sem criar nada.
 */

import { Button } from '@/components/ui/button';
import { RedFlagClearanceCard } from '@/components/red-flags/RedFlagClearance';
import { RED_FLAG_ITEMS, activeRedFlags, justificationOk, type RedFlags } from '@/lib/redFlags';
import { cn } from '@/lib/utils';

interface QuickProtocolTriageProps {
  flags: RedFlags;
  onFlagsChange: (flags: RedFlags) => void;
  justification: string;
  onJustificationChange: (text: string) => void;
  onContinue: () => void;
  onClose: () => void;
}

export function QuickProtocolTriage({
  flags,
  onFlagsChange,
  justification,
  onJustificationChange,
  onContinue,
  onClose,
}: QuickProtocolTriageProps) {
  const active = activeRedFlags(flags);
  const actions = (
    <>
      <Button variant="outline" size="touch" onClick={onClose}>Encerrar</Button>
      <Button size="touch" onClick={onContinue} disabled={active.length > 0 && !justificationOk(justification)}>Continuar</Button>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl">Triagem de red flags</h2>
        <p className="text-sm text-muted-foreground">Marque se o aluno apresentar algum dos sinais abaixo.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RED_FLAG_ITEMS.map(item => (
          <button
            key={item.key}
            type="button"
            aria-pressed={flags[item.key]}
            onClick={() => onFlagsChange({ ...flags, [item.key]: !flags[item.key] })}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
              flags[item.key]
                ? "bg-destructive/10 text-destructive border-destructive"
                : "bg-muted/50 text-muted-foreground border-border hover:border-destructive/50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {active.length > 0 ? (
        <RedFlagClearanceCard
          source="triagem"
          activeFlags={active}
          justification={justification}
          onJustificationChange={onJustificationChange}
        >
          {actions}
        </RedFlagClearanceCard>
      ) : (
        <div className="flex justify-end gap-3">{actions}</div>
      )}
    </div>
  );
}
