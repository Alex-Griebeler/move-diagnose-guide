import { RotateCcw, Target, Zap, Shield, Dumbbell, Flame, LucideIcon } from 'lucide-react';

export interface PhaseConfig {
  label: string;
  icon: LucideIcon;
  color: string;
}

export const phaseConfig: Record<string, PhaseConfig> = {
  mobility: { label: 'Mobilidade', icon: RotateCcw, color: 'text-blue-500' },
  inhibition: { label: 'Inibição', icon: Target, color: 'text-purple-500' },
  activation: { label: 'Ativação', icon: Zap, color: 'text-yellow-500' },
  stability: { label: 'Estabilidade', icon: Shield, color: 'text-green-500' },
  strength: { label: 'Força', icon: Dumbbell, color: 'text-orange-500' },
  integration: { label: 'Integração', icon: Flame, color: 'text-red-500' },
};
