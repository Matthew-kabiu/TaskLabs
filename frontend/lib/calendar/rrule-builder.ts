export type RruleFreq = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RruleSpec {
  freq: RruleFreq;
}

export function buildRrule(spec: RruleSpec): string | null {
  if (spec.freq === 'NONE') return null;
  return `FREQ=${spec.freq}`;
}

export function parseRrule(rrule: string | null | undefined): RruleSpec {
  if (!rrule) return { freq: 'NONE' };
  const m = rrule.match(/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/);
  if (!m) return { freq: 'NONE' };
  return { freq: m[1] as RruleFreq };
}
