import { ReactNode } from 'react';
import fabrikLogo from '@/assets/fabrik-logo.png';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-8">
        <div className="flex items-center gap-3">
          <img src={fabrikLogo} alt="FABRIK" className="h-14 w-auto" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-8 text-center">
        <p className="text-sm text-muted-foreground">
          Movement & Performance Screen
        </p>
      </footer>
    </div>
  );
}
