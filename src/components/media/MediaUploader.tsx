import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Video, X, Upload, Loader2, CheckCircle, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { MediaSourceModal } from './MediaSourceModal';
import { FramingGuide } from './FramingGuide';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface MediaUploaderProps {
  assessmentId: string;
  testName: string;
  viewType?: string;
  onUploadComplete: (urls: { photoUrl?: string; videoUrl?: string }) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  className?: string;
}

export function MediaUploader({
  assessmentId,
  testName,
  viewType,
  onUploadComplete,
  onAnalyze,
  isAnalyzing = false,
  className,
}: MediaUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showFramingGuide, setShowFramingGuide] = useState(false);
  
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const photoGalleryRef = useRef<HTMLInputElement>(null);
  const videoCameraRef = useRef<HTMLInputElement>(null);
  const videoGalleryRef = useRef<HTMLInputElement>(null);

  const generateFilePath = (type: 'photo' | 'video', extension: string) => {
    const timestamp = Date.now();
    const viewSuffix = viewType ? `_${viewType}` : '';
    return `${assessmentId}/${testName}${viewSuffix}_${type}_${timestamp}.${extension}`;
  };

  const uploadFile = async (file: File, type: 'photo' | 'video') => {
    const extension = file.name.split('.').pop() || (type === 'photo' ? 'jpg' : 'mp4');
    const filePath = generateFilePath(type, extension);

    const { data, error } = await supabase.storage
      .from('assessment-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting existing files
      });

    if (error) {
      console.error('Storage upload error:', { error, filePath, fileSize: file.size, fileType: file.type });
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('assessment-media')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const deleteFileFromStorage = async (url: string) => {
    try {
      // Extract path from URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/assessment-media\/(.+)$/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        await supabase.storage.from('assessment-media').remove([filePath]);
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  };

  const getErrorMessage = (error: any, type: 'photo' | 'video'): string => {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.statusCode || error?.status;
    
    if (errorCode === 413 || errorMessage.includes('payload too large')) {
      return type === 'video' 
        ? 'Vídeo muito grande. Grave em 720p ou menor qualidade.'
        : 'Imagem muito grande. Máximo 10MB.';
    }
    if (errorCode === 403 || errorMessage.includes('permission') || errorMessage.includes('policy')) {
      return 'Sem permissão para upload. Faça login novamente.';
    }
    if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
      return 'Erro de arquivo duplicado. Tente novamente.';
    }
    if (errorCode === 404) {
      return 'Bucket de armazenamento não encontrado.';
    }
    
    return type === 'video'
      ? `Erro ao enviar vídeo (${errorCode || 'desconhecido'}). Tente novamente.`
      : `Erro ao enviar foto (${errorCode || 'desconhecido'}). Tente novamente.`;
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

    triggerHaptic('tap');
    setIsUploadingPhoto(true);
    
    try {
      const url = await uploadFile(file, 'photo');
      setPhotoUrl(url);
      onUploadComplete({ photoUrl: url, videoUrl: videoUrl || undefined });
      triggerHaptic('success');
      toast.success('Foto enviada com sucesso');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      triggerHaptic('error');
      toast.error(getErrorMessage(error, 'photo'));
    } finally {
      setIsUploadingPhoto(false);
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

    // Allow up to 150MB
    if (file.size > 150 * 1024 * 1024) {
      triggerHaptic('error');
      toast.error('O vídeo deve ter no máximo 150MB. Configure seu celular para gravar em 720p.');
      return;
    }

    triggerHaptic('tap');
    setIsUploadingVideo(true);
    
    try {
      const url = await uploadFile(file, 'video');
      setVideoUrl(url);
      onUploadComplete({ photoUrl: photoUrl || undefined, videoUrl: url });
      triggerHaptic('success');
      toast.success('Vídeo enviado com sucesso');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      triggerHaptic('error');
      toast.error(getErrorMessage(error, 'video'));
    } finally {
      setIsUploadingVideo(false);
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

  return (
    <>
      <Card className={cn('p-4 space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">
            {viewType ? `Captura - ${viewType}` : 'Captura de Mídia'}
          </h4>
          {hasMedia && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Hidden inputs for camera (with capture) */}
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
          
          {/* Hidden inputs for gallery (without capture) */}
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

          {/* Photo Upload */}
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

          {/* Video Upload */}
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
            onClick={handleAnalyze}
            disabled={isAnalyzing || !photoUrl}
            className="w-full min-h-[48px]"
            variant="default"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando movimento...
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
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Capture pelo menos uma foto para análise</span>
          </div>
        )}
      </Card>

      {/* Photo Source Modal */}
      <MediaSourceModal
        open={showPhotoModal}
        onOpenChange={setShowPhotoModal}
        onSelectCamera={openPhotoCamera}
        onSelectGallery={openPhotoGallery}
        mediaType="photo"
      />

      {/* Video Source Modal */}
      <MediaSourceModal
        open={showVideoModal}
        onOpenChange={setShowVideoModal}
        onSelectCamera={openVideoCamera}
        onSelectGallery={openVideoGallery}
        mediaType="video"
      />

      {/* Framing Guide Dialog */}
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
