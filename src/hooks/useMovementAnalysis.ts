import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AnalysisResult {
  detected_compensations?: string[];
  side?: 'left' | 'right';
  result?: 'pass' | 'partial' | 'fail';
  left_result?: 'pass' | 'partial' | 'fail';
  right_result?: 'pass' | 'partial' | 'fail';
  left_value?: number;
  right_value?: number;
  confidence: number;
  notes?: string;
}

interface UseMovementAnalysisOptions {
  onAnalysisComplete?: (result: AnalysisResult) => void;
  onError?: (error: string) => void;
}

export function useMovementAnalysis(options: UseMovementAnalysisOptions = {}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);

  const analyzeMovement = async (params: {
    testType: 'overhead_squat' | 'single_leg_squat' | 'pushup' | 'segmental';
    testName?: string;
    imageUrl: string;
    videoUrl?: string;
    viewType?: string;
  }): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-movement', {
        body: params,
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      const result = data.analysis as AnalysisResult;
      setLastResult(result);
      
      if (options.onAnalysisComplete) {
        options.onAnalysisComplete(result);
      }

      // Show confidence feedback
      if (result.confidence >= 0.8) {
        toast.success('Análise concluída com alta confiança');
      } else if (result.confidence >= 0.6) {
        toast.info('Análise concluída - recomenda-se revisar os resultados');
      } else {
        toast.warning('Baixa confiança na análise - verifique a qualidade da imagem');
      }

      return result;
    } catch (error) {
      console.error('Movement analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao analisar movimento';
      
      toast.error(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeMovement,
    isAnalyzing,
    lastResult,
  };
}