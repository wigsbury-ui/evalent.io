export type Domain = 'English'|'Maths'|'Reasoning'|'Readiness';

export function decideOverall(pcts: Record<string,number>, thresholds: Record<string,number>) {
  let below = 0, near = 0;
  const detail: Record<string, {score:number, threshold:number, result:'pass'|'near'|'below'}> = {};
  const domains: Domain[] = ['English','Maths','Reasoning','Readiness'];
  for (const dom of domains) {
    const score = pcts[dom] ?? 0;
    const thr = thresholds[dom] ?? 0;
    const delta = score - thr;
    const result = delta >= 0 ? 'pass' : (delta >= -5 ? 'near' : 'below');
    if (result === 'below') below++;
    if (result === 'near') near++;
    detail[dom] = { score, threshold: thr, result };
  }
  const overall = (below >= 2) ? 'decline' : (below === 1 || near >= 2) ? 'review' : 'accept';
  return { overall, detail };
}
