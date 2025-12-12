import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import fabrikLogo from '@/assets/fabrik-logo.png';

// ============================================
// PageLayout Component
// Layout padronizado para todas as páginas da aplicação
// ============================================

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  rightContent?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'minimal' | 'auth';
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  noPadding?: boolean;
}

interface PageSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

// ============================================
// PageLayout - Container principal
// ============================================

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {children}
    </div>
  );
}

// ============================================
// PageHeader - Header padronizado
// ============================================

export function PageHeader({
  title,
  subtitle,
  showLogo = false,
  showBack = false,
  onBack,
  backLabel,
  rightContent,
  className,
  variant = 'default',
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (variant === 'minimal') {
    return (
      <header className={cn('sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border', className)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-sm font-medium text-foreground truncate">{title}</h1>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          {rightContent}
        </div>
      </header>
    );
  }

  if (variant === 'auth') {
    return (
      <header className={cn('w-full py-6 px-4 sm:px-8 border-b border-border', className)}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={fabrikLogo} alt="FABRIK" className="h-14 w-auto" />
          </div>
          {rightContent}
        </div>
      </header>
    );
  }

  // Default variant
  return (
    <header className={cn('border-b border-border bg-card', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            {showLogo && (
              <img src={fabrikLogo} alt="FABRIK" className="h-14 w-auto" />
            )}
            <div>
              {title && (
                <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {rightContent}
        </div>
      </div>
    </header>
  );
}

// ============================================
// PageContent - Container de conteúdo principal
// ============================================

const contentSizes = {
  sm: 'max-w-xl',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-7xl',
  full: 'w-full',
};

export function PageContent({
  children,
  className,
  size = 'xl',
  noPadding = false,
}: PageContentProps) {
  return (
    <main
      className={cn(
        contentSizes[size],
        'mx-auto',
        !noPadding && 'px-4 sm:px-6 lg:px-8 py-8',
        className
      )}
    >
      {children}
    </main>
  );
}

// ============================================
// PageSection - Seção dentro do conteúdo
// ============================================

export function PageSection({
  children,
  title,
  subtitle,
  className,
}: PageSectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// ============================================
// PageLoading - Estado de loading padronizado
// ============================================

interface PageLoadingProps {
  variant?: 'default' | 'cards' | 'minimal';
}

export function PageLoading({ variant = 'default' }: PageLoadingProps) {
  if (variant === 'minimal') {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </PageLayout>
    );
  }

  if (variant === 'cards') {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </PageLayout>
  );
}

// ============================================
// PageEmpty - Estado vazio padronizado
// ============================================

interface PageEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageEmpty({
  icon,
  title,
  description,
  action,
  className,
}: PageEmptyProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}

// ============================================
// PageFooter - Footer padronizado
// ============================================

interface PageFooterProps {
  children?: React.ReactNode;
  className?: string;
}

export function PageFooter({ children, className }: PageFooterProps) {
  return (
    <footer className={cn('py-8 px-4 text-center border-t border-border', className)}>
      {children || (
        <p className="text-xs text-muted-foreground">FABRIK Movement & Performance Screen</p>
      )}
    </footer>
  );
}
