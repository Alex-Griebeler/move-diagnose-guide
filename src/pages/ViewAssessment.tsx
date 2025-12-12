import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, Edit2, Save, X, User, ClipboardList, Activity, 
  FileText, CheckCircle2, AlertCircle, Loader2, Calendar,
  Dumbbell, Target, Zap, Shield, Flame, RotateCcw, Video, Play
} from 'lucide-react';
import { 
  PageLayout, 
  PageHeader, 
  PageContent,
  PageLoading 
} from '@/components/layout/PageLayout';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';
import { AssessmentBreadcrumb } from '@/components/assessment/AssessmentBreadcrumb';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const logger = createLogger('ViewAssessment');

type EditMode = 'view' | 'anamnesis' | 'global-tests' | 'segmental-tests' | 'protocol';

interface AssessmentData {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  student_id: string;
  student_name: string;
}

interface AnamnesisData {
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  occupation: string | null;
  objectives: string | null;
  activity_frequency: number | null;
  sports: unknown;
  sleep_hours: number | null;
  sleep_quality: number | null;
  has_red_flags: boolean | null;
}

interface GlobalTestData {
  test_name: string;
  anterior_view: unknown;
  lateral_view: unknown;
  posterior_view: unknown;
  left_side: any;
  right_side: any;
  media_urls: unknown;
}

interface SegmentalTestData {
  test_name: string;
  body_region: string;
  left_value: number | null;
  right_value: number | null;
  pass_fail_left: boolean | null;
  pass_fail_right: boolean | null;
  media_urls: unknown;
}

// Helper to safely get media URLs array
const getMediaUrls = (mediaUrls: unknown): string[] => {
  if (!mediaUrls) return [];
  if (Array.isArray(mediaUrls)) return mediaUrls as string[];
  if (typeof mediaUrls === 'string') {
    try {
      const parsed = JSON.parse(mediaUrls);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

interface ProtocolData {
  id: string;
  name: string | null;
  priority_level: string;
  frequency_per_week: number | null;
  duration_weeks: number | null;
  exercises: unknown;
}

const phaseConfig: Record<string, { label: string; icon: any; color: string }> = {
  mobility: { label: 'Mobilidade', icon: RotateCcw, color: 'text-blue-500' },
  inhibition: { label: 'Inibição', icon: Target, color: 'text-purple-500' },
  activation: { label: 'Ativação', icon: Zap, color: 'text-yellow-500' },
  stability: { label: 'Estabilidade', icon: Shield, color: 'text-green-500' },
  strength: { label: 'Força', icon: Dumbbell, color: 'text-orange-500' },
  integration: { label: 'Integração', icon: Flame, color: 'text-red-500' },
};

export default function ViewAssessment() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const studentNameParam = searchParams.get('studentName');
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null);
  const [globalTests, setGlobalTests] = useState<GlobalTestData[]>([]);
  const [segmentalTests, setSegmentalTests] = useState<SegmentalTestData[]>([]);
  const [protocol, setProtocol] = useState<ProtocolData | null>(null);

  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'professional')) {
      navigate('/dashboard');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (!assessmentId) {
      navigate('/dashboard');
      return;
    }
    fetchAssessmentData();
  }, [assessmentId]);

  const fetchAssessmentData = async () => {
    if (!assessmentId) return;
    setLoading(true);

    try {
      // Fetch assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .maybeSingle();

      if (assessmentError) throw assessmentError;
      if (!assessmentData) {
        toast.error('Avaliação não encontrada');
        navigate('/dashboard');
        return;
      }

      // Get student name
      let studentName = studentNameParam ? decodeURIComponent(studentNameParam) : 'Aluno';
      if (!studentNameParam) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', assessmentData.student_id)
          .maybeSingle();
        studentName = profile?.full_name || 'Aluno';
      }

      setAssessment({
        ...assessmentData,
        student_name: studentName,
      });

      // Fetch anamnesis
      const { data: anamnesisData } = await supabase
        .from('anamnesis_responses')
        .select('*')
        .eq('assessment_id', assessmentId)
        .maybeSingle();
      setAnamnesis(anamnesisData);

      // Fetch global tests
      const { data: globalTestsData } = await supabase
        .from('global_test_results')
        .select('*')
        .eq('assessment_id', assessmentId);
      setGlobalTests(globalTestsData || []);

      // Fetch segmental tests
      const { data: segmentalTestsData } = await supabase
        .from('segmental_test_results')
        .select('*')
        .eq('assessment_id', assessmentId);
      setSegmentalTests(segmentalTestsData || []);

      // Fetch protocol
      const { data: protocolData } = await supabase
        .from('protocols')
        .select('*')
        .eq('assessment_id', assessmentId)
        .maybeSingle();
      setProtocol(protocolData);

    } catch (error) {
      logger.error('Error fetching assessment data', error);
      toast.error('Erro ao carregar dados da avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComplete = async () => {
    setEditMode('view');
    await fetchAssessmentData();
    toast.success('Alterações salvas com sucesso!');
  };

  const handleCancelEdit = () => {
    setEditMode('view');
  };

  const getTestLabel = (testName: string) => {
    const labels: Record<string, string> = {
      overhead_squat: 'Overhead Squat',
      single_leg_squat: 'Single Leg Squat',
      pushup: 'Push-up',
    };
    return labels[testName] || testName;
  };

  const countCompensations = (testData: GlobalTestData): number => {
    let count = 0;
    const views = ['anterior_view', 'lateral_view', 'posterior_view', 'left_side', 'right_side'];
    views.forEach(view => {
      const viewData = testData[view as keyof GlobalTestData];
      if (viewData && typeof viewData === 'object' && 'compensations' in viewData) {
        count += (viewData.compensations as string[])?.length || 0;
      }
    });
    return count;
  };

  const getPriorityColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-destructive text-destructive-foreground',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-black',
      low: 'bg-blue-500 text-white',
      maintenance: 'bg-green-500 text-white',
    };
    return colors[level] || 'bg-muted text-muted-foreground';
  };

  const getPriorityLabel = (level: string) => {
    const labels: Record<string, string> = {
      critical: 'Crítico',
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
      maintenance: 'Manutenção',
    };
    return labels[level] || level;
  };

  if (authLoading || loading) {
    return <PageLoading variant="minimal" />;
  }

  if (!assessmentId || !assessment) return null;

  // If in edit mode, show the appropriate editor
  if (editMode !== 'view') {
    return (
      <PageLayout>
        <PageHeader
          variant="minimal"
          title={`Editar ${editMode === 'anamnesis' ? 'Anamnese' : editMode === 'global-tests' ? 'Testes Globais' : editMode === 'segmental-tests' ? 'Testes Segmentais' : 'Protocolo'}`}
          showBack
          onBack={handleCancelEdit}
          rightContent={
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          }
          className="border-b"
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b bg-card">
          <AssessmentBreadcrumb 
            currentStep={editMode === 'anamnesis' ? 'anamnesis' : editMode === 'global-tests' ? 'global-tests' : editMode === 'segmental-tests' ? 'segmental-tests' : 'protocol'} 
            studentName={assessment.student_name}
          />
        </div>

        <PageContent size="lg" className="py-8">
          {editMode === 'anamnesis' && (
            <AnamnesisWizard
              assessmentId={assessmentId}
              onComplete={handleEditComplete}
            />
          )}

          {editMode === 'global-tests' && (
            <GlobalTestsWizard
              assessmentId={assessmentId}
              onComplete={handleEditComplete}
            />
          )}

          {editMode === 'segmental-tests' && (
            <SegmentalTestsWizard
              assessmentId={assessmentId}
              onComplete={handleEditComplete}
            />
          )}

          {editMode === 'protocol' && (
            <ProtocolGenerator
              assessmentId={assessmentId}
              onComplete={handleEditComplete}
            />
          )}
        </PageContent>
      </PageLayout>
    );
  }

  // View mode - show assessment summary
  return (
    <PageLayout>
      <PageHeader
        variant="minimal"
        title="Detalhes da Avaliação"
        showBack
        onBack={() => navigate('/dashboard')}
        className="border-b"
      />

      <PageContent size="lg" className="py-8">
        {/* Assessment Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{assessment.student_name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(assessment.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {assessment.completed_at && (
                      <span className="text-success flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Concluída
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              {protocol && (
                <Badge className={getPriorityColor(protocol.priority_level)}>
                  Prioridade {getPriorityLabel(protocol.priority_level)}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="tests">Testes</TabsTrigger>
            <TabsTrigger value="protocol">Protocolo</TabsTrigger>
            <TabsTrigger value="edit">Editar</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Anamnesis Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Anamnese
                </CardTitle>
              </CardHeader>
              <CardContent>
                {anamnesis ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {anamnesis.objectives && (
                      <div>
                        <p className="text-muted-foreground">Objetivo</p>
                        <p className="font-medium">{anamnesis.objectives}</p>
                      </div>
                    )}
                    {anamnesis.activity_frequency && (
                      <div>
                        <p className="text-muted-foreground">Frequência</p>
                        <p className="font-medium">{anamnesis.activity_frequency}x/semana</p>
                      </div>
                    )}
                    {anamnesis.sleep_quality && (
                      <div>
                        <p className="text-muted-foreground">Qualidade do Sono</p>
                        <p className="font-medium">{anamnesis.sleep_quality}/10</p>
                      </div>
                    )}
                    {anamnesis.has_red_flags && (
                      <div>
                        <p className="text-muted-foreground">Red Flags</p>
                        <p className="font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Presente
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhuma anamnese registrada</p>
                )}
              </CardContent>
            </Card>

            {/* Tests Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Testes Globais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {globalTests.length > 0 ? (
                    <div className="space-y-2">
                      {globalTests.map(test => (
                        <div key={test.test_name} className="flex justify-between items-center">
                          <span className="text-sm">{getTestLabel(test.test_name)}</span>
                          <Badge variant="secondary">{countCompensations(test)} achados</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum teste global registrado</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Testes Segmentais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {segmentalTests.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total de testes</span>
                        <Badge variant="secondary">{segmentalTests.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Com déficit</span>
                        <Badge variant="destructive">
                          {segmentalTests.filter(t => t.pass_fail_left === false || t.pass_fail_right === false).length}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum teste segmental registrado</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-4">
            {/* Global Tests Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Testes Globais</CardTitle>
              </CardHeader>
              <CardContent>
                {globalTests.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {globalTests.map(test => (
                      <AccordionItem key={test.test_name} value={test.test_name}>
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <span>{getTestLabel(test.test_name)}</span>
                            <Badge variant="outline" className="text-xs">
                              {countCompensations(test)} achados
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {/* Video Section */}
                            {getMediaUrls(test.media_urls).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">Vídeos</p>
                                <div className="flex flex-wrap gap-2">
                                  {getMediaUrls(test.media_urls).map((url, idx) => {
                                    const fileName = url.split('/').pop() || `Video ${idx + 1}`;
                                    const viewName = fileName.includes('anterior') ? 'Anterior' 
                                      : fileName.includes('lateral') ? 'Lateral' 
                                      : fileName.includes('posterior') ? 'Posterior'
                                      : fileName.includes('left') ? 'Esquerdo'
                                      : fileName.includes('right') ? 'Direito'
                                      : `Vídeo ${idx + 1}`;
                                    
                                    return (
                                      <Dialog key={url}>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm" className="gap-2">
                                            <Play className="w-3 h-3" />
                                            {viewName}
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl">
                                          <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                              <Video className="w-4 h-4" />
                                              {getTestLabel(test.test_name)} - {viewName}
                                            </DialogTitle>
                                          </DialogHeader>
                                          <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                            <video 
                                              controls 
                                              className="w-full h-full object-contain"
                                              playsInline
                                              preload="metadata"
                                            >
                                              <source src={url} type="video/quicktime" />
                                              <source src={url} type="video/mp4" />
                                              Seu navegador não suporta este formato.
                                            </video>
                                          </div>
                                          <div className="flex justify-center pt-2">
                                            <a 
                                              href={url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-xs text-muted-foreground hover:text-primary underline"
                                            >
                                              Não consegue ver? Clique para abrir em nova aba
                                            </a>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Compensations Section */}
                            {['anterior_view', 'lateral_view', 'posterior_view', 'left_side', 'right_side'].map(view => {
                              const viewData = test[view as keyof GlobalTestData] as any;
                              if (!viewData?.compensations?.length) return null;
                              return (
                                <div key={view} className="pl-4 border-l-2 border-border">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {view.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase())}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {(viewData.compensations as string[]).map(comp => (
                                      <Badge key={comp} variant="secondary" className="text-xs">
                                        {comp.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum teste global registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Segmental Tests Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Testes Segmentais</CardTitle>
              </CardHeader>
              <CardContent>
                {segmentalTests.length > 0 ? (
                  <div className="space-y-2">
                    {segmentalTests.map(test => (
                      <div 
                        key={test.test_name} 
                        className="p-3 bg-muted/30 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{test.test_name.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground">{test.body_region}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">E</p>
                              <Badge 
                                variant={test.pass_fail_left === false ? 'destructive' : test.pass_fail_left === true ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {test.left_value !== null ? test.left_value : (test.pass_fail_left === true ? '✓' : test.pass_fail_left === false ? '✕' : '—')}
                              </Badge>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">D</p>
                              <Badge 
                                variant={test.pass_fail_right === false ? 'destructive' : test.pass_fail_right === true ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {test.right_value !== null ? test.right_value : (test.pass_fail_right === true ? '✓' : test.pass_fail_right === false ? '✕' : '—')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Video Section for Segmental Tests */}
                        {getMediaUrls(test.media_urls).length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {getMediaUrls(test.media_urls).map((url, idx) => (
                              <Dialog key={url}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-2 h-7 text-xs">
                                    <Play className="w-3 h-3" />
                                    Vídeo {idx + 1}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Video className="w-4 h-4" />
                                      {test.test_name.replace(/_/g, ' ')}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                    <video 
                                      controls 
                                      className="w-full h-full object-contain"
                                      playsInline
                                      preload="metadata"
                                    >
                                      <source src={url} type="video/quicktime" />
                                      <source src={url} type="video/mp4" />
                                      Seu navegador não suporta este formato.
                                    </video>
                                  </div>
                                  <div className="flex justify-center pt-2">
                                    <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-muted-foreground hover:text-primary underline"
                                    >
                                      Não consegue ver? Clique para abrir em nova aba
                                    </a>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum teste segmental registrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Protocol Tab */}
          <TabsContent value="protocol" className="space-y-4">
            {protocol ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{protocol.name || 'Protocolo FABRIK'}</CardTitle>
                        <CardDescription className="mt-1">
                          {protocol.frequency_per_week}x/semana • {protocol.duration_weeks} semanas
                        </CardDescription>
                      </div>
                      <Badge className={getPriorityColor(protocol.priority_level)}>
                        {getPriorityLabel(protocol.priority_level)}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Exercises grouped by phase */}
                {protocol.exercises && Array.isArray(protocol.exercises) && (
                  <div className="space-y-4">
                    {Object.entries(
                      (protocol.exercises as any[]).reduce((acc: any, ex: any) => {
                        const phase = ex.phase || 'other';
                        if (!acc[phase]) acc[phase] = [];
                        acc[phase].push(ex);
                        return acc;
                      }, {})
                    ).map(([phase, exercises]) => {
                      const config = phaseConfig[phase] || { label: phase, icon: Dumbbell, color: 'text-muted-foreground' };
                      const PhaseIcon = config.icon;
                      return (
                        <Card key={phase}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <PhaseIcon className={`w-4 h-4 ${config.color}`} />
                              {config.label}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(exercises as any[]).map((ex, idx) => (
                                <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="font-medium text-sm">{ex.name}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {ex.sets} séries • {ex.reps}
                                      </p>
                                    </div>
                                    {ex.targetMuscles && (
                                      <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                                        {(ex.targetMuscles as string[]).slice(0, 2).map(m => (
                                          <Badge key={m} variant="outline" className="text-xs">
                                            {m}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {ex.instructions && (
                                    <p className="text-xs text-muted-foreground mt-2">{ex.instructions}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum protocolo gerado</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setEditMode('protocol')}
                  >
                    Gerar Protocolo
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Editar Avaliação</CardTitle>
                <CardDescription>
                  Selecione qual parte da avaliação deseja editar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setEditMode('anamnesis')}
                >
                  <ClipboardList className="w-4 h-4 mr-3" />
                  Editar Anamnese
                  <Edit2 className="w-4 h-4 ml-auto" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setEditMode('global-tests')}
                >
                  <Activity className="w-4 h-4 mr-3" />
                  Editar Testes Globais
                  <Edit2 className="w-4 h-4 ml-auto" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setEditMode('segmental-tests')}
                >
                  <Target className="w-4 h-4 mr-3" />
                  Editar Testes Segmentais
                  <Edit2 className="w-4 h-4 ml-auto" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setEditMode('protocol')}
                >
                  <FileText className="w-4 h-4 mr-3" />
                  Regenerar Protocolo
                  <Edit2 className="w-4 h-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageLayout>
  );
}
