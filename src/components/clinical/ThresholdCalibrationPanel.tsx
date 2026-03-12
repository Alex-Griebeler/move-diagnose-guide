import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RotateCcw, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getClinicalThresholds,
  getDefaultClinicalThresholds,
  saveClinicalThresholdOverrides,
  resetClinicalThresholdOverrides,
  type ClinicalThresholdsConfig,
} from '@/lib/clinical/clinicalThresholds';

interface ThresholdCalibrationPanelProps {
  onSaved?: () => void;
}

export function ThresholdCalibrationPanel({ onSaved }: ThresholdCalibrationPanelProps) {
  const [config, setConfig] = useState<ClinicalThresholdsConfig>(getClinicalThresholds);
  const defaults = getDefaultClinicalThresholds();

  const updateMediaQuality = useCallback((key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      mediaQuality: { ...prev.mediaQuality, [key]: value },
    }));
  }, []);

  const updateConfidence = useCallback((key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      confidence: { ...prev.confidence, [key]: value },
    }));
  }, []);

  const handleSave = () => {
    saveClinicalThresholdOverrides({
      mediaQuality: config.mediaQuality,
      confidence: config.confidence,
    });
    toast.success('Thresholds salvos');
    onSaved?.();
  };

  const handleReset = () => {
    resetClinicalThresholdOverrides();
    setConfig(getDefaultClinicalThresholds());
    toast.success('Thresholds restaurados para padrão');
    onSaved?.();
  };

  const isModified = (key: string, section: 'mediaQuality' | 'confidence') => {
    const current = (config[section] as any)[key];
    const def = (defaults[section] as any)[key];
    return current !== def;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          Calibração de Thresholds
        </CardTitle>
        <CardDescription className="text-xs">
          Versão: {config.evidenceVersion}
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
                <ThresholdField
                  label="Brilho mín."
                  value={config.mediaQuality.minBrightness}
                  defaultValue={defaults.mediaQuality.minBrightness}
                  onChange={v => updateMediaQuality('minBrightness', v)}
                  modified={isModified('minBrightness', 'mediaQuality')}
                />
                <ThresholdField
                  label="Brilho máx."
                  value={config.mediaQuality.maxBrightness}
                  defaultValue={defaults.mediaQuality.maxBrightness}
                  onChange={v => updateMediaQuality('maxBrightness', v)}
                  modified={isModified('maxBrightness', 'mediaQuality')}
                />
                <ThresholdField
                  label="Contraste mín."
                  value={config.mediaQuality.minContrast}
                  defaultValue={defaults.mediaQuality.minContrast}
                  onChange={v => updateMediaQuality('minContrast', v)}
                  modified={isModified('minContrast', 'mediaQuality')}
                />
                <ThresholdField
                  label="Nitidez mín."
                  value={config.mediaQuality.minSharpness}
                  defaultValue={defaults.mediaQuality.minSharpness}
                  onChange={v => updateMediaQuality('minSharpness', v)}
                  modified={isModified('minSharpness', 'mediaQuality')}
                />
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
                <ThresholdField
                  label="Confiança IA mín."
                  value={config.confidence.minAiConfidence}
                  defaultValue={defaults.confidence.minAiConfidence}
                  onChange={v => updateConfidence('minAiConfidence', v)}
                  modified={isModified('minAiConfidence', 'confidence')}
                  step={0.05}
                />
                <ThresholdField
                  label="Confiança Pose mín."
                  value={config.confidence.minPoseConfidence}
                  defaultValue={defaults.confidence.minPoseConfidence}
                  onChange={v => updateConfidence('minPoseConfidence', v)}
                  modified={isModified('minPoseConfidence', 'confidence')}
                  step={0.05}
                />
                <ThresholdField
                  label="Concordância mín."
                  value={config.confidence.minAgreementScore}
                  defaultValue={defaults.confidence.minAgreementScore}
                  onChange={v => updateConfidence('minAgreementScore', v)}
                  modified={isModified('minAgreementScore', 'confidence')}
                  step={0.05}
                />
                <ThresholdField
                  label="Auto-apply threshold"
                  value={config.confidence.autoApplyThreshold}
                  defaultValue={defaults.confidence.autoApplyThreshold}
                  onChange={v => updateConfidence('autoApplyThreshold', v)}
                  modified={isModified('autoApplyThreshold', 'confidence')}
                  step={0.05}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrão
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Internal Field Component
// ============================================

function ThresholdField({
  label, value, defaultValue, onChange, modified, step = 1,
}: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  modified: boolean;
  step?: number;
}) {
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
        className="h-8 text-xs"
      />
      <span className="text-[10px] text-muted-foreground">Padrão: {defaultValue}</span>
    </div>
  );
}
