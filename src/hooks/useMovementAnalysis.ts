import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AnalysisResult {
  detected_compensations?: string[];
  confidence: number;
  // Segmental/Quick protocol specific fields
  side?: 'left' | 'right';
  result?: 'pass' | 'partial' | 'fail';
  left_result?: 'pass' | 'partial' | 'fail';
  right_result?: 'pass' | 'partial' | 'fail';
  left_value?: number;
  right_value?: number;
  value?: number;
  notes?: string;
}

interface UseMovementAnalysisOptions {
  onAnalysisComplete?: (result: AnalysisResult) => void;
  onError?: (error: string) => void;
}

// Signed URLs from get-signed-url expire in 10 minutes and captures may be
// older than that, so the image is re-signed right before the AI fetches it.
// Any failure keeps the original URL, as before.
const refreshSignedUrl = async (url: string): Promise<string> => {
  if (!url.includes('token=')) return url;
  const match = url.match(/assessment-media\/([^?]+)/);
  if (!match) return url;
  try {
    const { data, error } = await supabase.functions.invoke('get-signed-url', {
      body: { filePath: decodeURIComponent(match[1]) },
    });
    if (error || !data?.signedUrl) return url;
    return data.signedUrl;
  } catch {
    return url;
  }
};

export function useMovementAnalysis(options: UseMovementAnalysisOptions = {}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);

  const analyzeMovement = async (params: {
    testType: 'overhead_squat' | 'single_leg_squat' | 'pushup' | 'segmental' | 'quick_protocol';
    testName?: string;
    imageUrl: string;
    videoUrl?: string;
    viewType?: string;
    // Segmental test specific parameters
    cutoffValue?: number;
    unit?: string;
    resultType?: 'quantitative' | 'qualitative';
    isBilateral?: boolean;
    instructions?: string;
  }): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    
    try {
      const imageUrl = await refreshSignedUrl(params.imageUrl);
      const { data, error } = await supabase.functions.invoke('analyze-movement', {
        body: { ...params, imageUrl },
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

      // Only show warning for low confidence
      if (result.confidence < 0.6) {
        toast.warning('Baixa confiança - verifique a qualidade da imagem');
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