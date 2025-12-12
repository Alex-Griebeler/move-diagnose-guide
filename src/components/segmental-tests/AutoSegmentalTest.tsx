import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Check, X, AlertTriangle, ChevronDown, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MediaUploader } from '@/components/media/MediaUploader';
import { useMovementAnalysis, AnalysisResult } from '@/hooks/useMovementAnalysis';
import { SegmentalTest } from '@/data/segmentalTestMappings';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

function resultToBoolean(result: ResultStatus): boolean | null {
  if (result === 'pass') return true;
  if (result === 'fail') return false;
  if (result === 'partial') return false;
  return null;
}

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
      
      if (test.resultType === 'qualitative') {
        const leftResult = aiResult.left_result || aiResult.result;
        const rightResult = aiResult.right_result || aiResult.result;
        
        onUpdate({
          passFailLeft: resultToBoolean(leftResult as ResultStatus),
          passFailRight: test.isBilateral ? resultToBoolean(rightResult as ResultStatus) : null,
        });
      } else {
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
        cutoffValue: test.cutoffValue,
        unit: test.unit,
        resultType: test.resultType || 'qualitative',
        isBilateral: test.isBilateral,
        instructions: test.instructions,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleValueChange = (side: 'left' | 'right', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const valueKey = side === 'left' ? 'leftValue' : 'rightValue';
    const passKey = side === 'left' ? 'passFailLeft' : 'passFailRight';
    
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

  const StatusButton = ({ 
    status, 
    currentStatus, 
    onClick,
    tooltip,
    icon: Icon,
  }: { 
    status: ResultStatus; 
    currentStatus: ResultStatus;
    onClick: () => void;
    tooltip: string;
    icon: React.ElementType;
  }) => {
    const isSelected = status === currentStatus;
    
    const colorMap = {
      pass: {
        idle: 'bg-success/5 border-success/20 text-success/50',
        hover: 'hover:bg-success/10 hover:border-success/30 hover:text-success/70',
        selected: 'bg-success/15 border-success/40 text-success shadow-sm shadow-success/10',
      },
      partial: {
        idle: 'bg-warning/5 border-warning/20 text-warning/50',
        hover: 'hover:bg-warning/10 hover:border-warning/30 hover:text-warning/70',
        selected: 'bg-warning/15 border-warning/40 text-warning shadow-sm shadow-warning/10',
      },
      fail: {
        idle: 'bg-destructive/5 border-destructive/20 text-destructive/50',
        hover: 'hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive/70',
        selected: 'bg-destructive/15 border-destructive/40 text-destructive shadow-sm shadow-destructive/10',
      },
    };
    
    const colors = colorMap[status as keyof typeof colorMap];

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={cn(
                'h-10 w-10 flex items-center justify-center rounded-lg border transition-all duration-200',
                isSelected ? colors.selected : [colors.idle, colors.hover],
                isSelected && 'scale-105'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isSelected ? 2.5 : 2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs max-w-[180px]">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
              className="pr-16 h-12 text-lg"
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
              {value >= test.cutoffValue ? 'Passa' : 'Falha'}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <StatusButton
          status="pass"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'pass')}
          tooltip="Execução correta, sem compensações"
          icon={Check}
        />
        <StatusButton
          status="partial"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'partial')}
          tooltip="Compensações leves ou inconsistência"
          icon={AlertTriangle}
        />
        <StatusButton
          status="fail"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'fail')}
          tooltip="Compensação significativa"
          icon={X}
        />
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with Instructions Tooltip - Same as Global Tests */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🔬</span>
          <h3 className="text-lg font-medium">{test.name}</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 rounded-full hover:bg-muted/80 transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{test.instructions}</p>
              {test.cutoffValue !== undefined && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Cutoff: ≥{test.cutoffValue} {test.unit}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Current View Content - Card wrapper like Global Tests */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {test.isBilateral ? 'Bilateral' : 'Unilateral'}
              </CardTitle>
              {analysisResult && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {Math.round((analysisResult.confidence || 0) * 100)}% confiança
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{test.description}</p>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 pt-0">
            {/* Media Upload */}
            <MediaUploader
              assessmentId={assessmentId}
              testName={test.id}
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

            {/* AI Analysis Result - Compact like Global Tests */}
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

            {/* Result Inputs */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Resultado</Label>
              {test.isBilateral ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Esquerdo</Label>
                    {renderResultInput('left')}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Direito</Label>
                    {renderResultInput('right')}
                  </div>
                </div>
              ) : (
                <div className="max-w-xs">
                  {renderResultInput('left')}
                </div>
              )}
            </div>

            {/* Asymmetry Warning */}
            {test.isBilateral && 
              result.leftValue !== null && 
              result.rightValue !== null && 
              Math.abs(result.leftValue - result.rightValue) > (test.cutoffValue ? test.cutoffValue * 0.15 : 2) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Assimetria: {Math.abs(result.leftValue - result.rightValue).toFixed(1)} {test.unit}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Textarea
          placeholder="Observações..."
          value={result.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
    </TooltipProvider>
  );
}
