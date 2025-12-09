import { SegmentalTest } from '@/data/segmentalTestMappings';
import { Check, X, AlertTriangle, Minus } from 'lucide-react';
import { SuggestedTestWithPriority } from '@/lib/testPrioritization';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
}

interface SegmentalTestsSummaryProps {
  results: Record<string, TestResult>;
  tests: SegmentalTest[];
  groupedTests: Record<string, SegmentalTest[]>;
  prioritizedTests?: SuggestedTestWithPriority[];
}

export function SegmentalTestsSummary({ 
  results, 
  tests, 
  groupedTests,
  prioritizedTests,
}: SegmentalTestsSummaryProps) {
  const getResultStatus = (result: TestResult, test: SegmentalTest): 'pass' | 'fail' | 'partial' | 'unknown' => {
    if (test.isBilateral) {
      if (result.passFailLeft === null && result.passFailRight === null) return 'unknown';
      if (result.passFailLeft === true && result.passFailRight === true) return 'pass';
      if (result.passFailLeft === false && result.passFailRight === false) return 'fail';
      if ((result.passFailLeft === true && result.passFailRight === false) || 
          (result.passFailLeft === false && result.passFailRight === true)) return 'partial';
      return 'unknown';
    } else {
      if (result.passFailLeft === null) return 'unknown';
      return result.passFailLeft ? 'pass' : 'fail';
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'partial' | 'unknown') => {
    switch (status) {
      case 'pass':
        return <Check className="w-4 h-4 text-success" />;
      case 'fail':
        return <X className="w-4 h-4 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Calculate summary statistics
  const stats = tests.reduce(
    (acc, test) => {
      const result = results[test.id];
      const status = getResultStatus(result, test);
      acc[status]++;
      return acc;
    },
    { pass: 0, fail: 0, partial: 0, unknown: 0 }
  );

  // Use prioritized order if available, otherwise fall back to region grouping
  const hasPriorityData = prioritizedTests && prioritizedTests.length > 0;

  // Helper to format values
  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return null;
    return `${value}${unit ? unit : ''}`;
  };

  // Helper to check if result has any values
  const hasValues = (result: TestResult, test: SegmentalTest) => {
    if (test.isBilateral) {
      return result.leftValue !== null || result.rightValue !== null;
    }
    return result.leftValue !== null;
  };

  // Render test list based on source (prioritized or grouped)
  const renderTestList = (testsToRender: SegmentalTest[]) => (
    <div className="divide-y divide-border/50">
      {testsToRender.map(test => {
        const result = results[test.id];
        const status = getResultStatus(result, test);

        return (
          <div
            key={test.id}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(status)}
              <span className="text-sm">{test.name}</span>
            </div>
            
            {hasValues(result, test) && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {test.isBilateral ? (
                  <>
                    E: {formatValue(result.leftValue, test.unit) ?? '—'} | D: {formatValue(result.rightValue, test.unit) ?? '—'}
                  </>
                ) : (
                  formatValue(result.leftValue, test.unit)
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stats - Compact inline pills */}
        <div className="flex items-center gap-6 text-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 text-success cursor-default">
                <Check className="w-4 h-4" />
                <span className="font-medium">{stats.pass}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Adequados</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 text-destructive cursor-default">
                <X className="w-4 h-4" />
                <span className="font-medium">{stats.fail}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Déficits</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 text-warning cursor-default">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">{stats.partial}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Assimétricos</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 text-muted-foreground cursor-default">
                <Minus className="w-4 h-4" />
                <span className="font-medium">{stats.unknown}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Não avaliados</TooltipContent>
          </Tooltip>
        </div>

        {/* Test list - minimal */}
        <div className="bg-muted/30 rounded-lg p-4">
          {hasPriorityData ? (
            renderTestList(prioritizedTests.map(pt => pt.test))
          ) : (
            Object.entries(groupedTests).map(([region, regionTests]) => (
              <div key={region} className="mb-4 last:mb-0">
                <p className="text-xs text-muted-foreground mb-2">{region}</p>
                {renderTestList(regionTests)}
              </div>
            ))
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
