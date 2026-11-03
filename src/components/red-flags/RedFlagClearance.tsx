import { useId, useState, type ReactNode } from 'react';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JUSTIFICATION_MAX, justificationOk, redFlagLabel } from '@/lib/redFlags';

// Etapa 5a: with a red flag, the protocol waits for the professional to clear it with a justification.
// The buttons come from the screen: "Liberar e gerar protocolo" in the assessment, "Continuar" and
// "Encerrar" in the quick protocol triage.
interface RedFlagClearanceCardProps {
  source: 'anamnese' | 'triagem';
  activeFlags: string[];
  justification: string;
  onJustificationChange: (text: string) => void;
  children: ReactNode;
}

export function RedFlagClearanceCard({ source, activeFlags, justification, onJustificationChange, children }: RedFlagClearanceCardProps) {
  const fieldId = useId();
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-base flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <span>Red flags na {source} — {activeFlags.map(redFlagLabel).join(', ')}</span>
        </CardTitle>
        <CardDescription>
          O protocolo fica travado até você liberar, com justificativa (por exemplo, liberação médica com data).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={fieldId}>Justificativa (mínimo de 20 caracteres)</Label>
          <Textarea
            id={fieldId}
            value={justification}
            maxLength={JUSTIFICATION_MAX}
            onChange={e => onJustificationChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}

// The valid clearance, above the protocol; revoking it needs a reason and brings the card back
interface RedFlagClearedNoteProps {
  clearance: { justification: string; createdAt: string };
  busy: boolean;
  onRevoke: (reason: string) => void;
}

export function RedFlagClearedNote({ clearance, busy, onRevoke }: RedFlagClearedNoteProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const fieldId = useId();
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <ShieldCheck className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="flex-1 whitespace-pre-wrap break-words">
            Liberado por você em {new Date(clearance.createdAt).toLocaleDateString('pt-BR')}: {clearance.justification}
          </p>
          {!open && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen(true)}>
              Revogar
            </Button>
          )}
        </div>
        {open && (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>Motivo da revogação (mínimo de 20 caracteres)</Label>
            <Textarea id={fieldId} value={reason} maxLength={JUSTIFICATION_MAX} onChange={e => setReason(e.target.value)} />
            <div className="flex justify-end">
              <Button variant="destructive" disabled={busy || !justificationOk(reason)} onClick={() => onRevoke(reason)}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Revogar liberação
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
