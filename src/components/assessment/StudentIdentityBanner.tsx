import { User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface StudentIdentityBannerProps {
  studentName: string;
  studentId?: string;
}

export function StudentIdentityBanner({ studentName }: StudentIdentityBannerProps) {
  const initials = studentName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-8 w-8 border border-primary/20">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials || <User className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avaliando</span>
        <span className="text-sm font-medium text-foreground">{studentName}</span>
      </div>
    </div>
  );
}
