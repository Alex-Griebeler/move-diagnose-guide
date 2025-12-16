import { User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface StudentIdentityBannerProps {
  studentName: string;
  studentId?: string;
}

export function StudentIdentityBanner({ studentName, studentId }: StudentIdentityBannerProps) {
  const initials = studentName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-muted/30 border-b">
      <Avatar className="h-9 w-9 border border-border">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {initials || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avaliando</span>
        <span className="font-medium text-foreground">{studentName}</span>
      </div>
    </div>
  );
}
