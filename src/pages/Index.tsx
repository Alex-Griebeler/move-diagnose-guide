import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, Zap, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Zap,
      title: 'Avaliação Rápida',
      description: 'Testes globais e segmentares com análise automática de compensações',
    },
    {
      icon: BarChart3,
      title: 'Protocolos Inteligentes',
      description: 'Motor de decisão FABRIK gera exercícios priorizados automaticamente',
    },
    {
      icon: Shield,
      title: 'Metodologia Validada',
      description: 'Baseado no método FABRIK e referências do Rebuilding Milo',
    },
  ];

  return (
    <div className="min-h-screen gradient-hero">
      <header className="w-full py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">FABRIK</span>
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
            Movement & Performance Screen
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 text-balance">
            Sistema de avaliação de movimento para profissionais da saúde e performance.
          </p>
          <Link to="/auth">
            <Button size="lg" className="h-12 px-8 text-base">
              Começar agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="bg-card rounded-2xl p-6 shadow-card card-hover animate-fade-in" 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12">Por que usar o FABRIK?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              'Anamnese completa em 9 blocos',
              '3 testes globais (OHS, SLS, Push-up)',
              'Mapeamento automático de compensações',
              'Protocolos personalizados FABRIK',
            ].map((benefit, index) => (
              <div 
                key={benefit} 
                className="flex items-start gap-3 text-left animate-fade-in" 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-8 px-4 text-center border-t">
        <p className="text-sm text-muted-foreground">FABRIK Movement & Performance Screen</p>
      </footer>
    </div>
  );
}
