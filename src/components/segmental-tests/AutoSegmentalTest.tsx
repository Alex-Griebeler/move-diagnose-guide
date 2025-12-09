import { useState, useCallback } from 'react';
import { Info, Sparkles, Loader2, CheckCircle2, XCircle, AlertCircle, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import { SegmentalTest } from '@/data/segmentalTestMappings';
import { cn } from '@/lib/utils';

type ResultStatus = 'pass' | 'partial' | 'fail' | null;

interface TestResult {
  testId: string;
  testName: string;
  bodyRegion: string;
  leftValue: number | null;
  rightValue: number | null;
  passFailLeft: boolean | null;
  passFailRight: boolean | null;
  notes: string;
  unit: string;
  cutoffValue?: number;
  mediaUrls?: { photoUrl?: string; videoUrl?: string };
}

interface AutoSegmentalTestProps {
  test: SegmentalTest;
  assessmentId: string;
  result: TestResult;
  onUpdate: (result: Partial<TestResult>) => void;
}

// Helper to convert analysis result to pass/fail
function resultToBoolean(result: ResultStatus): boolean | null {
  if (result === 'pass') return true;
  if (result === 'fail') return false;
  if (result === 'partial') return false; // Partial counts as fail for now
  return null;
}

// Helper to convert pass/fail to status
function booleanToResult(value: boolean | null): ResultStatus {
  if (value === true) return 'pass';
  if (value === false) return 'fail';
  return null;
}

export function AutoSegmentalTest({ test, assessmentId, result, onUpdate }: AutoSegmentalTestProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [mediaUrls, setMediaUrls] = useState<{ photoUrl?: string; videoUrl?: string }>({});
  
  const { analyzeMovement } = useMovementAnalysis({
    onAnalysisComplete: (aiResult) => {
      setAnalysisResult(aiResult);
      
      // Auto-apply AI results
      if (test.resultType === 'qualitative') {
        const leftResult = aiResult.left_result || aiResult.result;
        const rightResult = aiResult.right_result || aiResult.result;
        
        onUpdate({
          passFailLeft: resultToBoolean(leftResult as ResultStatus),
          passFailRight: test.isBilateral ? resultToBoolean(rightResult as ResultStatus) : null,
        });
      } else {
        // Quantitative results
        if (aiResult.left_value !== undefined) {
          onUpdate({
            leftValue: aiResult.left_value,
            passFailLeft: test.cutoffValue !== undefined ? aiResult.left_value >= test.cutoffValue : null,
          });
        }
        if (aiResult.right_value !== undefined && test.isBilateral) {
          onUpdate({
            rightValue: aiResult.right_value,
            passFailRight: test.cutoffValue !== undefined ? aiResult.right_value >= test.cutoffValue : null,
          });
        }
      }
    },
  });

  const handleMediaUpload = useCallback((urls: { photoUrl?: string; videoUrl?: string }) => {
    setMediaUrls(urls);
    onUpdate({ mediaUrls: urls });
  }, [onUpdate]);

  const handleAnalyze = async () => {
    if (!mediaUrls.photoUrl) return;
    
    setIsAnalyzing(true);
    try {
      await analyzeMovement({
        testType: 'segmental',
        testName: test.name,
        imageUrl: mediaUrls.photoUrl,
        videoUrl: mediaUrls.videoUrl,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleValueChange = (side: 'left' | 'right', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const valueKey = side === 'left' ? 'leftValue' : 'rightValue';
    const passKey = side === 'left' ? 'passFailLeft' : 'passFailRight';
    
    // Auto-calculate pass/fail if cutoff exists
    let passFail: boolean | null = null;
    if (numValue !== null && test.cutoffValue !== undefined) {
      passFail = numValue >= test.cutoffValue;
    }

    onUpdate({
      [valueKey]: numValue,
      [passKey]: passFail,
    });
  };

  const handleStatusChange = (side: 'left' | 'right', status: ResultStatus) => {
    const passKey = side === 'left' ? 'passFailLeft' : 'passFailRight';
    onUpdate({ [passKey]: resultToBoolean(status) });
  };

  const isNumericTest = test.resultType === 'quantitative';
  const hasMedia = mediaUrls.photoUrl || mediaUrls.videoUrl;

  const StatusButton = ({ 
    status, 
    currentStatus, 
    onClick,
    label,
    icon: Icon,
    color 
  }: { 
    status: ResultStatus; 
    currentStatus: ResultStatus;
    onClick: () => void;
    label: string;
    icon: React.ElementType;
    color: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all',
        status === currentStatus
          ? `${color} border-current`
          : 'border-muted text-muted-foreground hover:border-muted-foreground/50'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  const renderResultInput = (side: 'left' | 'right') => {
    const value = side === 'left' ? result.leftValue : result.rightValue;
    const passFail = side === 'left' ? result.passFailLeft : result.passFailRight;
    const currentStatus = booleanToResult(passFail);

    if (isNumericTest) {
      return (
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="number"
              step="0.1"
              placeholder="0"
              value={value ?? ''}
              onChange={(e) => handleValueChange(side, e.target.value)}
              className="pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {test.unit}
            </span>
          </div>
          {test.cutoffValue !== undefined && value !== null && (
            <div className={cn(
              'flex items-center gap-2 text-sm',
              value >= test.cutoffValue ? 'text-success' : 'text-destructive'
            )}>
              {value >= test.cutoffValue ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {value >= test.cutoffValue ? 'Passa' : 'Falha'} (corte: {test.cutoffValue})
            </div>
          )}
        </div>
      );
    }

    // Qualitative test - show Pass/Partial/Fail buttons
    return (
      <div className="flex gap-2">
        <StatusButton
          status="pass"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'pass')}
          label="Passa"
          icon={CheckCircle2}
          color="text-success"
        />
        <StatusButton
          status="partial"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'partial')}
          label="Parcial"
          icon={AlertCircle}
          color="text-warning"
        />
        <StatusButton
          status="fail"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'fail')}
          label="Falha"
          icon={XCircle}
          color="text-destructive"
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{test.bodyRegion}</Badge>
              {test.isBilateral && <Badge variant="secondary">Bilateral</Badge>}
              {test.resultType === 'qualitative' && (
                <Badge variant="secondary" className="bg-accent/20 text-accent">Qualitativo</Badge>
              )}
            </div>
            <CardTitle className="text-lg">{test.name}</CardTitle>
            <CardDescription className="mt-1">{test.description}</CardDescription>
          </div>
          {test.cutoffValue !== undefined && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Valor de corte</p>
              <p className="font-semibold">{test.cutoffValue} {test.unit}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">Instruções</p>
              <p className="text-sm text-muted-foreground">{test.instructions}</p>
            </div>
          </div>
        </div>

        {/* Media Upload for AI Analysis */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Captura para Análise por IA (opcional)
          </Label>
          <MediaUploader
            assessmentId={assessmentId}
            testName={test.id}
            onUploadComplete={handleMediaUpload}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* AI Analysis Result */}
        {isAnalyzing && (
          <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analisando com IA...</span>
          </div>
        )}

        {analysisResult && !isAnalyzing && (
          <Card className="border-accent/50 bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Sugestão da IA</p>
                  <p className="text-xs text-muted-foreground">
                    Confiança: {Math.round((analysisResult.confidence || 0) * 100)}%
                  </p>
                </div>
              </div>
              {analysisResult.notes && (
                <p className="text-sm text-muted-foreground italic">
                  "{analysisResult.notes}"
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Result Inputs */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Resultado do Teste</Label>
          
          {test.isBilateral ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Lado Esquerdo</Label>
                  {result.passFailLeft !== null && (
                    result.passFailLeft ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )
                  )}
                </div>
                {renderResultInput('left')}
              </div>

              {/* Right Side */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Lado Direito</Label>
                  {result.passFailRight !== null && (
                    result.passFailRight ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )
                  )}
                </div>
                {renderResultInput('right')}
              </div>
            </div>
          ) : (
            <div className="max-w-md">
              {renderResultInput('left')}
            </div>
          )}
        </div>

        {/* Asymmetry Warning */}
        {test.isBilateral && 
          result.leftValue !== null && 
          result.rightValue !== null && 
          Math.abs(result.leftValue - result.rightValue) > (test.cutoffValue ? test.cutoffValue * 0.15 : 2) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm">
              Assimetria detectada: diferença de {Math.abs(result.leftValue - result.rightValue).toFixed(1)} {test.unit}
            </span>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            placeholder="Anotações adicionais sobre o teste..."
            value={result.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}