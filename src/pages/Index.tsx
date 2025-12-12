import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Zap, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  PageLayout, 
  PageHeader, 
  PageContent, 
  PageFooter 
} from '@/components/layout/PageLayout';

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
    <PageLayout>
      <PageHeader
        variant="auth"
        rightContent={
          <Link to="/auth">
            <Button variant="outline" size="sm">Entrar</Button>
          </Link>
        }
      />

      <PageContent className="py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance font-display">
            Movement & Performance Screen
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 text-balance leading-relaxed">
            Sistema de avaliação de movimento para profissionais da saúde e performance.
          </p>
          <Link to="/auth">
            <Button size="lg" className="h-12 px-8 text-base">
              Começar agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="bg-card rounded-xl p-5 shadow-card card-hover border border-border animate-fade-in" 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-10 font-display">Por que usar o FABRIK?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {[
              'Anamnese completa em 9 blocos',
              '3 testes globais (OHS, SLS, Push-up)',
              'Mapeamento automático de compensações',
              'Protocolos personalizados FABRIK',
            ].map((benefit, index) => (
              <div 
                key={benefit} 
                className="flex items-start gap-3 text-left animate-fade-in p-3 rounded-lg bg-card/50" 
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm text-foreground leading-relaxed">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </PageContent>

      <PageFooter />
    </PageLayout>
  );
}
