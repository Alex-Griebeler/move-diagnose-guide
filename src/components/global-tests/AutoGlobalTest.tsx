import { useState, useCallback, useEffect } from 'react';
import { Info, Sparkles, X, Plus, Loader2, ChevronLeft, ChevronRight, AlertCircle, ShieldAlert, ShieldCheck, ShieldQuestion, Eye, Sun, Focus, ImageOff, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  ohsAnteriorCompensations, ohsLateralCompensations, ohsPosteriorCompensations,
  slsAnteriorCompensations, slsLateralCompensations, slsPosteriorCompensations,
  pushupLateralCompensations, pushupPosteriorCompensations,
  CompensationMapping,
} from '@/data/compensationMappings';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Clinical analysis modules
import { assessMediaQuality } from '@/lib/clinical/mediaQuality';
import { analyzePose, analyzeVideoTemporal } from '@/lib/clinical/poseBiomechanics';
import { fuseEvidence } from '@/lib/clinical/biomechanicalScoring';
import type { QualityResult, PoseResult, EvidenceMetadata, ViewReliabilityStatus, CaptureContext } from '@/lib/clinical/types';

// ============================================
// Extract filePath from signed URL for refresh
// ============================================
const extractFilePathFromSignedUrl = (signedUrl: string): string | null => {
  const match = signedUrl.match(/assessment-media\/([^?]+)/);
  return match ? match[1] : null;
};

// ============================================
// Types & Config
// ============================================
type TestType = 'ohs' | 'sls' | 'pushup';
type ViewType =
  | 'anterior' | 'lateral' | 'posterior'
  | 'left_anterior' | 'left_lateral' | 'left_posterior'
  | 'right_anterior' | 'right_lateral' | 'right_posterior';

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

// ============================================
// Test Configurations
// ============================================
const TEST_CONFIGS: Record<TestType, TestConfig> = {
  ohs: {
    id: 'ohs', title: 'Overhead Squat (OHS)', icon: '🏋️', aiTestType: 'overhead_squat',
    instructions: [
      'Pés na largura do quadril, pontas levemente para fora',
      'Braços elevados acima da cabeça, cotovelos estendidos',
      'Agachar o mais profundo possível mantendo calcanhares no chão',
      'Realizar 5 repetições para observação',
    ],
    views: [
      { id: 'anterior', label: 'Vista Anterior', description: 'Posicione-se de frente para o aluno', compensations: ohsAnteriorCompensations },
      { id: 'lateral', label: 'Vista Lateral', description: 'Posicione-se ao lado do aluno', compensations: ohsLateralCompensations },
      { id: 'posterior', label: 'Vista Posterior', description: 'Posicione-se atrás do aluno', compensations: ohsPosteriorCompensations },
    ],
  },
  sls: {
    id: 'sls', title: 'Single-Leg Squat (SLS)', icon: '🦵', aiTestType: 'single_leg_squat',
    instructions: [
      'Em pé sobre uma perna, outra perna levemente elevada à frente',
      'Braços à frente para equilíbrio',
      'Flexionar o joelho de apoio o máximo possível',
      'Manter controle durante todo o movimento',
      'Realizar 3-5 repetições em cada lado e cada vista',
    ],
    views: [
      { id: 'left_anterior', label: 'Esquerda - Anterior', description: 'De frente, aluno apoiado na perna esquerda', compensations: slsAnteriorCompensations },
      { id: 'left_lateral', label: 'Esquerda - Lateral', description: 'De lado, aluno apoiado na perna esquerda', compensations: slsLateralCompensations },
      { id: 'left_posterior', label: 'Esquerda - Posterior', description: 'Por trás, aluno apoiado na perna esquerda', compensations: slsPosteriorCompensations },
      { id: 'right_anterior', label: 'Direita - Anterior', description: 'De frente, aluno apoiado na perna direita', compensations: slsAnteriorCompensations },
      { id: 'right_lateral', label: 'Direita - Lateral', description: 'De lado, aluno apoiado na perna direita', compensations: slsLateralCompensations },
      { id: 'right_posterior', label: 'Direita - Posterior', description: 'Por trás, aluno apoiado na perna direita', compensations: slsPosteriorCompensations },
    ],
  },
  pushup: {
    id: 'pushup', title: 'Push-up Test', icon: '💪', aiTestType: 'pushup',
    instructions: [
      'Posição de prancha com mãos na largura dos ombros',
      'Corpo alinhado da cabeça aos calcanhares',
      'Descer controladamente até o peito próximo ao chão',
      'Capturar de lado e de trás para avaliação completa',
      'Realizar 5 repetições para avaliação',
    ],
    views: [
      { id: 'lateral', label: 'Vista Lateral', description: 'Posicione-se ao lado do aluno para observar alinhamento do quadril', compensations: pushupLateralCompensations },
      { id: 'posterior', label: 'Vista Posterior', description: 'Posicione-se atrás do aluno para observar escápulas e cotovelos', compensations: pushupPosteriorCompensations },
    ],
  },
};

// ============================================
// Status Display Config
// ============================================
const STATUS_CONFIG: Record<ViewReliabilityStatus, { icon: typeof ShieldCheck; label: string; color: string; bgColor: string }> = {
  ready: { icon: ShieldCheck, label: 'Pronto', color: 'text-success', bgColor: 'bg-success/15' },
  indeterminate: { icon: ShieldQuestion, label: 'Revisão necessária', color: 'text-warning', bgColor: 'bg-warning/15' },
  blocked_quality: { icon: ShieldAlert, label: 'Qualidade bloqueada', color: 'text-destructive', bgColor: 'bg-destructive/15' },
};

const QUALITY_ISSUE_ICONS: Record<string, typeof Sun> = {
  low_brightness: Sun, high_brightness: Sun, low_contrast: Eye, low_sharpness: Focus, low_resolution: ImageOff,
};

// ============================================
// Props
// ============================================
export interface AutoGlobalTestProps {
  testType: TestType;
  assessmentId: string;
  data: {
    compensations: Record<ViewType, string[]>;
    mediaUrls: Record<ViewType, { photoUrl?: string; videoUrl?: string }>;
    notes: string;
    evidenceMetadata?: Record<ViewType, EvidenceMetadata>;
  };
  onUpdate: (data: AutoGlobalTestProps['data']) => void;
}

// ============================================
// Component
// ============================================
export function AutoGlobalTest({ testType, assessmentId, data, onUpdate }: AutoGlobalTestProps) {
  const config = TEST_CONFIGS[testType];
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<Record<ViewType, AnalysisResult | null>>({} as any);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setCurrentViewIndex(0); }, [testType]);

  const currentView = config?.views?.[currentViewIndex];
  const currentViewId = currentView?.id;

  const handleMediaUpload = useCallback((viewId: ViewType, urls: { photoUrl?: string; videoUrl?: string }) => {
    onUpdate({ ...data, mediaUrls: { ...data.mediaUrls, [viewId]: { ...data.mediaUrls[viewId], ...urls } } });
  }, [data, onUpdate]);

  const handleUpdateCompensations = useCallback((viewId: ViewType, compensations: string[]) => {
    onUpdate({ ...data, compensations: { ...data.compensations, [viewId]: compensations } });
  }, [data, onUpdate]);

  const handleUpdateEvidence = useCallback((viewId: ViewType, metadata: EvidenceMetadata) => {
    onUpdate({ ...data, evidenceMetadata: { ...data.evidenceMetadata, [viewId]: metadata } });
  }, [data, onUpdate]);

  const { analyzeMovement, isAnalyzing } = useMovementAnalysis({
    onAnalysisComplete: (result) => {
      if (!currentViewId) return;
      setAnalysisResults(prev => ({ ...prev, [currentViewId]: result }));
    },
  });

  const isLoadingAnalysis = isProcessing || isAnalyzing;

  if (!config) return <div className="p-4 text-center text-muted-foreground">Tipo de teste não encontrado: {testType}</div>;
  if (!currentView) return <div className="p-4 text-center text-muted-foreground">Vista não encontrada</div>;

  const currentCompensations = data.compensations[currentView.id] || [];
  const currentMedia = data.mediaUrls[currentView.id] || {};
  const currentEvidence = data.evidenceMetadata?.[currentView.id];
  const currentAiResult = analysisResults[currentView.id];

  // ============================================
  // Signed URL refresh helper
  // ============================================
  const refreshSignedUrl = async (url: string, viewId: ViewType, mediaType: 'photo' | 'video'): Promise<string | null> => {
    if (!url.includes('token=')) return url;
    const filePath = extractFilePathFromSignedUrl(url);
    if (!filePath) return url;
    try {
      const { data: signedData, error } = await supabase.functions.invoke('get-signed-url', { body: { filePath } });
      if (error || signedData?.error) {
        if (signedData?.code === 404) {
          handleMediaUpload(viewId, mediaType === 'video' ? { videoUrl: undefined } : { photoUrl: undefined });
          toast.error(`${mediaType === 'video' ? 'Vídeo' : 'Foto'} não encontrado. Por favor, faça upload novamente.`);
        } else {
          toast.error(`Erro ao acessar ${mediaType === 'video' ? 'vídeo' : 'foto'}. Por favor, faça upload novamente.`);
        }
        return null;
      }
      return signedData?.signedUrl || url;
    } catch {
      toast.error(`Erro ao acessar ${mediaType === 'video' ? 'vídeo' : 'foto'}.`);
      return null;
    }
  };

  // ============================================
  // Extract frame from video
  // ============================================
  const extractFrameFromVideo = async (videoUrl: string): Promise<string> => {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error('Failed to fetch video');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = blobUrl;
      video.muted = true;
      video.playsInline = true;
      const cleanup = () => URL.revokeObjectURL(blobUrl);
      video.onloadedmetadata = () => { video.currentTime = video.duration / 2; };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { cleanup(); reject(new Error('No canvas context')); return; }
          ctx.drawImage(video, 0, 0);
          cleanup();
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (e) { cleanup(); reject(e); }
      };
      video.onerror = () => { cleanup(); reject(new Error('Video load failed')); };
      video.load();
    });
  };

  // ============================================
  // Load video element for temporal analysis
  // ============================================
  const loadVideoElement = (url: string): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.onloadedmetadata = () => resolve(video);
      video.onerror = () => reject(new Error('Video load failed'));
      video.load();
    });
  };

  // ============================================
  // Load image from URL for quality/pose analysis
  // ============================================
  const loadImageElement = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
  };

  // ============================================
  // Full Analysis Pipeline (with temporal support)
  // ============================================
  const handleAnalyze = async () => {
    if (!currentViewId || !currentView) return;
    setIsProcessing(true);

    try {
      let imageUrl = currentMedia.photoUrl;
      let videoUrl = currentMedia.videoUrl;

      // Refresh signed URLs
      if (videoUrl && videoUrl.includes('token=')) {
        videoUrl = await refreshSignedUrl(videoUrl, currentViewId, 'video') || undefined;
      }
      if (!imageUrl && videoUrl) {
        try { imageUrl = await extractFrameFromVideo(videoUrl); } catch {
          toast.error('Erro ao extrair frame do vídeo');
          setIsProcessing(false);
          return;
        }
      }
      if (imageUrl && imageUrl.includes('token=')) {
        imageUrl = await refreshSignedUrl(imageUrl, currentViewId, 'photo') || undefined;
      }
      if (!imageUrl) { setIsProcessing(false); return; }

      // Step 1: Quality Gate
      let qualityResult: QualityResult;
      try {
        const imgElement = await loadImageElement(imageUrl);
        qualityResult = assessMediaQuality(imgElement);
      } catch {
        qualityResult = { passed: true, score: 0.5, issues: [], metrics: { brightness: 128, contrast: 50, sharpness: 30, width: 640, height: 480 } };
      }

      // Build capture context
      const captureContext: CaptureContext = {
        sourceType: videoUrl ? 'video' : 'photo',
        sourceWidth: qualityResult.metrics.width,
        sourceHeight: qualityResult.metrics.height,
      };

      if (!qualityResult.passed) {
        const fusionResult = fuseEvidence(null, null, qualityResult, captureContext);
        handleUpdateEvidence(currentViewId, fusionResult.evidenceMetadata);
        toast.error('Qualidade da mídia insuficiente para análise automática', {
          description: qualityResult.issues.map(i => i.label).join(', '),
        });
        setIsProcessing(false);
        return;
      }

      // Step 2: Pose Analysis — use temporal if video available
      let poseResult: PoseResult | null = null;
      try {
        if (videoUrl) {
          // Temporal video analysis
          const videoElement = await loadVideoElement(videoUrl);
          poseResult = await analyzeVideoTemporal(videoElement, config.aiTestType, currentViewId);
          captureContext.sourceDurationMs = Math.round((videoElement.duration || 0) * 1000);
          if (poseResult.frameCountRequested !== undefined) {
            captureContext.frameSampling = {
              frameCountRequested: poseResult.frameCountRequested,
              frameCountUsed: poseResult.frameCountUsed || 0,
              stabilityScore: poseResult.temporalStabilityScore || 0,
              timeoutOccurred: poseResult.temporalTimeoutFallback || false,
            };
          }
        } else {
          const imgElement = await loadImageElement(imageUrl);
          poseResult = await analyzePose(imgElement, config.aiTestType, currentViewId);
        }
      } catch {
        console.warn('Pose analysis skipped — model unavailable');
      }

      // Step 3: AI Analysis
      const aiResult = await analyzeMovement({
        testType: config.aiTestType,
        imageUrl,
        videoUrl,
        viewType: currentViewId,
      });

      // Step 4: Evidence Fusion (with captureContext)
      const fusionResult = fuseEvidence(aiResult, poseResult, qualityResult, captureContext);
      handleUpdateEvidence(currentViewId, fusionResult.evidenceMetadata);

      // Step 5: Apply compensations based on status
      if (fusionResult.status === 'ready' && fusionResult.autoApplyCompensations.length > 0) {
        const validCompensations = fusionResult.autoApplyCompensations.filter(id =>
          currentView.compensations.some(c => c.id === id)
        );
        handleUpdateCompensations(currentViewId, validCompensations);
      } else if (fusionResult.status === 'indeterminate') {
        toast.warning('Evidência insuficiente para auto-aplicação — revise manualmente', {
          description: fusionResult.indeterminateReasons.join('; '),
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCompensation = (compId: string) => {
    const updated = currentCompensations.includes(compId)
      ? currentCompensations.filter(c => c !== compId)
      : [...currentCompensations, compId];
    handleUpdateCompensations(currentView.id, updated);
  };

  // ============================================
  // Render
  // ============================================
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
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
                  {config.instructions.map((instruction, i) => <li key={i}>{instruction}</li>)}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-xs text-muted-foreground">{currentViewIndex + 1}/{config.views.length}</span>
        </div>

        {/* View Navigation Pills */}
        <div className="flex gap-1.5 flex-wrap">
          {config.views.map((view, index) => {
            const hasCompensations = (data.compensations[view.id]?.length || 0) > 0;
            const isActive = index === currentViewIndex;
            const viewEvidence = data.evidenceMetadata?.[view.id];
            const viewStatus = viewEvidence?.status;

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
                {viewStatus && (
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    viewStatus === 'ready' && 'bg-success',
                    viewStatus === 'indeterminate' && 'bg-warning',
                    viewStatus === 'blocked_quality' && 'bg-destructive',
                  )} />
                )}
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

        <p className="text-xs text-muted-foreground">{currentView.description}</p>

        {/* View Content */}
        <div className="space-y-3">
          {/* Media Upload */}
          <MediaUploader
            assessmentId={assessmentId}
            testName={`${testType}_${currentView.id}`}
            viewType={currentView.id}
            initialPhotoUrl={currentMedia.photoUrl}
            initialVideoUrl={currentMedia.videoUrl}
            onUploadComplete={(urls) => handleMediaUpload(currentView.id, urls)}
            onAnalyze={() => handleAnalyze()}
            isAnalyzing={isLoadingAnalysis}
            embedded
          />

          {/* Quality Blocked Banner */}
          {currentEvidence?.status === 'blocked_quality' && !isLoadingAnalysis && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Qualidade insuficiente para análise
              </div>
              <div className="flex flex-wrap gap-2">
                {currentEvidence.qualityIssues.map(issue => {
                  const IconComp = QUALITY_ISSUE_ICONS[issue] || AlertCircle;
                  const labels: Record<string, string> = {
                    low_brightness: 'Iluminação insuficiente', high_brightness: 'Superexposta',
                    low_contrast: 'Baixo contraste', low_sharpness: 'Borrada', low_resolution: 'Resolução baixa',
                  };
                  return (
                    <span key={issue} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-destructive/10 text-destructive">
                      <IconComp className="h-3 w-3" />
                      {labels[issue] || issue}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Tente capturar novamente com melhor iluminação e enquadramento. Você pode selecionar compensações manualmente.</p>
            </div>
          )}

          {/* Indeterminate Banner */}
          {currentEvidence?.status === 'indeterminate' && !isLoadingAnalysis && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 space-y-1">
              <div className="flex items-center gap-2 text-warning text-sm font-medium">
                <ShieldQuestion className="h-4 w-4 shrink-0" />
                Revisão manual necessária
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-6 list-disc">
                {currentEvidence.indeterminateReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Scores (subtle, for ready/indeterminate) */}
          {currentEvidence && currentEvidence.status !== 'blocked_quality' && !isLoadingAnalysis && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              <span>Qualidade: {Math.round(currentEvidence.qualityScore * 100)}%</span>
              {currentEvidence.biomechanicalScore > 0 && (
                <span>Score: {currentEvidence.biomechanicalScore}</span>
              )}
              {currentEvidence.poseConfidence > 0 && (
                <span>Pose: {Math.round(currentEvidence.poseConfidence * 100)}%</span>
              )}
              {currentEvidence.aiConfidence > 0 && (
                <span>IA: {Math.round(currentEvidence.aiConfidence * 100)}%</span>
              )}
              {currentEvidence.objectiveAgreementScore > 0 && currentEvidence.poseConfidence > 0 && (
                <span>Concordância: {Math.round(currentEvidence.objectiveAgreementScore * 100)}%</span>
              )}
              {/* Temporal metrics */}
              {currentEvidence.captureContext?.frameSampling && (
                <>
                  <span className="flex items-center gap-0.5">
                    <Film className="h-3 w-3" />
                    {currentEvidence.captureContext.frameSampling.frameCountUsed}/{currentEvidence.captureContext.frameSampling.frameCountRequested} frames
                  </span>
                  {currentEvidence.captureContext.frameSampling.stabilityScore > 0 && (
                    <span>Estabilidade: {Math.round(currentEvidence.captureContext.frameSampling.stabilityScore * 100)}%</span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Compensation Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Compensações</Label>
              {currentCompensations.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{currentCompensations.length} selecionadas</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentView.compensations.map((comp) => {
                const isSelected = currentCompensations.includes(comp.id);
                const wasDetectedByAI = currentAiResult?.detected_compensations?.includes(comp.id);
                const wasPredicted = currentEvidence?.predictedCompensations?.includes(comp.id);
                const wasObjective = currentEvidence?.objectiveFindings?.includes(comp.id);

                return (
                  <button
                    key={comp.id}
                    onClick={() => toggleCompensation(comp.id)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                      isSelected
                        ? 'bg-destructive text-destructive-foreground'
                        : wasDetectedByAI || wasObjective || wasPredicted
                          ? 'bg-accent/15 text-accent border border-accent/30'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {isSelected ? (
                      <X className="h-3 w-3" />
                    ) : wasDetectedByAI || wasObjective || wasPredicted ? (
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
        </div>

        {/* View Navigation */}
        {config.views.length > 1 && (
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost" size="sm"
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

        {/* Notes */}
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
