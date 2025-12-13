// Utility functions for assessment views

export const getMediaUrls = (mediaUrls: unknown): string[] => {
  if (!mediaUrls) return [];
  if (Array.isArray(mediaUrls)) return mediaUrls as string[];
  if (typeof mediaUrls === 'string') {
    try {
      const parsed = JSON.parse(mediaUrls);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const getPriorityColor = (level: string) => {
  const colors: Record<string, string> = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
    maintenance: 'bg-green-500 text-white',
  };
  return colors[level] || 'bg-muted text-muted-foreground';
};

export const getPriorityLabel = (level: string) => {
  const labels: Record<string, string> = {
    critical: 'Crítico',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
    maintenance: 'Manutenção',
  };
  return labels[level] || level;
};

export const getTestLabel = (testName: string) => {
  const labels: Record<string, string> = {
    overhead_squat: 'Overhead Squat',
    single_leg_squat: 'Single Leg Squat',
    pushup: 'Push-up',
  };
  return labels[testName] || testName;
};

export const countCompensations = (testData: { 
  anterior_view?: unknown; 
  lateral_view?: unknown; 
  posterior_view?: unknown; 
  left_side?: unknown; 
  right_side?: unknown; 
}): number => {
  let count = 0;
  const views = ['anterior_view', 'lateral_view', 'posterior_view', 'left_side', 'right_side'] as const;
  views.forEach(view => {
    const viewData = testData[view];
    if (viewData && typeof viewData === 'object' && 'compensations' in viewData) {
      count += ((viewData as { compensations: string[] }).compensations)?.length || 0;
    }
  });
  return count;
};
