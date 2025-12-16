import { useState, useMemo } from 'react';
import { Search, X, User, ChevronRight, UserX, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StudentItem {
  id: string;
  full_name: string;
  email?: string | null;
}

interface StudentSearchListProps {
  students: StudentItem[];
  onSelect: (student: StudentItem) => void;
  isLoading?: boolean;
  loadingId?: string;
  selectedId?: string;
  emptyMessage?: string;
  emptySubMessage?: string;
  showSearch?: boolean;
  placeholder?: string;
  actionLabel?: string;
  variant?: 'card' | 'compact';
  className?: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">
        {part}
      </mark>
    ) : part
  );
}

function scoreMatch(student: StudentItem, query: string): number {
  const q = query.toLowerCase().trim();
  const name = student.full_name.toLowerCase();
  const email = (student.email || '').toLowerCase();
  
  // Exact match on name
  if (name === q) return 100;
  
  // Name starts with query
  if (name.startsWith(q)) return 90;
  
  // Word in name starts with query
  const words = name.split(/\s+/);
  if (words.some(w => w.startsWith(q))) return 80;
  
  // Email starts with query
  if (email.startsWith(q)) return 70;
  
  // Name contains query
  if (name.includes(q)) return 60;
  
  // Email contains query
  if (email.includes(q)) return 50;
  
  return 0;
}

export function StudentSearchList({
  students,
  onSelect,
  isLoading,
  loadingId,
  selectedId,
  emptyMessage = 'Nenhum aluno encontrado',
  emptySubMessage,
  showSearch = true,
  placeholder = 'Buscar por nome ou email...',
  actionLabel,
  variant = 'card',
  className,
}: StudentSearchListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    
    return students
      .map(s => ({ student: s, score: scoreMatch(s, searchTerm) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.student);
  }, [students, searchTerm]);

  const hasStudents = students.length > 0;
  const hasResults = filteredStudents.length > 0;

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {showSearch && (
          <div className="h-11 bg-muted/50 rounded-md animate-pulse" />
        )}
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input */}
      {showSearch && hasStudents && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-11"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {hasResults ? (
        <div className="space-y-2">
          {filteredStudents.map((student) => {
            const isItemLoading = loadingId === student.id;
            const isSelected = selectedId === student.id;
            
            return variant === 'card' ? (
              <Card
                key={student.id}
                className={cn(
                  'cursor-pointer card-hover border transition-all duration-150',
                  'active:scale-[0.98]',
                  isSelected && 'border-primary ring-2 ring-primary/20',
                  isItemLoading && 'opacity-70 pointer-events-none border-primary'
                )}
                onClick={() => onSelect(student)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {highlightMatch(student.full_name, searchTerm)}
                    </p>
                    {student.email && (
                      <p className="text-sm text-muted-foreground truncate">
                        {highlightMatch(student.email, searchTerm)}
                      </p>
                    )}
                  </div>
                  {isItemLoading ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                  ) : actionLabel ? (
                    <Button variant="outline" size="sm" className="shrink-0">
                      {actionLabel}
                    </Button>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div
                key={student.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150',
                  'bg-muted/50 hover:bg-muted active:scale-[0.98]',
                  isSelected && 'ring-2 ring-primary',
                  isItemLoading && 'opacity-70 pointer-events-none ring-2 ring-primary'
                )}
                onClick={() => onSelect(student)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {highlightMatch(student.full_name, searchTerm)}
                  </p>
                  {student.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {highlightMatch(student.email, searchTerm)}
                    </p>
                  )}
                </div>
                {isItemLoading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      ) : hasStudents ? (
        // Has students but no search results
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Nenhum resultado para "<span className="font-medium">{searchTerm}</span>"
            </p>
          </CardContent>
        </Card>
      ) : (
        // No students at all
        <Card>
          <CardContent className="py-12 text-center">
            <UserX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">{emptyMessage}</p>
            {emptySubMessage && (
              <p className="text-sm text-muted-foreground mt-1">{emptySubMessage}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
