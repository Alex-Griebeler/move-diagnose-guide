import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageEmpty } from '@/components/layout/PageLayout';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  // Where the error happened, for the log only (no student data)
  scope: string;
  variant?: 'page' | 'step';
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Shows a fallback instead of a blank screen when a render error escapes the children
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // In production the logger prints only the message, never the error object
    logger.error(`Erro de renderização em ${this.props.scope}`, error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isPage = this.props.variant === 'page';
    return (
      <div className={isPage ? 'min-h-screen flex items-center justify-center bg-background px-4' : undefined}>
        <PageEmpty
          icon={<AlertTriangle className="w-8 h-8 text-destructive" />}
          title={isPage ? 'Algo deu errado nesta página.' : 'Não foi possível exibir esta etapa.'}
          description="Tente novamente. Se o problema continuar, volte ao painel."
          action={
            <div className="flex justify-center gap-3">
              <Button onClick={this.handleRetry}>Tentar novamente</Button>
              <Button variant="outline" asChild>
                {/* Full reload: works outside the Router and discards the broken state */}
                <a href="/dashboard">Voltar ao painel</a>
              </Button>
            </div>
          }
        />
      </div>
    );
  }
}
