import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Video, X, Upload, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  assessmentId: string;
  testName: string;
  viewType?: string; // e.g., 'anterior', 'lateral', 'posterior', 'left', 'right'
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('assessment-media')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 10MB for photos)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const url = await uploadFile(file, 'photo');
      setPhotoUrl(url);
      onUploadComplete({ photoUrl: url, videoUrl: videoUrl || undefined });
      toast.success('Foto enviada com sucesso');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Por favor, selecione um vídeo válido');
      return;
    }

    // Validate file size (max 50MB for videos)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('O vídeo deve ter no máximo 50MB');
      return;
    }

    setIsUploadingVideo(true);
    try {
      const url = await uploadFile(file, 'video');
      setVideoUrl(url);
      onUploadComplete({ photoUrl: photoUrl || undefined, videoUrl: url });
      toast.success('Vídeo enviado com sucesso');
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Erro ao enviar vídeo');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const removePhoto = () => {
    setPhotoUrl(null);
    onUploadComplete({ videoUrl: videoUrl || undefined });
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    setVideoUrl(null);
    onUploadComplete({ photoUrl: photoUrl || undefined });
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const hasMedia = photoUrl || videoUrl;

  return (
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
        {/* Photo Upload */}
        <div className="space-y-2">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
            id={`photo-${testName}-${viewType || 'main'}`}
          />
          
          {photoUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={photoUrl}
                alt="Captured photo"
                className="w-full h-full object-cover"
              />
              <button
                onClick={removePhoto}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor={`photo-${testName}-${viewType || 'main'}`}
              className={cn(
                'flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
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
            </label>
          )}
        </div>

        {/* Video Upload */}
        <div className="space-y-2">
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleVideoUpload}
            className="hidden"
            id={`video-${testName}-${viewType || 'main'}`}
          />
          
          {videoUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                controls
              />
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor={`video-${testName}-${viewType || 'main'}`}
              className={cn(
                'flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
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
            </label>
          )}
        </div>
      </div>

      {/* Analyze Button */}
      {onAnalyze && hasMedia && (
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing || !photoUrl}
          className="w-full"
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
        <p className="text-xs text-muted-foreground text-center">
          Capture pelo menos uma foto para análise
        </p>
      )}
    </Card>
  );
}