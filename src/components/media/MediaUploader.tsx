import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Video, X, Loader2, CheckCircle, Lightbulb, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { MediaSourceModal } from './MediaSourceModal';
import { FramingGuide } from './FramingGuide';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const logger = createLogger('MediaUploader');

interface MediaUploaderProps {
  assessmentId: string;
  testName: string;
  viewType?: string;
  initialPhotoUrl?: string;
  initialVideoUrl?: string;
  onUploadComplete: (urls: { photoUrl?: string; videoUrl?: string }) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  className?: string;
  /** When true, renders only content without Card wrapper (for embedding in parent Card) */
  embedded?: boolean;
}

export function MediaUploader({
  assessmentId,
  testName,
  viewType,
  initialPhotoUrl,
  initialVideoUrl,
  onUploadComplete,
  onAnalyze,
  isAnalyzing = false,
  className,
  embedded = false,
}: MediaUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl || null);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showFramingGuide, setShowFramingGuide] = useState(false);
  
  React.useEffect(() => {
    setPhotoUrl(initialPhotoUrl || null);
  }, [initialPhotoUrl]);
  
  React.useEffect(() => {
    setVideoUrl(initialVideoUrl || null);
  }, [initialVideoUrl]);
  
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const photoGalleryRef = useRef<HTMLInputElement>(null);
  const videoCameraRef = useRef<HTMLInputElement>(null);
  const videoGalleryRef = useRef<HTMLInputElement>(null);

  const generateFilePath = (type: 'photo' | 'video', extension: string) => {
    const timestamp = Date.now();
    const viewSuffix = viewType ? `_${viewType}` : '';
    return `${assessmentId}/${testName}${viewSuffix}_${type}_${timestamp}.${extension}`;
  };

  const verifyAssessmentOwnership = async (): Promise<boolean> => {
    logger.debug('Verifying ownership for:', assessmentId);
    
    if (!assessmentId) {
      logger.error('No assessmentId provided');
      return false;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error('Auth error', authError);
      return false;
    }

    logger.debug('Current user:', user.id);

    // First, check if it's a quick_protocol_sessions ID
    const { data: session, error: sessionError } = await supabase
      .from('quick_protocol_sessions')
      .select('id, professional_id, student_id')
      .eq('id', assessmentId)
      .maybeSingle();

    if (session) {
      const hasAccess = session.professional_id === user.id || session.student_id === user.id;
      logger.debug('Quick protocol session check:', {
        sessionId: assessmentId,
        professional_id: session.professional_id,
        student_id: session.student_id,
        userId: user.id,
        hasAccess,
      });
      return hasAccess;
    }

    // If not a session, check if it's an assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('id, professional_id, student_id')
      .eq('id', assessmentId)
      .maybeSingle();

    if (assessmentError) {
      logger.error('Error fetching assessment', assessmentError);
      return false;
    }

    if (!assessment) {
      logger.error('Assessment/Session not found:', assessmentId);
      return false;
    }

    const hasAccess = assessment.professional_id === user.id || assessment.student_id === user.id;
    logger.debug('Assessment ownership check:', {
      assessmentId,
      professional_id: assessment.professional_id,
      student_id: assessment.student_id,
      userId: user.id,
      hasAccess,
    });

    return hasAccess;
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    logger.debug('Getting signed URL for:', filePath);
    
    const { data, error } = await supabase.functions.invoke('get-signed-url', {
      body: { filePath },
    });

    if (error) {
      logger.error('Edge function error', {
        error,
        message: error.message,
        context: error.context,
      });
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }

    if (!data?.signedUrl) {
      logger.error('No signed URL in response', data);
      throw new Error('No signed URL returned');
    }

    logger.debug('Signed URL obtained successfully');
    return data.signedUrl;
  };

  const uploadFile = async (file: File, type: 'photo' | 'video'): Promise<string> => {
    const extension = file.name.split('.').pop() || (type === 'photo' ? 'jpg' : 'mp4');
    const filePath = generateFilePath(type, extension);

    logger.debug('Starting upload:', {
      filePath,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      fileName: file.name,
    });

    // Verify ownership before upload
    const hasAccess = await verifyAssessmentOwnership();
    if (!hasAccess) {
      throw new Error('RLS_ACCESS_DENIED');
    }

    logger.debug('Uploading to Supabase Storage...');
    
    const { data, error } = await supabase.storage
      .from('assessment-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      logger.error('Storage upload error', {
        error,
        message: error.message,
        name: error.name,
        filePath,
        fileSize: file.size,
        fileType: file.type,
      });
      throw error;
    }

    logger.debug('Upload successful:', data.path);

    // Verify file exists before returning URL
    const signedUrl = await getSignedUrl(data.path);
    
    // Double-check the file is accessible
    try {
      const response = await fetch(signedUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`File verification failed: ${response.status}`);
      }
    } catch (verifyError) {
      logger.error('File verification failed after upload', verifyError);
      // File upload succeeded but verification failed - still return URL
      // as the file might be eventually consistent
    }
    
    return signedUrl;
  };

  const deleteFileFromStorage = async (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/assessment-media\/(.+)$/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        console.log('[MediaUploader] Deleting file:', filePath);
        await supabase.storage.from('assessment-media').remove([filePath]);
      }
    } catch (error) {
      console.error('[MediaUploader] Error deleting file:', error);
    }
  };

  const getErrorMessage = (error: any, type: 'photo' | 'video'): string => {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.statusCode || error?.status;
    
    if (error?.message === 'RLS_ACCESS_DENIED') {
      return 'Sem permissão para este assessment. Verifique se você está logado corretamente.';
    }
    
    if (errorCode === 413 || errorMessage.includes('payload too large')) {
      return type === 'video' 
        ? 'Vídeo muito grande. Grave em 720p ou menor qualidade.'
        : 'Imagem muito grande. Máximo 10MB.';
    }
    
    if (errorCode === 403 || errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('row-level security')) {
      return 'Sem permissão para upload. Faça login novamente.';
    }
    
    if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
      return 'Erro de arquivo duplicado. Tente novamente.';
    }
    
    if (errorCode === 404 || errorMessage.includes('bucket not found')) {
      return 'Bucket de armazenamento não encontrado.';
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    return type === 'video'
      ? `Erro ao enviar vídeo. Tente novamente. (${errorCode || errorMessage || 'erro desconhecido'})`
      : `Erro ao enviar foto. Tente novamente. (${errorCode || errorMessage || 'erro desconhecido'})`;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerHaptic('error');
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      triggerHaptic('error');
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    logger.debug('Photo upload initiated:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      assessmentId,
      testName,
      viewType,
    });

    triggerHaptic('tap');
    setIsUploadingPhoto(true);
    
    try {
      const url = await uploadFile(file, 'photo');
      setPhotoUrl(url);
      onUploadComplete({ photoUrl: url, videoUrl: videoUrl || undefined });
      triggerHaptic('success');
      toast.success('Foto enviada com sucesso');
    } catch (error: any) {
      logger.error('Photo upload failed', error);
      triggerHaptic('error');
      toast.error(getErrorMessage(error, 'photo'));
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      triggerHaptic('error');
      toast.error('Por favor, selecione um vídeo válido');
      return;
    }

    if (file.size > 150 * 1024 * 1024) {
      triggerHaptic('error');
      toast.error('O vídeo deve ter no máximo 150MB. Configure seu celular para gravar em 720p.');
      return;
    }

    logger.debug('Video upload initiated:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type,
      assessmentId,
      testName,
      viewType,
    });

    triggerHaptic('tap');
    setIsUploadingVideo(true);
    
    try {
      const url = await uploadFile(file, 'video');
      setVideoUrl(url);
      onUploadComplete({ photoUrl: photoUrl || undefined, videoUrl: url });
      triggerHaptic('success');
      toast.success('Vídeo enviado com sucesso');
    } catch (error: any) {
      logger.error('Video upload failed', error);
      triggerHaptic('error');
      toast.error(getErrorMessage(error, 'video'));
    } finally {
      setIsUploadingVideo(false);
      if (e.target) e.target.value = '';
    }
  };

  const removePhoto = async () => {
    triggerHaptic('tap');
    if (photoUrl) {
      await deleteFileFromStorage(photoUrl);
    }
    setPhotoUrl(null);
    onUploadComplete({ videoUrl: videoUrl || undefined });
    if (photoCameraRef.current) photoCameraRef.current.value = '';
    if (photoGalleryRef.current) photoGalleryRef.current.value = '';
  };

  const removeVideo = async () => {
    triggerHaptic('tap');
    if (videoUrl) {
      await deleteFileFromStorage(videoUrl);
    }
    setVideoUrl(null);
    onUploadComplete({ photoUrl: photoUrl || undefined });
    if (videoCameraRef.current) videoCameraRef.current.value = '';
    if (videoGalleryRef.current) videoGalleryRef.current.value = '';
  };

  const openPhotoCamera = () => {
    setShowFramingGuide(true);
  };

  const captureAfterGuide = () => {
    setShowFramingGuide(false);
    setTimeout(() => {
      photoCameraRef.current?.click();
    }, 100);
  };

  const openPhotoGallery = () => {
    photoGalleryRef.current?.click();
  };

  const openVideoCamera = () => {
    videoCameraRef.current?.click();
  };

  const openVideoGallery = () => {
    videoGalleryRef.current?.click();
  };

  const handleAnalyze = () => {
    triggerHaptic('tap');
    onAnalyze?.();
  };

  const hasMedia = photoUrl || videoUrl;
  const inputId = `${testName}-${viewType || 'main'}`;

  const content = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <input
          ref={photoCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
          id={`photo-camera-${inputId}`}
        />
        <input
          ref={videoCameraRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleVideoUpload}
          className="hidden"
          id={`video-camera-${inputId}`}
        />
        
        <input
          ref={photoGalleryRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
          id={`photo-gallery-${inputId}`}
        />
        <input
          ref={videoGalleryRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
          id={`video-gallery-${inputId}`}
        />

        <div className="space-y-2">
          {photoUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={photoUrl}
                alt="Captured photo"
                className="w-full h-full object-cover"
              />
              <button
                onClick={removePhoto}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors touch-manipulation"
                aria-label="Remover foto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPhotoModal(true)}
              disabled={isUploadingPhoto}
              className={cn(
                'flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed transition-all touch-manipulation',
                'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 active:scale-98',
                isUploadingPhoto && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isUploadingPhoto ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">Foto</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="space-y-2">
        {videoUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <video
                src={videoUrl}
                className="w-full h-full object-contain bg-black"
                controls
              />
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors touch-manipulation"
                aria-label="Remover vídeo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowVideoModal(true)}
              disabled={isUploadingVideo}
              className={cn(
                'flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed transition-all touch-manipulation',
                'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 active:scale-98',
                isUploadingVideo && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isUploadingVideo ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <Video className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">Vídeo (opcional)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Analyze Button */}
      {onAnalyze && hasMedia && (
        <Button
          onClick={() => {
            triggerHaptic('tap');
            onAnalyze();
          }}
          disabled={isAnalyzing}
          className="w-full"
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Analisar Movimento
            </>
          )}
        </Button>
      )}

      {!hasMedia && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-1">
          <Lightbulb className="h-3.5 w-3.5" />
          <span>Capture mídia para análise</span>
        </div>
      )}
    </>
  );

  return (
    <>
      {embedded ? (
        <div className={cn('space-y-4', className)}>
          {content}
        </div>
      ) : (
        <Card className={cn('p-4 space-y-4', className)}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              {viewType ? `Captura - ${viewType}` : 'Captura de Mídia'}
            </h4>
            {hasMedia && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
          {content}
        </Card>
      )}

      <MediaSourceModal
        open={showPhotoModal}
        onOpenChange={setShowPhotoModal}
        onSelectCamera={openPhotoCamera}
        onSelectGallery={openPhotoGallery}
        mediaType="photo"
      />

      <MediaSourceModal
        open={showVideoModal}
        onOpenChange={setShowVideoModal}
        onSelectCamera={openVideoCamera}
        onSelectGallery={openVideoGallery}
        mediaType="video"
      />

      <Dialog open={showFramingGuide} onOpenChange={setShowFramingGuide}>
        <DialogContent className="max-w-sm p-4">
          <FramingGuide testName={testName} viewType={viewType} />
          <Button 
            onClick={captureAfterGuide} 
            className="w-full mt-4 min-h-[48px]"
          >
            <Camera className="h-4 w-4 mr-2" />
            Capturar Agora
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
