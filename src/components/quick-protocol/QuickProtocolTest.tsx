/**
 * Quick Protocol Test Component
 * Componente genérico para cada teste do Protocolo Rápido
 * Suporta avaliação manual ou análise por IA
 */

import { useState, useEffect } from 'react';
import { Check, AlertTriangle, X, Move, Shield, Zap, User, Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import { triggerHaptic } from '@/lib/haptics';
import { 
  QuickTestDefinition, 
  getLayerLabel 
} from '@/data/quickProtocolMappings';
import type { TestResult, TestId } from '@/lib/quickProtocolEngine';

interface QuickProtocolTestProps {
  test: QuickTestDefinition;
  sessionId: string;
  value?: TestResult;
  onChange: (result: TestResult) => void;
}

type EvaluationMode = 'manual' | 'ai';

// Layer icon component using Lucide icons
function LayerIcon({ layer }: { layer: 'mobility' | 'stability' | 'motor_control' }) {
  const iconClass = "w-3.5 h-3.5";
  switch (layer) {
    case 'mobility':
      return <Move className={iconClass} />;
    case 'stability':
      return <Shield className={iconClass} />;
    case 'motor_control':
      return <Zap className={iconClass} />;
  }
}

export function QuickProtocolTest({ test, sessionId, value, onChange }: QuickProtocolTestProps) {
  const [mode, setMode] = useState<EvaluationMode>('manual');
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    value?.specificFindings || []
  );
  const [hasPain, setHasPain] = useState(value?.hasPain || false);
  
  // Media state
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // AI analysis hook
  const { analyzeMovement, isAnalyzing } = useMovementAnalysis({
    onAnalysisComplete: (result) => {
      setAnalysisResult(result);
      triggerHaptic('success');
      
      // Auto-populate selected options from AI detection
      if (result.detected_options && result.detected_options.length > 0) {
        setSelectedOptions(result.detected_options);
        if (result.pain_indicators) {
          setHasPain(true);
        }
        // Update result immediately
        updateResult(result.detected_options, result.pain_indicators || false);
      }
    },
    onError: () => {
      triggerHaptic('error');
    }
  });

  const handleOptionToggle = (optionId: string) => {
    const newSelected = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    
    setSelectedOptions(newSelected);
    updateResult(newSelected, hasPain);
  };

  const handlePainToggle = (checked: boolean) => {
    setHasPain(checked);
    updateResult(selectedOptions, checked);
  };

  const updateResult = (options: string[], pain: boolean) => {
    // Determine if any positive option is selected
    const hasPositiveOption = options.some(optId => 
      test.options.find(o => o.id === optId)?.isPositive
    );

    const result: TestResult = {
      testId: test.id,
      hasPain: pain,
      isPositive: hasPositiveOption || pain,
      specificFindings: options,
    };

    // For bilateral tests, we can set generic left/right status
    if (test.isBilateral && hasPositiveOption) {
      result.leftSide = 'limited';
      result.rightSide = 'limited';
    }

    onChange(result);
  };

  const handleMediaUpload = (urls: { photoUrl?: string; videoUrl?: string }) => {
    setPhotoUrl(urls.photoUrl);
    setVideoUrl(urls.videoUrl);
  };

  const handleAnalyze = async () => {
    if (!photoUrl && !videoUrl) return;
    
    triggerHaptic('tap');
    
    // Extract frame from video if no photo
    let imageToAnalyze = photoUrl;
    
    if (!imageToAnalyze && videoUrl) {
      // For now, we'll use the video URL directly - the edge function handles frame extraction
      imageToAnalyze = videoUrl;
    }
    
    if (!imageToAnalyze) return;
    
    await analyzeMovement({
      testType: 'quick_protocol',
      testName: test.name,
      testId: test.id,
      options: test.options,
      layer: test.layer,
      isBilateral: test.isBilateral,
      instructions: test.instructions.join('. '),
      imageUrl: imageToAnalyze,
      videoUrl,
    });
  };

  const layerLabel = getLayerLabel(test.layer);

  // Get layer color - using neutral, premium palette
  const layerColorClass = {
    mobility: 'text-foreground/70 bg-muted/50',
    stability: 'text-foreground/70 bg-muted/50',
    motor_control: 'text-foreground/70 bg-muted/50',
  }[test.layer];

  const hasMedia = photoUrl || videoUrl;

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border/50",
              layerColorClass
            )}>
              <LayerIcon layer={test.layer} />
              {layerLabel}
            </span>
          </div>
          <h3 className="text-xl font-semibold">{test.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={mode === 'manual' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('manual')}
          className="gap-2"
        >
          <User className="w-4 h-4" />
          Manual
        </Button>
        <Button
          variant={mode === 'ai' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('ai')}
          className="gap-2"
        >
          <Camera className="w-4 h-4" />
          Por IA
        </Button>
      </div>

      {/* Instructions - Single source, clean collapsible */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-full text-left text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-lg p-3 transition-colors">
              <span className="font-medium text-foreground">Como fazer: </span>
              {test.instructions[0]}
              {test.instructions.length > 1 && (
                <span className="text-muted-foreground/60 ml-1">
                  (toque para ver {test.instructions.length - 1} passos)
                </span>
              )}
            </button>
          </TooltipTrigger>
          {test.instructions.length > 1 && (
            <TooltipContent side="bottom" className="max-w-sm p-4">
              <p className="font-medium mb-2">Instruções completas:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                {test.instructions.map((instruction, i) => (
                  <li key={i} className="text-muted-foreground">
                    {instruction}
                  </li>
                ))}
              </ol>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* AI Mode - Media Upload */}
      {mode === 'ai' && (
        <div className="space-y-4">
          <MediaUploader
            assessmentId={sessionId}
            testName={`qp_${test.id}`}
            initialPhotoUrl={photoUrl}
            initialVideoUrl={videoUrl}
            onUploadComplete={handleMediaUpload}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
          
          {/* AI Analysis Results */}
          {analysisResult && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Resultados da IA</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  analysisResult.confidence >= 0.8 
                    ? "bg-success/10 text-success" 
                    : analysisResult.confidence >= 0.6 
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground"
                )}>
                  {Math.round(analysisResult.confidence * 100)}% confiança
                </span>
              </div>
              
              {analysisResult.notes && (
                <p className="text-sm text-muted-foreground">{analysisResult.notes}</p>
              )}
              
              <p className="text-xs text-muted-foreground">
                Confirme ou ajuste os achados abaixo:
              </p>
            </div>
          )}
        </div>
      )}

      {/* Options Grid - Always visible for confirmation/manual input */}
      <div className="space-y-3">
        <p className="text-sm font-medium">
          {mode === 'ai' && analysisResult 
            ? 'Confirme os achados detectados:' 
            : 'O que você observou?'
          }
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {test.options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const isPositive = option.isPositive;
            const isAiDetected = analysisResult?.detected_options?.includes(option.id);
            
            return (
              <button
                key={option.id}
                onClick={() => handleOptionToggle(option.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  isSelected
                    ? isPositive
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-success/40 bg-success/5"
                    : isAiDetected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                )}
              >
                {/* Status Icon */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isSelected
                    ? isPositive
                      ? "bg-destructive/10 text-destructive"
                      : "bg-success/10 text-success"
                    : isAiDetected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                )}>
                  {isSelected ? (
                    isPositive ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />
                  ) : isAiDetected ? (
                    <Camera className="w-4 h-4" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-current" />
                  )}
                </div>

                {/* Label */}
                <div className="flex flex-col">
                  <span className={cn(
                    "text-sm font-medium",
                    isSelected && "text-foreground"
                  )}>
                    {option.label}
                  </span>
                  {isAiDetected && !isSelected && (
                    <span className="text-xs text-primary">Detectado pela IA</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pain Checkbox */}
      <div className="flex items-center space-x-3 pt-2 border-t">
        <Checkbox
          id={`pain-${test.id}`}
          checked={hasPain}
          onCheckedChange={handlePainToggle}
          className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
        />
        <label
          htmlFor={`pain-${test.id}`}
          className="text-sm font-medium cursor-pointer flex items-center gap-2"
        >
          <span>Dor durante o teste</span>
          {hasPain && <span className="text-destructive text-xs">(Positivo)</span>}
        </label>
      </div>

      {/* Current Status Summary */}
      {(selectedOptions.length > 0 || hasPain) && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          value?.isPositive 
            ? "bg-warning/10 text-warning-foreground border border-warning/20" 
            : "bg-success/10 text-success-foreground border border-success/20"
        )}>
          {value?.isPositive ? (
            <>
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>Teste positivo - possível déficit identificado</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-success" />
              <span>Teste normal - sem alterações significativas</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
