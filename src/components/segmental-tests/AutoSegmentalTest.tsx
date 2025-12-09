import { useState, useCallback } from 'react';
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertCircle, Camera, ChevronDown, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  
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
    label,
    tooltip,
    icon: Icon,
  }: { 
    status: ResultStatus; 
    currentStatus: ResultStatus;
    onClick: () => void;
    label: string;
    tooltip: string;
    icon: React.ElementType;
  }) => {
    const isSelected = status === currentStatus;
    
    const getStyles = () => {
      if (!isSelected) {
        return 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground';
      }
      switch (status) {
        case 'pass':
          return 'bg-success/10 border-success/30 text-success';
        case 'partial':
          return 'bg-warning/10 border-warning/30 text-warning';
        case 'fail':
          return 'bg-destructive/10 border-destructive/30 text-destructive';
        default:
          return '';
      }
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border transition-all duration-200',
                getStyles()
              )}
            >
              <Icon className={cn("h-6 w-6", isSelected && "scale-110")} strokeWidth={1.5} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-center">
            <p className="text-xs">{tooltip}</p>
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
      <div className="flex gap-3">
        <StatusButton
          status="pass"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'pass')}
          label="Passa"
          tooltip="Movimento executado corretamente, sem compensações visíveis"
          icon={CheckCircle2}
        />
        <StatusButton
          status="partial"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'partial')}
          label="Parcial"
          tooltip="Movimento com pequenas compensações ou execução inconsistente"
          icon={AlertCircle}
        />
        <StatusButton
          status="fail"
          currentStatus={currentStatus}
          onClick={() => handleStatusChange(side, 'fail')}
          label="Falha"
          tooltip="Incapaz de executar ou compensação significativa presente"
          icon={XCircle}
        />
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0 space-y-6">
        {/* Collapsible Instructions */}
        <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={cn("h-4 w-4 transition-transform", instructionsOpen && "rotate-180")} />
              Instruções
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-sm text-muted-foreground mt-2 pl-6">
              {test.instructions}
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Media Upload */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm">
            <Camera className="h-4 w-4" />
            Capturar (opcional)
          </Label>
          <MediaUploader
            assessmentId={assessmentId}
            testName={test.id}
            onUploadComplete={handleMediaUpload}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* AI Analysis Loading */}
        {isAnalyzing && (
          <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analisando...</span>
          </div>
        )}

        {/* AI Result - Simplified */}
        {analysisResult && !isAnalyzing && (
          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">Sugestão da IA</p>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((analysisResult.confidence || 0) * 100)}%
                  </span>
                </div>
                {analysisResult.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {analysisResult.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Result Inputs */}
        <div className="space-y-4">
          {test.isBilateral ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-medium">Esquerdo</Label>
                {renderResultInput('left')}
              </div>
              <div className="space-y-3">
                <Label className="font-medium">Direito</Label>
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
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Assimetria: {Math.abs(result.leftValue - result.rightValue).toFixed(1)} {test.unit}
            </span>
          </div>
        )}

        {/* Notes */}
        <Textarea
          placeholder="Observações..."
          value={result.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
}
