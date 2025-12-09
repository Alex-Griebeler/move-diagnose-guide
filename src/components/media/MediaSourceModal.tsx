import { Camera, ImageIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { triggerHaptic } from '@/lib/haptics';

interface MediaSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  mediaType: 'photo' | 'video';
}

export function MediaSourceModal({
  open,
  onOpenChange,
  onSelectCamera,
  onSelectGallery,
  mediaType,
}: MediaSourceModalProps) {
  const handleCamera = () => {
    triggerHaptic('tap');
    onSelectCamera();
    onOpenChange(false);
  };

  const handleGallery = () => {
    triggerHaptic('tap');
    onSelectGallery();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-center">
            {mediaType === 'photo' ? 'Adicionar Foto' : 'Adicionar Vídeo'}
          </SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleCamera}
            className="flex flex-col items-center justify-center p-6 rounded-xl bg-muted hover:bg-muted/80 active:scale-95 transition-all min-h-[120px] touch-manipulation"
          >
            <Camera className="h-10 w-10 mb-3 text-primary" />
            <span className="text-sm font-medium text-foreground">Usar Câmera</span>
            <span className="text-xs text-muted-foreground mt-1">Captura direta</span>
          </button>
          
          <button
            onClick={handleGallery}
            className="flex flex-col items-center justify-center p-6 rounded-xl bg-muted hover:bg-muted/80 active:scale-95 transition-all min-h-[120px] touch-manipulation"
          >
            <ImageIcon className="h-10 w-10 mb-3 text-primary" />
            <span className="text-sm font-medium text-foreground">Galeria</span>
            <span className="text-xs text-muted-foreground mt-1">Escolher arquivo</span>
          </button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Para melhor análise, use boa iluminação
        </p>
      </SheetContent>
    </Sheet>
  );
}
