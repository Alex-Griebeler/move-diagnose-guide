import { ReactNode } from 'react';

interface WizardContainerProps {
  children: ReactNode;
}

export function WizardContainer({ children }: WizardContainerProps) {
  return <div className="max-w-4xl mx-auto">{children}</div>;
}

interface WizardContentCardProps {
  children: ReactNode;
}

export function WizardContentCard({ children }: WizardContentCardProps) {
  return (
    <div className="bg-card rounded-xl border p-6 mb-6 animate-fade-in">
      {children}
    </div>
  );
}
