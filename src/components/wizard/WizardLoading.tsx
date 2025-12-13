import { Loader2 } from 'lucide-react';

interface WizardLoadingProps {
  message?: string;
}

export function WizardLoading({ message = 'Carregando dados...' }: WizardLoadingProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}
