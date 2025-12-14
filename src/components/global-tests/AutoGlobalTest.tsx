import { useState, useCallback, useEffect } from 'react';
import { Info, Sparkles, X, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  slsAnteriorCompensations,
  slsPosteriorCompensations,
  pushupPosteriorCompensations,
  CompensationMapping,
} from '@/data/compensationMappings';
import { cn } from '@/lib/utils';

type TestType = 'ohs' | 'sls' | 'pushup';
type ViewType = 
  | 'anterior' 
  | 'lateral' 
  | 'posterior' 
  | 'left_anterior' 
  | 'left_posterior' 
  | 'right_anterior' 
  | 'right_posterior';

interface TestConfig {
  id: TestType;
  title: string;
  icon: string;
  instructions: string[];
  views: ViewConfig[];
  aiTestType: 'overhead_squat' | 'single_leg_squat' | 'pushup';
}

interface ViewConfig {
  id: ViewType;
  label: string;
  description: string;
  compensations: CompensationMapping[];
}

const TEST_CONFIGS: Record<TestType, TestConfig> = {
  ohs: {
    id: 'ohs',
    title: 'Overhead Squat (OHS)',
    icon: '🏋️',
    aiTestType: 'overhead_squat',
    instructions: [
      'Pés na largura do quadril, pontas levemente para fora',
      'Braços elevados acima da cabeça, cotovelos estendidos',
      'Agachar o mais profundo possível mantendo calcanhares no chão',
      'Realizar 5 repetições para observação',
    ],
    views: [
      {
        id: 'anterior',
        label: 'Vista Anterior',
        description: 'Posicione-se de frente para o aluno',
        compensations: ohsAnteriorCompensations,
      },
      {
        id: 'lateral',
        label: 'Vista Lateral',
        description: 'Posicione-se ao lado do aluno',
        compensations: ohsLateralCompensations,
      },
      {
        id: 'posterior',
        label: 'Vista Posterior',
        description: 'Posicione-se atrás do aluno',
        compensations: ohsPosteriorCompensations,
      },
    ],
  },
  sls: {
    id: 'sls',
    title: 'Single-Leg Squat (SLS)',
    icon: '🦵',
    aiTestType: 'single_leg_squat',
    instructions: [
      'Em pé sobre uma perna, outra perna levemente elevada à frente',
      'Braços à frente para equilíbrio',
      'Flexionar o joelho de apoio o máximo possível',
      'Manter controle durante todo o movimento',
      'Realizar 3-5 repetições em cada lado e cada vista',
    ],
    views: [
      {
        id: 'left_anterior',
        label: 'Esquerda - Anterior',
        description: 'De frente, aluno apoiado na perna esquerda',
        compensations: slsAnteriorCompensations,
      },
      {
        id: 'left_posterior',
        label: 'Esquerda - Posterior',
        description: 'Por trás, aluno apoiado na perna esquerda',
        compensations: slsPosteriorCompensations,
      },
      {
        id: 'right_anterior',
        label: 'Direita - Anterior',
        description: 'De frente, aluno apoiado na perna direita',
        compensations: slsAnteriorCompensations,
      },
      {
        id: 'right_posterior',
        label: 'Direita - Posterior',
        description: 'Por trás, aluno apoiado na perna direita',
        compensations: slsPosteriorCompensations,
      },
    ],
  },
  pushup: {
    id: 'pushup',
    title: 'Push-up Test',
    icon: '💪',
    aiTestType: 'pushup',
    instructions: [
      'Posição de prancha com mãos na largura dos ombros',
      'Corpo alinhado da cabeça aos calcanhares',
      'Descer controladamente até o peito próximo ao chão',
      'Capturar de trás (visão posterior) para avaliar escápulas',
      'Realizar 5 repetições para avaliação',
    ],
    views: [
      {
        id: 'posterior',
        label: 'Vista Posterior',
        description: 'Posicione-se atrás do aluno para observar escápulas e cotovelos',
        compensations: pushupPosteriorCompensations,
      },
    ],
  },
};

interface AutoGlobalTestProps {
  testType: TestType;
  assessmentId: string;
  data: {
    compensations: Record<ViewType, string[]>;
    mediaUrls: Record<ViewType, { photoUrl?: string; videoUrl?: string }>;
    notes: string;
  };
  onUpdate: (data: AutoGlobalTestProps['data']) => void;
}

export function AutoGlobalTest({ testType, assessmentId, data, onUpdate }: AutoGlobalTestProps) {
  const config = TEST_CONFIGS[testType];
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<Record<ViewType, AnalysisResult | null>>({} as any);

  // Reset view index when test type changes
  useEffect(() => {
    setCurrentViewIndex(0);
  }, [testType]);

  // Derive current view safely (may be undefined if config doesn't exist)
  const currentView = config?.views?.[currentViewIndex];
  const currentViewId = currentView?.id;

  const handleMediaUpload = useCallback((viewId: ViewType, urls: { photoUrl?: string; videoUrl?: string }) => {
    onUpdate({
      ...data,
      mediaUrls: { ...data.mediaUrls, [viewId]: { ...data.mediaUrls[viewId], ...urls } },
    });
  }, [data, onUpdate]);

  // Slow motion is always assumed true for better analysis

  const handleUpdateCompensations = useCallback((viewId: ViewType, compensations: string[]) => {
    onUpdate({
      ...data,
      compensations: { ...data.compensations, [viewId]: compensations },
    });
  }, [data, onUpdate]);
  
  const { analyzeMovement, isAnalyzing } = useMovementAnalysis({
    onAnalysisComplete: (result) => {
      if (!currentViewId || !currentView) return;
      setAnalysisResults(prev => ({ ...prev, [currentViewId]: result }));
      
      // Auto-apply detected compensations
      if (result.detected_compensations) {
        const validCompensations = result.detected_compensations.filter(id =>
          currentView.compensations.some(c => c.id === id)
        );
        handleUpdateCompensations(currentViewId, validCompensations);
      }
    },
  });

  // Early returns AFTER all hooks
  if (!config) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Tipo de teste não encontrado: {testType}
      </div>
    );
  }

  if (!currentView) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Vista não encontrada
      </div>
    );
  }

  const currentCompensations = data.compensations[currentView.id] || [];
  const currentMedia = data.mediaUrls[currentView.id] || {};

  // Extract frame from video when no photo available
  const extractFrameFromVideo = async (videoUrl: string): Promise<string> => {
    // Fetch video as blob to avoid CORS issues with Supabase Storage
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = blobUrl;
      video.muted = true;
      video.playsInline = true;
      
      const cleanup = () => {
        URL.revokeObjectURL(blobUrl);
      };
      
      video.onloadedmetadata = () => {
        // Seek to middle of video for best frame
        video.currentTime = video.duration / 2;
      };
      
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(video, 0, 0);
          const frameUrl = canvas.toDataURL('image/jpeg', 0.8);
          cleanup();
          resolve(frameUrl);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      
      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video'));
      };
      
      video.load();
    });
  };

  const handleAnalyze = async (viewId?: ViewType) => {
    const targetViewId = viewId || currentViewId;
    const targetView = viewId ? config.views.find(v => v.id === viewId) : currentView;
    const media = viewId ? data.mediaUrls[viewId] : currentMedia;
    
    if (!targetViewId || !targetView) return;
    
    let imageUrl = media?.photoUrl;
    
    // If no photo but video exists, extract a frame
    if (!imageUrl && media?.videoUrl) {
      try {
        imageUrl = await extractFrameFromVideo(media.videoUrl);
      } catch (error) {
        console.error('Failed to extract frame from video:', error);
        toast.error('Erro ao extrair frame do vídeo');
        return;
      }
    }
    
    if (!imageUrl) {
      return;
    }
    
    await analyzeMovement({
      testType: config.aiTestType,
      imageUrl,
      videoUrl: media?.videoUrl,
      viewType: targetViewId,
    });
  };

  const toggleCompensation = (compId: string) => {
    const current = currentCompensations;
    const updated = current.includes(compId)
      ? current.filter(c => c !== compId)
      : [...current, compId];
    handleUpdateCompensations(currentView.id, updated);
  };

  const handleNextView = () => {
    if (currentViewIndex < config.views.length - 1) {
      setCurrentViewIndex(currentViewIndex + 1);
    }
  };

  const handlePreviousView = () => {
    if (currentViewIndex > 0) {
      setCurrentViewIndex(currentViewIndex - 1);
    }
  };

  const currentResult = analysisResults[currentView.id];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with Instructions Tooltip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <h3 className="text-lg font-medium">{config.title}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-full hover:bg-muted/80 transition-colors">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium mb-1">Instruções:</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  {config.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-xs text-muted-foreground">
            {currentViewIndex + 1}/{config.views.length}
          </span>
        </div>

        {/* View Navigation - Compact Pills */}
        <div className="flex gap-1.5 flex-wrap">
          {config.views.map((view, index) => {
            const hasCompensations = (data.compensations[view.id]?.length || 0) > 0;
            const isActive = index === currentViewIndex;
            
            return (
              <button
                key={view.id}
                onClick={() => setCurrentViewIndex(index)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : hasCompensations
                      ? 'bg-success/15 text-success'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                )}
              >
                {view.label.replace('Vista ', '').replace('Esquerda - ', 'E ').replace('Direita - ', 'D ')}
                {hasCompensations && (
                  <span className={cn(
                    'h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                    isActive ? 'bg-primary-foreground/20' : 'bg-success/20'
                  )}>
                    {data.compensations[view.id]?.length || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current View Content */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{currentView.label}</CardTitle>
              {currentResult && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {Math.round((currentResult.confidence || 0) * 100)}% confiança
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{currentView.description}</p>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {/* Media Upload with Analyze Button */}
            <MediaUploader
              assessmentId={assessmentId}
              testName={`${testType}_${currentView.id}`}
              viewType={currentView.id}
              initialPhotoUrl={currentMedia.photoUrl}
              initialVideoUrl={currentMedia.videoUrl}
              onUploadComplete={(urls) => handleMediaUpload(currentView.id, urls)}
              onAnalyze={() => handleAnalyze()}
              isAnalyzing={isAnalyzing}
            />

            {/* AI Analysis Loading */}
            {isAnalyzing && (
              <div className="flex items-center justify-center py-3 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analisando...</span>
              </div>
            )}

            {/* AI Analysis Result - Compact */}
            {currentResult && !isAnalyzing && currentResult.notes && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    {currentResult.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Compensation Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Compensações
                </Label>
                {currentCompensations.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {currentCompensations.length} selecionadas
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentView.compensations.map((comp) => {
                  const isSelected = currentCompensations.includes(comp.id);
                  const wasDetectedByAI = currentResult?.detected_compensations?.includes(comp.id);
                  
                  return (
                    <button
                      key={comp.id}
                      onClick={() => toggleCompensation(comp.id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                        isSelected
                          ? 'bg-destructive text-destructive-foreground'
                          : wasDetectedByAI
                            ? 'bg-accent/15 text-accent border border-accent/30'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {isSelected ? (
                        <X className="h-3 w-3" />
                      ) : wasDetectedByAI ? (
                        <Sparkles className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {comp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* View Navigation Buttons - Only show if multiple views */}
      {config.views.length > 1 && (
        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentViewIndex(Math.max(0, currentViewIndex - 1))}
            disabled={currentViewIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Vista Anterior
          </Button>
          <Button
            size="sm"
            onClick={() => setCurrentViewIndex(Math.min(config.views.length - 1, currentViewIndex + 1))}
            disabled={currentViewIndex === config.views.length - 1}
            className="gap-1"
          >
            Próxima Vista
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Notes - Collapsible */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
        <Textarea
          placeholder="Anote detalhes relevantes..."
          value={data.notes}
          onChange={(e) => onUpdate({ ...data, notes: e.target.value })}
          rows={2}
          className="text-sm resize-none"
        />
      </div>
    </div>
    </TooltipProvider>
  );
}
