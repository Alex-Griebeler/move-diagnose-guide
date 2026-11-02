import { useCallback } from 'react';
import { Check, X, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MediaUploader } from '@/components/media/MediaUploader';
import { SegmentalTest, passesCutoff, cutoffLabel } from '@/data/segmentalTestMappings';
import { cn } from '@/lib/utils';
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

// Passo 0: no AI here. The professional types the value or picks the result; photo and video stay as a record.
export function AutoSegmentalTest({ test, assessmentId, result, onUpdate }: AutoSegmentalTestProps) {
  // The cutoff the row is saved with (catalog for a new result, the row's for a saved one); direction from the test
  const cutoff = result.cutoffValue;

  const handleMediaUpload = useCallback((urls: { photoUrl?: string; videoUrl?: string }) => {
    onUpdate({ mediaUrls: urls });
  }, [onUpdate]);

  const handleValueChange = (side: 'left' | 'right', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const valueKey = side === 'left' ? 'leftValue' : 'rightValue';
    const passKey = side === 'left' ? 'passFailLeft' : 'passFailRight';

    onUpdate({
      [valueKey]: numValue,
      [passKey]: passesCutoff(numValue, cutoff, test.passWhen),
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
    
    const selectedColors = {
      pass: 'bg-success/10 border-success/30 text-success ring-1 ring-success/20',
      partial: 'bg-warning/10 border-warning/30 text-warning ring-1 ring-warning/20',
      fail: 'bg-destructive/10 border-destructive/30 text-destructive ring-1 ring-destructive/20',
    };
    
    const selectedColor = selectedColors[status as keyof typeof selectedColors];

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={cn(
                'h-10 w-10 flex items-center justify-center rounded-lg border transition-all duration-200',
                isSelected 
                  ? [selectedColor, 'scale-105'] 
                  : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 hover:border-border hover:text-foreground/70'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isSelected ? 2.5 : 1.5} />
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
          {passesCutoff(value, cutoff, test.passWhen) !== null && (
            <div className={cn(
              'flex items-center gap-2 text-sm',
              passesCutoff(value, cutoff, test.passWhen) ? 'text-success' : 'text-destructive'
            )}>
              {passesCutoff(value, cutoff, test.passWhen) ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {passesCutoff(value, cutoff, test.passWhen) ? 'Passa' : 'Falha'}
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
        {/* Header with test name and instructions tooltip */}
        <div className="flex items-center justify-between">
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
                {cutoff !== undefined && cutoff !== null && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    Cutoff: {cutoffLabel(cutoff, test.unit, test.passWhen)}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground">{test.description}</p>

        {/* Media Upload - flat, embedded */}
        <MediaUploader
          assessmentId={assessmentId}
          testName={test.id}
          initialPhotoUrl={result?.mediaUrls?.photoUrl}
          initialVideoUrl={result?.mediaUrls?.videoUrl}
          onUploadComplete={handleMediaUpload}
          embedded
        />

        {/* Result Inputs */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">
            Resultado ({test.isBilateral ? 'Bilateral' : 'Unilateral'})
          </Label>
          {test.isBilateral ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-xs text-muted-foreground font-normal tracking-wide uppercase">E</Label>
                {renderResultInput('left')}
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs text-muted-foreground font-normal tracking-wide uppercase">D</Label>
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
