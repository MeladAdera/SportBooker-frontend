/** Shared password strength scoring for register / reset flows. */

export function passwordStrengthScore(password: string): number {
  let s = 0;
  if (password.length >= 8) s++;
  if (/[a-z]/.test(password)) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return Math.min(s, 5);
}

export function strengthLabelKey(
  score: number,
): 'weak' | 'medium' | 'strong' | 'empty' {
  if (score === 0) return 'empty';
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}
