// ============================================
// Category Configuration - Single Source of Truth
// Colors and labels for cause categories
// ============================================

export const CATEGORY_LABELS: Record<string, string> = {
  HYPO: 'Hipoativo',
  HYPER: 'Hiperativo',
  MOB_L: 'Mobilidade',
  INSTAB: 'Instabilidade',
  CM: 'Controle Motor',
  TECH: 'Técnico',
};

export const CATEGORY_COLORS: Record<string, string> = {
  HYPO: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  HYPER: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  MOB_L: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  INSTAB: 'bg-red-500/10 text-red-600 border-red-500/30',
  CM: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  TECH: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '';
}
