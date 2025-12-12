/**
 * Quick Protocol Side Selector
 * Seletor de lado afetado para Protocolos Rápidos
 */

import { ArrowLeft, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProtocolType, getProtocolMeta } from '@/data/quickProtocolMappings';

type AffectedSide = 'left' | 'right' | 'bilateral';

interface QuickProtocolSideSelectorProps {
  protocolType: ProtocolType;
  onSelect: (side: AffectedSide) => void;
}

export function QuickProtocolSideSelector({ protocolType, onSelect }: QuickProtocolSideSelectorProps) {
  const meta = getProtocolMeta(protocolType);

  // Get body part name for display
  const getBodyPartName = (type: ProtocolType): string => {
    const names: Record<ProtocolType, string> = {
      knee_pain: 'joelho',
      hip_pain: 'quadril',
      low_back_pain: 'coluna lombar',
      shoulder_pain: 'ombro',
      ankle_pain: 'tornozelo',
      elbow_pain: 'cotovelo'
    };
    return names[type];
  };

  const bodyPart = getBodyPartName(protocolType);
  const isSpine = protocolType === 'low_back_pain';

  const sideOptions: { id: AffectedSide; label: string; description: string; icon: React.ReactNode }[] = isSpine
    ? [
        {
          id: 'left',
          label: 'Lado Esquerdo',
          description: 'Dor predominante à esquerda',
          icon: <ArrowLeft className="w-6 h-6" />
        },
        {
          id: 'right',
          label: 'Lado Direito',
          description: 'Dor predominante à direita',
          icon: <ArrowRight className="w-6 h-6" />
        },
        {
          id: 'bilateral',
          label: 'Central / Bilateral',
          description: 'Dor central ou em ambos os lados',
          icon: <ArrowLeftRight className="w-6 h-6" />
        }
      ]
    : [
        {
          id: 'left',
          label: 'Esquerdo',
          description: `${bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)} esquerdo`,
          icon: <ArrowLeft className="w-6 h-6" />
        },
        {
          id: 'right',
          label: 'Direito',
          description: `${bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)} direito`,
          icon: <ArrowRight className="w-6 h-6" />
        },
        {
          id: 'bilateral',
          label: 'Ambos',
          description: 'Dor em ambos os lados',
          icon: <ArrowLeftRight className="w-6 h-6" />
        }
      ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      {/* Title */}
      <h2 className="text-xl font-display mb-2">
        Qual lado está afetado?
      </h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Selecione o lado com dor para direcionar a avaliação
      </p>

      {/* Side Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {sideOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
              "hover:border-primary/50 hover:bg-muted/50",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              "border-border bg-card"
            )}
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              {option.icon}
            </div>
            <div>
              <p className="font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
