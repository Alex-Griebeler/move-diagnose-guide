// The link of an invite or "Esqueci minha senha" e-mail opens the app with #access_token=...&type=invite|recovery,
// or with #error=...&error_code=otp_expired when it expired or was used. The student has no password of their own yet,
// so the app must take them to /definir-senha. Read before supabase-js clears the URL (useAuth reads it on import).

export interface AuthLink {
  /** The link signed someone in who must now create a password */
  needsPassword: boolean;
  /** The link failed: expired, already used or invalid */
  failed: boolean;
}

const PASSWORD_LINK_TYPES = new Set(['invite', 'recovery']);

export function readAuthLink(hash: string, search: string): AuthLink {
  const fromHash = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const fromSearch = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const failed = ['error', 'error_code', 'error_description'].some((key) => fromHash.has(key) || fromSearch.has(key));
  const needsPassword = !failed && fromHash.has('access_token') && PASSWORD_LINK_TYPES.has(fromHash.get('type') ?? '');
  return { needsPassword, failed };
}
