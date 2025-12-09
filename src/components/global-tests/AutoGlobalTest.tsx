import { useState, useCallback, useEffect } from 'react';
import { Info, Sparkles, X, Plus, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  slsAnteriorCompensations,
  slsPosteriorCompensations,
  pushupPosteriorCompensations,
  getAggregatedMuscles,
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
      mediaUrls: { ...data.mediaUrls, [viewId]: urls },
    });
  }, [data, onUpdate]);

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

  const handleAnalyze = async () => {
    if (!currentMedia.photoUrl) return;
    
    await analyzeMovement({
      testType: config.aiTestType,
      imageUrl: currentMedia.photoUrl,
      videoUrl: currentMedia.videoUrl,
      viewType: currentView.id,
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

  // Get all compensations across all views for summary
  const getAllCompensations = () => {
    const all: string[] = [];
    config.views.forEach(view => {
      const comps = data.compensations[view.id] || [];
      all.push(...comps);
    });
    return all;
  };

  const allSelectedIds = getAllCompensations();
  const allMappings = config.views.flatMap(v => v.compensations);
  const uniqueMappings = allMappings.filter((m, i, arr) => 
    arr.findIndex(x => x.id === m.id) === i
  );
  const aggregated = getAggregatedMuscles(uniqueMappings, allSelectedIds);

  const currentResult = analysisResults[currentView.id];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <span>{config.icon}</span> {config.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          Capture fotos/vídeos de cada vista e a IA detectará as compensações automaticamente.
        </p>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Instruções do teste:</p>
              <ul className="text-muted-foreground list-disc list-inside space-y-1">
                {config.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {config.views.map((view, index) => (
            <button
              key={view.id}
              onClick={() => setCurrentViewIndex(index)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                index === currentViewIndex
                  ? 'bg-primary text-primary-foreground'
                  : (data.compensations[view.id]?.length || 0) > 0
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {view.label}
              {(data.compensations[view.id]?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 p-0 justify-center">
                  {data.compensations[view.id]?.length || 0}
                </Badge>
              )}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {currentViewIndex + 1} de {config.views.length}
        </span>
      </div>

      {/* Current View Content */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{currentView.label}</span>
            {currentResult && (
              <Badge variant="outline" className="text-xs">
                Confiança: {Math.round((currentResult.confidence || 0) * 100)}%
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{currentView.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Media Upload */}
          <MediaUploader
            assessmentId={assessmentId}
            testName={`${testType}_${currentView.id}`}
            viewType={currentView.id}
            onUploadComplete={(urls) => handleMediaUpload(currentView.id, urls)}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />

          {/* AI Analysis Result */}
          {isAnalyzing && (
            <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analisando movimento com IA...</span>
            </div>
          )}

          {currentResult && !isAnalyzing && (
            <Card className="border-accent/50 bg-accent/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Análise da IA</p>
                    <p className="text-xs text-muted-foreground">
                      {currentResult.detected_compensations?.length || 0} compensações detectadas
                    </p>
                  </div>
                </div>
                {currentResult.notes && (
                  <p className="text-sm text-muted-foreground mb-3 italic">
                    "{currentResult.notes}"
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Compensation Chips */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Compensações identificadas
              <span className="text-muted-foreground font-normal ml-1">
                (toque para adicionar/remover)
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {currentView.compensations.map((comp) => {
                const isSelected = currentCompensations.includes(comp.id);
                const wasDetectedByAI = currentResult?.detected_compensations?.includes(comp.id);
                
                return (
                  <button
                    key={comp.id}
                    onClick={() => toggleCompensation(comp.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all',
                      isSelected
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {isSelected ? (
                      <X className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {comp.label}
                    {wasDetectedByAI && !isSelected && (
                      <Sparkles className="h-3 w-3 text-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousView}
          disabled={currentViewIndex === 0}
        >
          Vista Anterior
        </Button>
        <Button
          onClick={handleNextView}
          disabled={currentViewIndex === config.views.length - 1}
        >
          Próxima Vista
          <Check className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Minimal Analysis Indicator */}
      {allSelectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
          <Check className="h-4 w-4 text-success" />
          <span className="text-sm text-muted-foreground">
            Análise concluída · <span className="text-foreground font-medium">{allSelectedIds.length} compensações</span> detectadas
          </span>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Observações adicionais</Label>
        <Textarea
          placeholder="Anote detalhes relevantes sobre o teste..."
          value={data.notes}
          onChange={(e) => onUpdate({ ...data, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
