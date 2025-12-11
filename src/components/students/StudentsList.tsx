import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Users, Trash2, UserX, Mail, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string | null;
}

interface StudentsListProps {
  onStudentRemoved?: () => void;
}

export function StudentsList({ onStudentRemoved }: StudentsListProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [removing, setRemoving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const fetchStudents = async () => {
    if (!user) return;

    try {
      const { data: links, error: linksError } = await supabase
        .from('professional_students')
        .select('id, student_id')
        .eq('professional_id', user.id);

      if (linksError) throw linksError;

      if (!links || links.length === 0) {
        setStudents([]);
        return;
      }

      const studentIds = links.map(l => l.student_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      const merged = links.map(link => {
        const profile = profiles?.find(p => p.id === link.student_id);
        return {
          id: link.id,
          student_id: link.student_id,
          full_name: profile?.full_name || 'Nome não disponível',
          email: profile?.email || null,
        };
      });

      setStudents(merged);
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const filteredStudents = students.filter(s => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  const handleRemove = async () => {
    if (!studentToRemove) return;

    setRemoving(true);

    try {
      const { error } = await supabase
        .from('professional_students')
        .delete()
        .eq('id', studentToRemove.id);

      if (error) throw error;

      toast.success('Aluno removido com sucesso');
      setStudents(prev => prev.filter(s => s.id !== studentToRemove.id));
      onStudentRemoved?.();
    } catch (err) {
      toast.error('Erro ao remover aluno');
    } finally {
      setRemoving(false);
      setStudentToRemove(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Meus Alunos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Meus Alunos
              {students.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({students.length})
                </span>
              )}
            </CardTitle>
            {students.length > 3 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSearch(!showSearch)}
              >
                {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </Button>
            )}
          </div>
          
          {/* Search Input */}
          {showSearch && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-6 text-center">
              <UserX className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum aluno vinculado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Use "Adicionar Aluno" para vincular alunos
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum resultado para "{searchTerm}"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{student.full_name}</p>
                    {student.email && (
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {student.email}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setStudentToRemove(student)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!studentToRemove} onOpenChange={() => setStudentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aluno</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{studentToRemove?.full_name}</strong> da sua lista de alunos?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removing ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
