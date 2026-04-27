export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'empresa';
}

export function nowLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date());
}

export function parseBrazilianMoney(value: string): number {
  const clean = value
    .trim()
    .replace(/[DC]$/i, '')
    .replace(/^R\$\s*/i, '')
    .trim();

  if (!clean) return 0;

  const negative = clean.startsWith('(') && clean.includes(')');
  const normalized = clean
    .replace(/[()]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return 0;
  return negative ? -parsed : parsed;
}

export function balanceNature(value: string): 'D' | 'C' | null {
  const match = value.trim().match(/([DC])\s*$/i);
  return match ? (match[1].toUpperCase() as 'D' | 'C') : null;
}

export function isZeroMoney(value: string, parsedValue: number): boolean {
  if (Math.abs(parsedValue) === 0) return true;
  const clean = value.trim();
  return clean === '' || clean === '0' || clean === '0,00' || clean === '0.00';
}
