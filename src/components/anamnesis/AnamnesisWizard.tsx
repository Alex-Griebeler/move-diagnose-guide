import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

// Step components
import { PersonalDataStep } from './steps/PersonalDataStep';
import { PainHistoryStep } from './steps/PainHistoryStep';
import { SurgeriesRedFlagsStep } from './steps/SurgeriesRedFlagsStep';
import { RoutineHabitsStep } from './steps/RoutineHabitsStep';
import { SleepRecoveryStep } from './steps/SleepRecoveryStep';
import { PhysicalActivitySportsStep } from './steps/PhysicalActivitySportsStep';
import { ObjectivesStep } from './steps/ObjectivesStep';
import { ConsentStep } from './steps/ConsentStep';
import { useState, useEffect } from 'react';

const logger = createLogger('AnamnesisWizard');

export interface AnamnesisData {
  // Block 1: Personal Data
  birthDate: Date | undefined;
  weightKg: string;
  heightCm: string;
  laterality: 'right' | 'left' | 'ambidextrous' | '';
  occupation: string;

  // Block 2: Pain History
  painHistory: Array<{
    region: string;
    intensity: number;
    duration: string;
    description: string;
  }>;

  // Block 3: Surgeries and Red Flags
  surgeries: Array<{
    type: string;
    year: string;
    region: string;
    laterality?: string;
  }>;
  redFlags: {
    unexplainedWeightLoss: boolean;
    nightPain: boolean;
    fever: boolean;
    bladderBowelDysfunction: boolean;
    progressiveWeakness: boolean;
    recentTrauma: boolean;
    cancerHistory: boolean;
    osteoporosis: boolean;
  };
  hasRedFlags: boolean;

  // Block 4: Routine and Habits
  sedentaryHoursPerDay: string;
  workType: string;

  // Block 5: Sleep and Recovery
  sleepQuality: number;
  sleepHours: string;

  // Block 6: Physical Activity and Sports (unified)
  activityModalities: string[];
  activityFrequency: '1-2x' | '3-4x' | '5+' | null;
  activityDuration: '30-45min' | '45-60min' | '60-90min' | null;
  isSedentary: boolean;
  practicesSports: boolean;
  sports: Array<{
    name: string;
    level: string;
    frequency: string;
  }>;

  // Block 8: Objectives
  selectedObjectives: string[];
  otherObjectives: string;
  timeHorizon: string;

  // Block 9: LGPD Consent
  lgpdConsent: boolean;
}

const initialData: AnamnesisData = {
  birthDate: undefined,
  weightKg: '',
  heightCm: '',
  laterality: '',
  occupation: '',
  painHistory: [],
  surgeries: [],
  redFlags: {
    unexplainedWeightLoss: false,
    nightPain: false,
    fever: false,
    bladderBowelDysfunction: false,
    progressiveWeakness: false,
    recentTrauma: false,
    cancerHistory: false,
    osteoporosis: false,
  },
  hasRedFlags: false,
  sedentaryHoursPerDay: '',
  workType: '',
  sleepQuality: 5,
  sleepHours: '',
  activityModalities: [],
  activityFrequency: null,
  activityDuration: null,
  isSedentary: false,
  practicesSports: false,
  sports: [],
  selectedObjectives: [],
  otherObjectives: '',
  timeHorizon: '',
  lgpdConsent: false,
};

const steps = [
  { id: 1, title: 'Dados Pessoais', shortTitle: 'Pessoal' },
  { id: 2, title: 'Histórico de Dor', shortTitle: 'Dor' },
  { id: 3, title: 'Cirurgias e Red Flags', shortTitle: 'Cirurgias' },
  { id: 4, title: 'Rotina e Hábitos', shortTitle: 'Rotina' },
  { id: 5, title: 'Sono e Recuperação', shortTitle: 'Sono' },
  { id: 6, title: 'Atividade e Esportes', shortTitle: 'Atividade' },
  { id: 7, title: 'Objetivos', shortTitle: 'Objetivos' },
  { id: 8, title: 'Consentimento LGPD', shortTitle: 'LGPD' },
];

interface AnamnesisWizardProps {
  assessmentId: string;
  studentId?: string;
  onComplete: () => void;
}

export function AnamnesisWizard({ assessmentId, studentId, onComplete }: AnamnesisWizardProps) {
  const {
    data,
    updateData: baseUpdateData,
    currentStep,
    setCurrentStep,
    clearPersistedData,
    isLoading: isLoadingPersistence,
  } = useWizardPersistence<AnamnesisData>({
    key: 'anamnesis_wizard',
    initialData,
    assessmentId,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [resolvedStudentId, setResolvedStudentId] = useState<string | null>(studentId || null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch student profile data on mount to pre-populate personal data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        // If no studentId provided, fetch from assessment
        let targetStudentId = resolvedStudentId;
        
        if (!targetStudentId) {
          const { data: assessment } = await supabase
            .from('assessments')
            .select('student_id')
            .eq('id', assessmentId)
            .maybeSingle();
          
          if (assessment?.student_id) {
            targetStudentId = assessment.student_id;
            setResolvedStudentId(targetStudentId);
          }
        }

        if (!targetStudentId) {
          setIsLoadingProfile(false);
          return;
        }

        // Fetch student profile with personal data
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('birth_date, laterality, weight_kg, height_cm, occupation')
          .eq('id', targetStudentId)
          .maybeSingle();

        if (error) {
          logger.error('Error fetching student profile', error);
          setIsLoadingProfile(false);
          return;
        }

        // Pre-populate if profile has data and current data is empty
        if (profile) {
          const updates: Partial<AnamnesisData> = {};
          
          if (profile.birth_date && !data.birthDate) {
            updates.birthDate = new Date(profile.birth_date);
          }
          if (profile.laterality && !data.laterality) {
            updates.laterality = profile.laterality as AnamnesisData['laterality'];
          }
          if (profile.weight_kg && !data.weightKg) {
            updates.weightKg = String(profile.weight_kg);
          }
          if (profile.height_cm && !data.heightCm) {
            updates.heightCm = String(profile.height_cm);
          }
          if (profile.occupation && !data.occupation) {
            updates.occupation = profile.occupation;
          }

          if (Object.keys(updates).length > 0) {
            logger.debug('Pre-populating from profile', updates);
            baseUpdateData(prev => ({ ...prev, ...updates }));
          }
        }
      } catch (error) {
        logger.error('Error in fetchStudentData', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (!isLoadingPersistence) {
      fetchStudentData();
    }
  }, [assessmentId, resolvedStudentId, isLoadingPersistence]);

  const updateData = (updates: Partial<AnamnesisData>) => {
    baseUpdateData((prev) => {
      const newData = { ...prev, ...updates };
      
      // Check for red flags
      if (updates.redFlags) {
        newData.hasRedFlags = Object.values(updates.redFlags).some(Boolean);
      }
      
      return newData;
    });
  };

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!data.lgpdConsent) {
      toast({
        variant: 'destructive',
        title: 'Consentimento necessário',
        description: 'É necessário aceitar os termos de consentimento LGPD para continuar.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Map new frequency format to numeric for DB compatibility
      const frequencyMap: Record<string, number> = { '1-2x': 2, '3-4x': 4, '5+': 6 };
      const durationMap: Record<string, number> = { '30-45min': 38, '45-60min': 52, '60-90min': 75 };

      // Save anamnesis response
      const { error } = await supabase.from('anamnesis_responses').insert({
        assessment_id: assessmentId,
        birth_date: data.birthDate?.toISOString().split('T')[0] || null,
        weight_kg: data.weightKg ? parseFloat(data.weightKg) : null,
        height_cm: data.heightCm ? parseFloat(data.heightCm) : null,
        laterality: data.laterality || null,
        occupation: data.occupation || null,
        pain_history: data.painHistory,
        surgeries: data.surgeries,
        red_flags: data.redFlags,
        has_red_flags: data.hasRedFlags,
        sedentary_hours_per_day: data.sedentaryHoursPerDay ? parseFloat(data.sedentaryHoursPerDay) : null,
        work_type: data.workType || null,
        sleep_quality: data.sleepQuality,
        sleep_hours: data.sleepHours ? parseFloat(data.sleepHours) : null,
        activity_frequency: data.activityFrequency ? frequencyMap[data.activityFrequency] : null,
        activity_types: data.activityModalities,
        activity_duration_minutes: data.activityDuration ? durationMap[data.activityDuration] : null,
        sports: data.sports,
        objectives: [...(data.selectedObjectives || []), data.otherObjectives].filter(Boolean).join('; ') || null,
        time_horizon: data.timeHorizon || null,
        lgpd_consent: data.lgpdConsent,
        lgpd_consent_date: new Date().toISOString(),
      });

      if (error) throw error;

      // Save personal data back to student profile for future assessments
      if (resolvedStudentId) {
        const profileUpdate: Record<string, unknown> = {};
        
        if (data.birthDate) {
          profileUpdate.birth_date = data.birthDate.toISOString().split('T')[0];
        }
        if (data.laterality) {
          profileUpdate.laterality = data.laterality;
        }
        if (data.weightKg) {
          profileUpdate.weight_kg = parseFloat(data.weightKg);
        }
        if (data.heightCm) {
          profileUpdate.height_cm = parseFloat(data.heightCm);
        }
        if (data.occupation) {
          profileUpdate.occupation = data.occupation;
        }

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', resolvedStudentId);

          if (profileError) {
            logger.error('Error updating student profile', profileError);
            // Don't fail the whole submission if profile update fails
          } else {
            logger.debug('Student profile updated with personal data');
          }
        }
      }

      // Update assessment status
      await supabase
        .from('assessments')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', assessmentId);

      // Clear persisted data after successful save
      clearPersistedData();

      toast({
        title: 'Anamnese salva!',
        description: data.hasRedFlags
          ? 'Atenção: Red Flags detectados. Encaminhe para avaliação médica.'
          : 'Dados registrados com sucesso. Próximo: Testes Globais.',
      });

      onComplete();
    } catch (error) {
      console.error('Error saving anamnesis:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a anamnese. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 8) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PersonalDataStep data={data} updateData={updateData} />;
      case 2:
        return <PainHistoryStep data={data} updateData={updateData} />;
      case 3:
        return <SurgeriesRedFlagsStep data={data} updateData={updateData} />;
      case 4:
        return <RoutineHabitsStep data={data} updateData={updateData} />;
      case 5:
        return <SleepRecoveryStep data={data} updateData={updateData} />;
      case 6:
        return <PhysicalActivitySportsStep data={data} updateData={updateData} />;
      case 7:
        return <ObjectivesStep data={data} updateData={updateData} />;
      case 8:
        return <ConsentStep data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  if (isLoadingPersistence || isLoadingProfile) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando dados do aluno...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            {steps[currentStep - 1].title}
          </h2>
        <span className="text-sm text-muted-foreground">
            Etapa {currentStep} de 8
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between mt-4 overflow-x-auto pb-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "flex flex-col items-center min-w-[60px] transition-colors",
                step.id === currentStep
                  ? "text-accent"
                  : step.id < currentStep
                  ? "text-success"
                  : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all",
                  step.id === currentStep
                    ? "border-accent bg-accent text-accent-foreground"
                    : step.id < currentStep
                    ? "border-success bg-success text-success-foreground"
                    : "border-muted-foreground/30"
                )}
              >
                {step.id < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{step.shortTitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Red Flags Warning */}
      {data.hasRedFlags && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Red Flags Detectados</p>
            <p className="text-sm text-muted-foreground">
              Foram identificados sinais de alerta que requerem avaliação médica antes de prosseguir.
            </p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-card rounded-xl border p-6 mb-6 animate-fade-in">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        {currentStep < 8 ? (
          <Button onClick={handleNext}>
            Próximo
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !data.lgpdConsent}
            className="bg-success hover:bg-success/90"
          >
            {isSubmitting ? (
              <span className="animate-pulse-soft">Salvando...</span>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Concluir Anamnese
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
