import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const passwordSchema = z.object({
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

// Where the invite and "Esqueci minha senha" links land: the link signed the student in, and here they create the
// password they use from then on. Before, there was no such page and an invited student could not sign in again.
export default function SetPassword() {
  const { user, loading, authLinkFailed, clearAuthLinkFailed, setPassword } = useAuth();
  const [linkFailed] = useState(authLinkFailed);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Shown once here; cleared so the app stops sending the visitor back to this page
  useEffect(() => {
    if (authLinkFailed) clearAuthLinkFailed();
  }, [authLinkFailed, clearAuthLinkFailed]);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSave = async (data: PasswordFormData) => {
    setIsSaving(true);
    try {
      const { error } = await setPassword(data.password);
      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao salvar a senha', description: error.message });
        return;
      }
      toast({ title: 'Senha criada!', description: 'Da próxima vez, entre com seu e-mail e essa senha.' });
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthLayout>
      <Helmet>
        <title>Criar senha — FABRIK</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Card className="border-border shadow-elevated">
        {loading ? (
          <CardContent className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        ) : !user ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {linkFailed ? 'Este link expirou ou já foi usado' : 'Abra o link do e-mail'}
              </CardTitle>
              <CardDescription className="text-sm">
                {linkFailed
                  ? 'Peça um novo em "Esqueci minha senha", na tela de entrada, ou peça ao seu profissional para enviar o convite de novo.'
                  : 'Para criar sua senha, abra o link que chegou no seu e-mail.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full h-11">
                <Link to="/auth">Ir para a entrada</Link>
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Crie sua senha</CardTitle>
              <CardDescription className="text-sm">
                Para {user.email}. É com ela que você vai entrar daqui para frente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...form.register('password')}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-sm font-medium">Confirmar senha</Label>
                  <Input
                    id="confirm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...form.register('confirmPassword')}
                    className="h-11"
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={isSaving}>
                  {isSaving ? (
                    <span className="animate-pulse-subtle">Salvando...</span>
                  ) : (
                    <>
                      Salvar senha
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
