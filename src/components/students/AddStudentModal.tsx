import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Mail, UserPlus, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded?: () => void;
}

export function AddStudentModal({ open, onOpenChange, onStudentAdded }: AddStudentModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Invite tab state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // In-person tab state
  const [inpersonEmail, setInpersonEmail] = useState('');
  const [inpersonName, setInpersonName] = useState('');
  const [inpersonPhone, setInpersonPhone] = useState('');
  const [inpersonLoading, setInpersonLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Digite o email do aluno');
      return;
    }
    if (!inviteName.trim()) {
      setError('Digite o nome do aluno');
      return;
    }
    if (!validateEmail(inviteEmail)) {
      setError('Email inválido');
      return;
    }

    setInviteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-student', {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          fullName: inviteName.trim(),
          mode: 'invite',
          professionalId: user?.id,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        return;
      }

      setSuccess(data.message || 'Convite enviado com sucesso!');
      toast.success('Convite enviado!', {
        description: 'O aluno receberá um email para definir sua senha.',
      });
      onStudentAdded?.();
      
      // Reset form after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error sending invite:', err);
      setError(err.message || 'Erro ao enviar convite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleInPersonRegistration = async () => {
    if (!inpersonEmail.trim()) {
      setError('Digite o email do aluno');
      return;
    }
    if (!inpersonName.trim()) {
      setError('Digite o nome do aluno');
      return;
    }
    if (!validateEmail(inpersonEmail)) {
      setError('Email inválido');
      return;
    }

    setInpersonLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-student', {
        body: {
          email: inpersonEmail.trim().toLowerCase(),
          fullName: inpersonName.trim(),
          phone: inpersonPhone.trim() || undefined,
          mode: 'inperson',
          professionalId: user?.id,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        return;
      }

      toast.success('Aluno cadastrado!', {
        description: 'Redirecionando para a avaliação...',
      });
      
      onStudentAdded?.();
      onOpenChange(false);
      
      // Redirect to anamnesis with the new student and assessment
      navigate(`/new-assessment?studentId=${data.studentId}&assessmentId=${data.assessmentId}&studentName=${encodeURIComponent(data.studentName)}`);
    } catch (err: any) {
      console.error('Error creating student:', err);
      setError(err.message || 'Erro ao cadastrar aluno');
    } finally {
      setInpersonLoading(false);
    }
  };

  const handleClose = () => {
    setInviteEmail('');
    setInviteName('');
    setInpersonEmail('');
    setInpersonName('');
    setInpersonPhone('');
    setError(null);
    setSuccess(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Adicionar Aluno
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja adicionar o aluno ao sistema.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Enviar Convite
            </TabsTrigger>
            <TabsTrigger value="inperson" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Cadastro Presencial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              O aluno receberá um email para criar sua senha e poderá acessar o sistema posteriormente.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nome completo</Label>
                <Input
                  id="invite-name"
                  placeholder="Nome do aluno"
                  value={inviteName}
                  onChange={(e) => {
                    setInviteName(e.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="aluno@email.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSendInvite} disabled={inviteLoading}>
                {inviteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar Convite
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="inperson" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Cadastre o aluno e inicie a avaliação imediatamente. Ideal para consultas presenciais.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="inperson-name">Nome completo *</Label>
                <Input
                  id="inperson-name"
                  placeholder="Nome do aluno"
                  value={inpersonName}
                  onChange={(e) => {
                    setInpersonName(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inperson-email">Email *</Label>
                <Input
                  id="inperson-email"
                  type="email"
                  placeholder="aluno@email.com"
                  value={inpersonEmail}
                  onChange={(e) => {
                    setInpersonEmail(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inperson-phone">Telefone (opcional)</Label>
                <Input
                  id="inperson-phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={inpersonPhone}
                  onChange={(e) => setInpersonPhone(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleInPersonRegistration} disabled={inpersonLoading}>
                {inpersonLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar e Iniciar Avaliação
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
