/**
 * Quick Protocol Movement Capture
 * Captura 3 vídeos do exercício problemático para análise de IA
 */

import { useState } from 'react';
import { Video, Camera, Check, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import type { KneeRelevantCompensation } from '@/lib/kneeCompensationMappings';

interface VideoView {
  id: 'anterior' | 'lateral' | 'posterior';
  label: string;
  description: string;
}

const VIDEO_VIEWS: VideoView[] = [
  { id: 'anterior', label: 'Vista Frontal', description: 'Grave de frente para o aluno' },
  { id: 'lateral', label: 'Vista Lateral', description: 'Grave do lado (perfil)' },
  { id: 'posterior', label: 'Vista Posterior', description: 'Grave por trás do aluno' },
];

interface CapturedMedia {
  viewId: string;
  photoUrl?: string;
  videoUrl?: string;
}

interface MovementAnalysisOutput {
  compensations: KneeRelevantCompensation[];
  confidence: number;
  notes: string;
  viewResults: Record<string, AnalysisResult>;
}

interface QuickProtocolMovementCaptureProps {
  assessmentId: string;
  exerciseName?: string;
  affectedSide: 'left' | 'right' | 'bilateral';
  onAnalysisComplete: (result: MovementAnalysisOutput) => void;
  onSkip: () => void;
}

export function QuickProtocolMovementCapture({
  assessmentId,
  exerciseName = 'Agachamento',
  onAnalysisComplete,
  onSkip,
}: QuickProtocolMovementCaptureProps) {
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const { analyzeMovement } = useMovementAnalysis();

  const currentView = VIDEO_VIEWS[currentViewIndex];
  const capturedCount = capturedMedia.filter(m => m.photoUrl || m.videoUrl).length;
  const allCaptured = capturedCount === VIDEO_VIEWS.length;

  const handleMediaCapture = (viewId: string, urls: { photoUrl?: string; videoUrl?: string }) => {
    setCapturedMedia(prev => {
      const existing = prev.filter(m => m.viewId !== viewId);
      return [...existing, { viewId, ...urls }];
    });
    if (currentViewIndex < VIDEO_VIEWS.length - 1 && (urls.photoUrl || urls.videoUrl)) {
      setTimeout(() => setCurrentViewIndex(currentViewIndex + 1), 500);
    }
  };

  const getMediaForView = (viewId: string) => capturedMedia.find(m => m.viewId === viewId);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const viewResults: Record<string, AnalysisResult> = {};
      const allCompensations: string[] = [];

      for (let i = 0; i < VIDEO_VIEWS.length; i++) {
        const view = VIDEO_VIEWS[i];
        const media = getMediaForView(view.id);
        
        if (media?.photoUrl || media?.videoUrl) {
          setAnalysisProgress(((i + 1) / VIDEO_VIEWS.length) * 100);
          const result = await analyzeMovement({
            testType: 'overhead_squat',
            imageUrl: media.photoUrl || media.videoUrl || '',
            videoUrl: media.videoUrl,
            viewType: view.id,
          });

          if (result) {
            viewResults[view.id] = result;
            if (result.detected_compensations) {
              allCompensations.push(...result.detected_compensations);
            }
          }
        }
      }

      const kneeRelevantIds: KneeRelevantCompensation[] = [
        'knee_valgus', 'knee_varus', 'feet_eversion', 'foot_collapse',
        'heels_rise', 'hip_drop', 'trunk_forward_lean', 'instability'
      ];

      const filteredCompensations = [...new Set(allCompensations)]
        .filter(c => kneeRelevantIds.includes(c as KneeRelevantCompensation)) as KneeRelevantCompensation[];

      const confidences = Object.values(viewResults).map(r => r.confidence).filter(c => c > 0);
      const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.7;

      onAnalysisComplete({
        compensations: filteredCompensations,
        confidence: avgConfidence,
        notes: `Análise de ${exerciseName} - ${capturedCount} vistas`,
        viewResults,
      });
    } catch (error) {
      console.error('Erro na análise:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Captura do Movimento</h2>
        <p className="text-muted-foreground">Grave o <strong>{exerciseName}</strong> em 3 ângulos</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        {VIDEO_VIEWS.map((view, index) => {
          const media = getMediaForView(view.id);
          const hasCaptured = !!media?.photoUrl || !!media?.videoUrl;
          return (
            <button
              key={view.id}
              onClick={() => setCurrentViewIndex(index)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                hasCaptured ? "bg-success text-success-foreground" : index === currentViewIndex ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {hasCaptured ? <Check className="w-5 h-5" /> : <span className="text-sm font-medium">{index + 1}</span>}
            </button>
          );
        })}
      </div>

      {!isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-lg">{currentView.label}</h3>
              <p className="text-sm text-muted-foreground">{currentView.description}</p>
            </div>
            <MediaUploader
              assessmentId={assessmentId}
              testName={`quick_protocol_knee_${currentView.id}`}
              viewType={currentView.id}
              initialPhotoUrl={getMediaForView(currentView.id)?.photoUrl}
              initialVideoUrl={getMediaForView(currentView.id)?.videoUrl}
              onUploadComplete={(urls) => handleMediaCapture(currentView.id, urls)}
            />
          </CardContent>
        </Card>
      )}

      {isAnalyzing && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Analisando movimento...</h3>
            <Progress value={analysisProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onSkip} className="flex-1" disabled={isAnalyzing}>
          Pular para testes manuais
        </Button>
        {allCaptured && !isAnalyzing && (
          <Button onClick={handleAnalyze} className="flex-1">
            Analisar <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
