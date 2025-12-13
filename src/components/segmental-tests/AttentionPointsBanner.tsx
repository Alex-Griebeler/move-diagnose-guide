// ============================================
// Attention Points Banner
// Modular component for displaying attention points
// ============================================

import { Target } from 'lucide-react';
import { AttentionPoint } from '@/lib/attentionPointsEngine';

interface AttentionPointsBannerProps {
  attentionPoints: AttentionPoint[];
}

export function AttentionPointsBanner({ attentionPoints }: AttentionPointsBannerProps) {
  if (!attentionPoints || attentionPoints.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            Pontos de Atenção Identificados
          </p>
          <div className="flex flex-wrap gap-2">
            {attentionPoints.map((ap) => (
              <span
                key={ap.compensationId}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
              >
                {ap.label}
                {ap.frequencyScore > 1 && (
                  <span className="ml-1 opacity-70">×{ap.frequencyScore}</span>
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Testes focados nestas {attentionPoints.length} compensações mais acentuadas
          </p>
        </div>
      </div>
    </div>
  );
}
