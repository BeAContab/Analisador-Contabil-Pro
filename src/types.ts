export type AlertType = 'Ativo com saldo C' | 'Passivo/PL com saldo D';

export interface LedgerLine {
  account: string;
  name: string;
  previousBalance: string;
  debit: string;
  credit: string;
  currentBalance: string;
  code?: string;
  page?: number;
  raw: string;
  debitNumber: number;
  creditNumber: number;
}

export interface UnclassifiedLine {
  page: number;
  text: string;
  reason: string;
}

export interface CompanyReport {
  id: string;
  fileName: string;
  companyName: string;
  cnpj: string;
  period: string;
  rows: LedgerLine[];
  unclassified: UnclassifiedLine[];
  invertedRows: InvertedBalanceRow[];
  zeroMovementRows: LedgerLine[];
  errors: string[];
}

export interface InvertedBalanceRow extends LedgerLine {
  alertType: AlertType;
}

export type ReportKind = 'inverted' | 'zero';
