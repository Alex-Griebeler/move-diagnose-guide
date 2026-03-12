import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RotateCcw, Save, Settings2, Database, HardDrive, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  getClinicalThresholds,
  getDefaultClinicalThresholds,
  saveClinicalThresholdOverrides,
  resetClinicalThresholdOverrides,
  getThresholdSource,
  refreshClinicalThresholdsFromBackend,
  SAFETY_BOUNDS,
  type ClinicalThresholdsConfig,
} from '@/lib/clinical/clinicalThresholds';

interface ThresholdCalibrationPanelProps {
  onSaved?: () => void;
}

const SOURCE_LABELS: Record<string, { label: string; icon: typeof Database }> = {
  backend: { label: 'Backend', icon: Database },
  localStorage: { label: 'Local', icon: HardDrive },
  defaults: { label: 'Padrão', icon: FileText },
};

export function ThresholdCalibrationPanel({ onSaved }: ThresholdCalibrationPanelProps) {
  const [config, setConfig] = useState<ClinicalThresholdsConfig>(getClinicalThresholds);
  const [source, setSource] = useState(getThresholdSource);
  const defaults = getDefaultClinicalThresholds();

  useEffect(() => {
    refreshClinicalThresholdsFromBackend().then(() => {
      setConfig(getClinicalThresholds());
      setSource(getThresholdSource());
    });
  }, []);

  const updateMediaQuality = useCallback((key: string, value: number) => {
    setConfig(prev => ({ ...prev, mediaQuality: { ...prev.mediaQuality, [key]: value } }));
  }, []);

  const updateConfidence = useCallback((key: string, value: number) => {
    setConfig(prev => ({ ...prev, confidence: { ...prev.confidence, [key]: value } }));
  }, []);

  const updateScoreWeights = useCallback((key: string, value: number) => {
    setConfig(prev => ({ ...prev, scoreWeights: { ...prev.scoreWeights, [key]: value } }));
  }, []);

  const updateTemporalAnalysis = useCallback((key: string, value: number) => {
    setConfig(prev => ({ ...prev, temporalAnalysis: { ...prev.temporalAnalysis, [key]: value } }));
  }, []);

  const isOutOfBounds = (key: string, value: number): boolean => {
    const bounds = SAFETY_BOUNDS[key];
    if (!bounds) return false;
    return value < bounds[0] || value > bounds[1];
  };

  const hasAnyOutOfBounds = (): boolean => {
    const checks = [
      ...Object.entries(config.mediaQuality).filter(([, v]) => typeof v === 'number').map(([k, v]) => isOutOfBounds(k, v as number)),
      ...Object.entries(config.confidence).map(([k, v]) => isOutOfBounds(k, v)),
      ...Object.entries(config.scoreWeights).map(([k, v]) => isOutOfBounds(k, v)),
      ...Object.entries(config.temporalAnalysis).map(([k, v]) => isOutOfBounds(k, v)),
    ];
    return checks.some(Boolean);
  };

  const handleSave = () => {
    if (hasAnyOutOfBounds()) {
      toast.error('Valores fora dos limites de segurança');
      return;
    }
    saveClinicalThresholdOverrides({
      mediaQuality: config.mediaQuality,
      confidence: config.confidence,
      scoreWeights: config.scoreWeights,
      temporalAnalysis: config.temporalAnalysis,
    });
    setSource(getThresholdSource());
    toast.success('Thresholds salvos');
    onSaved?.();
  };

  const handleReset = () => {
    resetClinicalThresholdOverrides();
    setConfig(getDefaultClinicalThresholds());
    setSource(getThresholdSource());
    toast.success('Thresholds restaurados para padrão');
    onSaved?.();
  };

  const isModified = (key: string, section: keyof ClinicalThresholdsConfig) => {
    const current = (config[section] as any)?.[key];
    const def = (defaults[section] as any)?.[key];
    return current !== def;
  };

  const sourceInfo = SOURCE_LABELS[source] || SOURCE_LABELS.defaults;
  const SourceIcon = sourceInfo.icon;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          Calibração de Thresholds
        </CardTitle>
        <CardDescription className="text-xs flex items-center justify-between">
          <span>Versão: {config.evidenceVersion}</span>
          <span className="flex items-center gap-1">
            <SourceIcon className="w-3 h-3" />
            Fonte: {sourceInfo.label}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" className="w-full">
          {/* Media Quality */}
          <AccordionItem value="media" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
              Qualidade de Mídia
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3">
                <ThresholdField label="Brilho mín." fieldKey="minBrightness" value={config.mediaQuality.minBrightness} defaultValue={defaults.mediaQuality.minBrightness} onChange={v => updateMediaQuality('minBrightness', v)} modified={isModified('minBrightness', 'mediaQuality')} />
                <ThresholdField label="Brilho máx." fieldKey="maxBrightness" value={config.mediaQuality.maxBrightness} defaultValue={defaults.mediaQuality.maxBrightness} onChange={v => updateMediaQuality('maxBrightness', v)} modified={isModified('maxBrightness', 'mediaQuality')} />
                <ThresholdField label="Contraste mín." fieldKey="minContrast" value={config.mediaQuality.minContrast} defaultValue={defaults.mediaQuality.minContrast} onChange={v => updateMediaQuality('minContrast', v)} modified={isModified('minContrast', 'mediaQuality')} />
                <ThresholdField label="Nitidez mín." fieldKey="minSharpness" value={config.mediaQuality.minSharpness} defaultValue={defaults.mediaQuality.minSharpness} onChange={v => updateMediaQuality('minSharpness', v)} modified={isModified('minSharpness', 'mediaQuality')} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Confidence */}
          <AccordionItem value="confidence" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
              Confiança & Concordância
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3">
                <ThresholdField label="Confiança IA mín." fieldKey="minAiConfidence" value={config.confidence.minAiConfidence} defaultValue={defaults.confidence.minAiConfidence} onChange={v => updateConfidence('minAiConfidence', v)} modified={isModified('minAiConfidence', 'confidence')} step={0.05} />
                <ThresholdField label="Confiança Pose mín." fieldKey="minPoseConfidence" value={config.confidence.minPoseConfidence} defaultValue={defaults.confidence.minPoseConfidence} onChange={v => updateConfidence('minPoseConfidence', v)} modified={isModified('minPoseConfidence', 'confidence')} step={0.05} />
                <ThresholdField label="Concordância mín." fieldKey="minAgreementScore" value={config.confidence.minAgreementScore} defaultValue={defaults.confidence.minAgreementScore} onChange={v => updateConfidence('minAgreementScore', v)} modified={isModified('minAgreementScore', 'confidence')} step={0.05} />
                <ThresholdField label="Auto-apply threshold" fieldKey="autoApplyThreshold" value={config.confidence.autoApplyThreshold} defaultValue={defaults.confidence.autoApplyThreshold} onChange={v => updateConfidence('autoApplyThreshold', v)} modified={isModified('autoApplyThreshold', 'confidence')} step={0.05} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Score Weights */}
          <AccordionItem value="weights" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
              Pesos de Qualidade
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3">
                <ThresholdField label="Brilho" fieldKey="brightness" value={config.scoreWeights.brightness} defaultValue={defaults.scoreWeights.brightness} onChange={v => updateScoreWeights('brightness', v)} modified={isModified('brightness', 'scoreWeights')} step={0.05} />
                <ThresholdField label="Contraste" fieldKey="contrast" value={config.scoreWeights.contrast} defaultValue={defaults.scoreWeights.contrast} onChange={v => updateScoreWeights('contrast', v)} modified={isModified('contrast', 'scoreWeights')} step={0.05} />
                <ThresholdField label="Nitidez" fieldKey="sharpness" value={config.scoreWeights.sharpness} defaultValue={defaults.scoreWeights.sharpness} onChange={v => updateScoreWeights('sharpness', v)} modified={isModified('sharpness', 'scoreWeights')} step={0.05} />
                <ThresholdField label="Resolução" fieldKey="resolution" value={config.scoreWeights.resolution} defaultValue={defaults.scoreWeights.resolution} onChange={v => updateScoreWeights('resolution', v)} modified={isModified('resolution', 'scoreWeights')} step={0.05} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Temporal Analysis */}
          <AccordionItem value="temporal" className="border-none">
            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
              Análise Temporal
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3">
                <ThresholdField label="Frames padrão" fieldKey="defaultFrameCount" value={config.temporalAnalysis.defaultFrameCount} defaultValue={defaults.temporalAnalysis.defaultFrameCount} onChange={v => updateTemporalAnalysis('defaultFrameCount', v)} modified={isModified('defaultFrameCount', 'temporalAnalysis')} />
                <ThresholdField label="Frames máx." fieldKey="maxFrameCount" value={config.temporalAnalysis.maxFrameCount} defaultValue={defaults.temporalAnalysis.maxFrameCount} onChange={v => updateTemporalAnalysis('maxFrameCount', v)} modified={isModified('maxFrameCount', 'temporalAnalysis')} />
                <ThresholdField label="Timeout (ms)" fieldKey="analysisTimeoutMs" value={config.temporalAnalysis.analysisTimeoutMs} defaultValue={defaults.temporalAnalysis.analysisTimeoutMs} onChange={v => updateTemporalAnalysis('analysisTimeoutMs', v)} modified={isModified('analysisTimeoutMs', 'temporalAnalysis')} step={500} />
                <ThresholdField label="Qualidade frames mín." fieldKey="minFrameQualityPassRate" value={config.temporalAnalysis.minFrameQualityPassRate} defaultValue={defaults.temporalAnalysis.minFrameQualityPassRate} onChange={v => updateTemporalAnalysis('minFrameQualityPassRate', v)} modified={isModified('minFrameQualityPassRate', 'temporalAnalysis')} step={0.05} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrão
          </Button>
          <Button size="sm" onClick={handleSave} disabled={hasAnyOutOfBounds()} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Internal Field Component with Safety Bounds
// ============================================

function ThresholdField({
  label, fieldKey, value, defaultValue, onChange, modified, step = 1,
}: {
  label: string;
  fieldKey: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  modified?: boolean;
  step?: number;
}) {
  const bounds = SAFETY_BOUNDS[fieldKey];
  const outOfBounds = bounds ? (value < bounds[0] || value > bounds[1]) : false;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {modified && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">mod</Badge>}
      </div>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`h-8 text-xs ${outOfBounds ? 'border-destructive text-destructive' : ''}`}
      />
      <div className="flex justify-between">
        <span className="text-[10px] text-muted-foreground">Padrão: {defaultValue}</span>
        {bounds && (
          <span className={`text-[10px] ${outOfBounds ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            [{bounds[0]} — {bounds[1]}]
          </span>
        )}
      </div>
    </div>
  );
}
