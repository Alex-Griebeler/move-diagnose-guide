import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, UserCog, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type UserRole = 'professional' | 'student';

export default function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message,
        });
      } else {
        toast({
          title: 'Bem-vindo de volta!',
          description: 'Login realizado com sucesso.',
        });
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName, selectedRole);
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login.';
        }
        toast({
          variant: 'destructive',
          title: 'Erro ao cadastrar',
          description: errorMessage,
        });
      } else {
        toast({
          title: 'Conta criada!',
          description: 'Você já pode acessar o sistema.',
        });
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="border-border shadow-elevated">
        <Tabs defaultValue="login" className="w-full">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {/* Login Tab */}
            <TabsContent value="login" className="mt-0">
              <div className="space-y-1 mb-6">
                <CardTitle className="text-xl font-semibold">Bem-vindo de volta</CardTitle>
                <CardDescription className="text-sm">
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </div>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    {...loginForm.register('email')}
                    className="h-11"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <span className="animate-pulse-subtle">Entrando...</span>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="mt-0">
              <div className="space-y-1 mb-6">
                <CardTitle className="text-xl font-semibold">Criar conta</CardTitle>
                <CardDescription className="text-sm">
                  Preencha os dados para começar a usar o FABRIK
                </CardDescription>
              </div>

              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de conta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('professional')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200",
                        selectedRole === 'professional'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <UserCog className={cn(
                        "w-6 h-6",
                        selectedRole === 'professional' ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        selectedRole === 'professional' ? "text-foreground" : "text-muted-foreground"
                      )}>
                        Profissional
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('student')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200",
                        selectedRole === 'student'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <GraduationCap className={cn(
                        "w-6 h-6",
                        selectedRole === 'student' ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        selectedRole === 'student' ? "text-foreground" : "text-muted-foreground"
                      )}>
                        Aluno
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    {...signupForm.register('fullName')}
                    className="h-11"
                  />
                  {signupForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">
                      {signupForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    {...signupForm.register('email')}
                    className="h-11"
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {signupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...signupForm.register('password')}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {signupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-sm font-medium">Confirmar senha</Label>
                  <Input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...signupForm.register('confirmPassword')}
                    className="h-11"
                  />
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {signupForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <span className="animate-pulse-subtle">Criando conta...</span>
                  ) : (
                    <>
                      Criar conta
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </AuthLayout>
  );
}
