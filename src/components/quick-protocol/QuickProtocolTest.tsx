/**
 * Quick Protocol Test Component
 * UI idêntica aos testes globais (AutoGlobalTest)
 */

import { useState, useCallback } from 'react';
import { Info, Sparkles, X, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { 
  QuickTestDefinition, 
  getLayerLabel 
} from '@/data/quickProtocolMappings';
import type { TestResult } from '@/lib/quickProtocolEngine';

interface QuickProtocolTestProps {
  test: QuickTestDefinition;
  sessionId: string;
  affectedSide?: 'left' | 'right' | 'bilateral';
  value?: TestResult;
  onChange: (result: TestResult) => void;
}

export function QuickProtocolTest({ test, sessionId, affectedSide, value, onChange }: QuickProtocolTestProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    value?.specificFindings || []
  );
  const [hasPain, setHasPain] = useState(value?.hasPain || false);
  const [findingSide, setFindingSide] = useState<'left' | 'right' | 'bilateral' | undefined>(
    value?.findingSide
  );
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const { analyzeMovement, isAnalyzing } = useMovementAnalysis({
    onAnalysisComplete: (result) => {
      setAnalysisResult(result);
      triggerHaptic('success');
      
      // Auto-apply detected options
      if (result.detected_options && result.detected_options.length > 0) {
        const validOptions = result.detected_options.filter(id =>
          test.options.some(o => o.id === id)
        );
        setSelectedOptions(validOptions);
        
        const pain = result.pain_indicators || false;
        setHasPain(pain);
        
        // Determinar lado do achado a partir da resposta da IA
        let detectedSide: 'left' | 'right' | 'bilateral' | undefined;
        const hasLeft = result.left_findings && result.left_findings.length > 0;
        const hasRight = result.right_findings && result.right_findings.length > 0;
        
        if (hasLeft && hasRight) {
          detectedSide = 'bilateral';
        } else if (hasLeft) {
          detectedSide = 'left';
        } else if (hasRight) {
          detectedSide = 'right';
        }
        
        if (detectedSide) {
          setFindingSide(detectedSide);
        }
        
        updateResult(validOptions, pain, detectedSide);
      }
    },
    onError: () => {
      triggerHaptic('error');
    }
  });

  const handleMediaUpload = useCallback((urls: { photoUrl?: string; videoUrl?: string }) => {
    setPhotoUrl(urls.photoUrl);
    setVideoUrl(urls.videoUrl);
  }, []);

  // Extract frame from video when no photo available
  const extractFrameFromVideo = async (videoUrl: string): Promise<string> => {
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

  const handleAnalyze = async () => {
    let imageUrl = photoUrl;
    
    // If no photo but video exists, extract a frame
    if (!imageUrl && videoUrl) {
      try {
        imageUrl = await extractFrameFromVideo(videoUrl);
      } catch (error) {
        console.error('Failed to extract frame from video:', error);
        toast.error('Erro ao extrair frame do vídeo');
        return;
      }
    }
    
    if (!imageUrl) return;
    
    await analyzeMovement({
      testType: 'quick_protocol',
      testName: test.name,
      testId: test.id,
      options: test.options,
      layer: test.layer,
      isBilateral: test.isBilateral,
      instructions: test.instructions.join('. '),
      imageUrl,
      videoUrl,
    });
  };

  const toggleOption = (optionId: string) => {
    const updated = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    
    setSelectedOptions(updated);
    updateResult(updated, hasPain, findingSide);
  };

  const togglePain = () => {
    const newPain = !hasPain;
    setHasPain(newPain);
    updateResult(selectedOptions, newPain, findingSide);
  };

  const handleSideChange = (side: 'left' | 'right' | 'bilateral') => {
    // Toggle off if clicking same side
    const newSide = findingSide === side ? undefined : side;
    setFindingSide(newSide);
    updateResult(selectedOptions, hasPain, newSide);
  };

  const updateResult = (
    options: string[], 
    pain: boolean, 
    side?: 'left' | 'right' | 'bilateral'
  ) => {
    const hasPositiveOption = options.some(optId => 
      test.options.find(o => o.id === optId)?.isPositive
    );

    // Use affectedSide as fallback if no side selected for bilateral tests
    const effectiveSide = side || (test.isBilateral && hasPositiveOption ? affectedSide : undefined);

    const result: TestResult = {
      testId: test.id,
      hasPain: pain,
      isPositive: hasPositiveOption || pain,
      specificFindings: options,
      findingSide: effectiveSide,
    };

    // Para testes bilaterais, mapear achados por lado
    if (test.isBilateral && hasPositiveOption && side) {
      if (side === 'left' || side === 'bilateral') {
        result.leftSide = 'limited';
        result.leftFindings = options;
      }
      if (side === 'right' || side === 'bilateral') {
        result.rightSide = 'limited';
        result.rightFindings = options;
      }
    }

    onChange(result);
  };

  const layerLabel = getLayerLabel(test.layer);
  const hasMedia = photoUrl || videoUrl;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with Instructions Tooltip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{test.name}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-full hover:bg-muted/80 transition-colors">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium mb-1">Instruções:</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  {test.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="outline" className="text-[10px] h-5">
            {layerLabel}
          </Badge>
        </div>

        {/* Test Content Card */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{test.description}</CardTitle>
              {analysisResult && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {Math.round((analysisResult.confidence || 0) * 100)}% confiança
                </Badge>
              )}
            </div>
            {test.isBilateral && (
              <p className="text-xs text-muted-foreground">Teste bilateral - compare ambos os lados</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {/* Media Upload with Analyze Button */}
            <MediaUploader
              assessmentId={sessionId}
              testName={`qp_${test.id}`}
              initialPhotoUrl={photoUrl}
              initialVideoUrl={videoUrl}
              onUploadComplete={handleMediaUpload}
              onAnalyze={handleAnalyze}
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
            {analysisResult && !isAnalyzing && analysisResult.notes && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    {analysisResult.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Option Chips - Same style as compensation chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Observações
                </Label>
                {selectedOptions.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {selectedOptions.length} selecionadas
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {test.options.map((option) => {
                  const isSelected = selectedOptions.includes(option.id);
                  const wasDetectedByAI = analysisResult?.detected_options?.includes(option.id);
                  const isPositive = option.isPositive;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                        isSelected
                          ? isPositive
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-success text-success-foreground'
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
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bilateral Side Selector - Only for bilateral tests with findings */}
            {test.isBilateral && selectedOptions.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="mb-2">
                  <Label className="text-xs text-muted-foreground block">
                    Em qual lado você observou o achado?
                  </Label>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    (pode ser diferente do lado da dor)
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(['left', 'right', 'bilateral'] as const).map((side) => {
                    const isSelected = findingSide === side;
                    const aiDetectedLeft = analysisResult?.left_findings && analysisResult.left_findings.length > 0;
                    const aiDetectedRight = analysisResult?.right_findings && analysisResult.right_findings.length > 0;
                    const wasDetectedByAI = 
                      (side === 'left' && aiDetectedLeft && !aiDetectedRight) ||
                      (side === 'right' && aiDetectedRight && !aiDetectedLeft) ||
                      (side === 'bilateral' && aiDetectedLeft && aiDetectedRight);
                    
                    const labels = { left: 'Esquerdo', right: 'Direito', bilateral: 'Bilateral' };
                    
                    return (
                      <button
                        key={side}
                        onClick={() => handleSideChange(side)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : wasDetectedByAI
                              ? 'bg-accent/15 text-accent border border-accent/30'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {wasDetectedByAI && !isSelected && (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {labels[side]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pain Chip - Same style */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-xs text-muted-foreground mb-2 block">Dor</Label>
              <button
                onClick={togglePain}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                  hasPain
                    ? 'bg-destructive text-destructive-foreground'
                    : analysisResult?.pain_indicators
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                )}
              >
                {hasPain ? (
                  <X className="h-3 w-3" />
                ) : analysisResult?.pain_indicators ? (
                  <Sparkles className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Dor durante o teste
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Result Summary */}
        {(selectedOptions.length > 0 || hasPain) && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-sm",
            value?.isPositive 
              ? "bg-warning/10 text-warning-foreground border border-warning/20" 
              : "bg-success/10 text-success-foreground border border-success/20"
          )}>
            {value?.isPositive ? (
              <span className="text-xs">⚠️ Teste positivo - possível déficit identificado</span>
            ) : (
              <span className="text-xs">✓ Teste normal - sem alterações significativas</span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
