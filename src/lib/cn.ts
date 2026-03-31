/** Shared Tailwind class shortcuts used across components */

export const cn = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');
