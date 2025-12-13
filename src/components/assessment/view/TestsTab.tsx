import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getTestLabel, countCompensations, getMediaUrls } from '@/lib/assessmentUtils';
import { VideoLink } from './VideoLink';

interface GlobalTestData {
  test_name: string;
  anterior_view: unknown;
  lateral_view: unknown;
  posterior_view: unknown;
  left_side: unknown;
  right_side: unknown;
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

interface TestsTabProps {
  globalTests: GlobalTestData[];
  segmentalTests: SegmentalTestData[];
}

function getViewNameFromUrl(url: string, idx: number): string {
  const fileName = url.split('/').pop() || '';
  if (fileName.includes('anterior')) return 'Anterior';
  if (fileName.includes('lateral')) return 'Lateral';
  if (fileName.includes('posterior')) return 'Posterior';
  if (fileName.includes('left')) return 'Esquerdo';
  if (fileName.includes('right')) return 'Direito';
  return `Vídeo ${idx + 1}`;
}

export function TestsTab({ globalTests, segmentalTests }: TestsTabProps) {
  return (
    <div className="space-y-4">
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
                            {getMediaUrls(test.media_urls).map((url, idx) => (
                              <VideoLink
                                key={url}
                                publicUrl={url}
                                label={getViewNameFromUrl(url, idx)}
                                size="md"
                              />
                            ))}
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
                        <VideoLink
                          key={url}
                          publicUrl={url}
                          label={`Vídeo ${idx + 1}`}
                          size="sm"
                        />
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
    </div>
  );
}
