/**
 * Workers log in with their employee code (e.g. "BILL"). Supabase requires
 * an email for password auth, so we synthesize one from the code.
 * Admins can also use real emails (anything with '@') as-is.
 */
export function codeToEmail(codeOrEmail: string): string {
  const s = codeOrEmail.trim();
  if (s.includes('@')) return s.toLowerCase();
  return `${s.toLowerCase()}@payroll.local`;
}

export function emailToCode(email: string): string {
  if (email.endsWith('@payroll.local')) {
    return email.slice(0, -'@payroll.local'.length).toUpperCase();
  }
  return email;
}
