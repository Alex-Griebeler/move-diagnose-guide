import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Search, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded?: () => void;
}

interface FoundStudent {
  id: string;
  full_name: string;
  email: string;
}

export function AddStudentModal({ open, onOpenChange, onStudentAdded }: AddStudentModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [foundStudent, setFoundStudent] = useState<FoundStudent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Digite um email para buscar');
      return;
    }

    setSearching(true);
    setError(null);
    setFoundStudent(null);

    try {
      // Search for user by email
      const { data: profile, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (searchError || !profile) {
        setError('Usuário não encontrado com este email');
        return;
      }

      // Check if user is a student
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .single();

      if (roleError || roleData?.role !== 'student') {
        setError('Este usuário não é um aluno');
        return;
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from('professional_students')
        .select('id')
        .eq('professional_id', user?.id)
        .eq('student_id', profile.id)
        .single();

      if (existingLink) {
        setError('Este aluno já está vinculado a você');
        return;
      }

      setFoundStudent(profile);
    } catch (err) {
      setError('Erro ao buscar usuário');
    } finally {
      setSearching(false);
    }
  };

  const handleAddStudent = async () => {
    if (!foundStudent || !user) return;

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('professional_students')
        .insert({
          professional_id: user.id,
          student_id: foundStudent.id,
        });

      if (insertError) throw insertError;

      toast.success('Aluno adicionado com sucesso!');
      onStudentAdded?.();
      handleClose();
    } catch (err) {
      toast.error('Erro ao adicionar aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setFoundStudent(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Adicionar Aluno
          </DialogTitle>
          <DialogDescription>
            Busque um aluno pelo email cadastrado para vinculá-lo à sua conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do aluno</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="aluno@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                  setFoundStudent(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {foundStudent && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{foundStudent.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {foundStudent.email}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleAddStudent}
            disabled={!foundStudent || loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Adicionar Aluno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
