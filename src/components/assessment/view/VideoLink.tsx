import { useState } from 'react';
import { Video, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { cn } from '@/lib/utils';

interface VideoLinkProps {
  publicUrl: string;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function VideoLink({ publicUrl, label, className, size = 'md' }: VideoLinkProps) {
  const { signedUrl, loading, error } = useSignedUrl(publicUrl);
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!signedUrl) {
      e.preventDefault();
      setClicked(true);
    }
  };

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const externalIconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-2';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (error) {
    return (
      <span 
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md bg-destructive/10 text-destructive cursor-not-allowed',
          padding,
          textSize,
          className
        )}
        title={error}
      >
        <AlertCircle className={iconSize} />
        <span>{label}</span>
      </span>
    );
  }

  if (loading || (clicked && !signedUrl)) {
    return (
      <span 
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md bg-muted text-muted-foreground cursor-wait',
          padding,
          textSize,
          className
        )}
      >
        <Loader2 className={cn(iconSize, 'animate-spin')} />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <a
      href={signedUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors',
        padding,
        textSize,
        className
      )}
    >
      <Video className={iconSize} />
      <span>{label}</span>
      <ExternalLink className={cn(externalIconSize, 'text-muted-foreground')} />
    </a>
  );
}
