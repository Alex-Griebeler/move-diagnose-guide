import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const SET_PASSWORD_PATH = '/definir-senha';

// The invite and recovery e-mails may land on any page (the Site URL when the redirect is not allowed): send whoever
// came through one of those links to create the password, or to the message that the link failed. Waits for loading,
// so supabase-js has already read the session from the URL before the redirect drops it; a link that signed no one in
// (bad token) sends nowhere.
export function PasswordSetupGate({ children }: { children: ReactNode }) {
  const { user, loading, needsPassword, authLinkFailed } = useAuth();
  const { pathname } = useLocation();

  if (!loading && ((needsPassword && user) || authLinkFailed) && pathname !== SET_PASSWORD_PATH) {
    return <Navigate to={SET_PASSWORD_PATH} replace />;
  }
  return <>{children}</>;
}
