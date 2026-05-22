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
  previousBalanceNumber: number;
  debitNumber: number;
  creditNumber: number;
  currentBalanceNumber: number;
}

export interface UnclassifiedLine {
  page: number;
  text: string;
  reason: string;
}

export interface CompanyReport {
  id: string;
  fileName: string;
  companyCode?: string;
  companyName: string;
  cnpj: string;
  period: string;
  rows: LedgerLine[];
  unclassified: UnclassifiedLine[];
  invertedRows: InvertedBalanceRow[];
  zeroMovementRows: LedgerLine[];
  comparisonReport: BalanceComparisonReport;
  analysisReports: AnalysisReport[];
  errors: string[];
}

export interface InvertedBalanceRow extends LedgerLine {
  alertType: AlertType;
}

export interface BalanceComparisonReport {
  distributionRow?: LedgerLine;
  account3Row?: LedgerLine;
  account6Row?: LedgerLine;
  account2413Row?: LedgerLine;
  mode: 'distribution' | 'fallback';
  baseValue: number;
  targetValue: number;
  difference: number;
  isAttention: boolean;
  message: string;
}

export type AnalysisKind =
  | 'analysis1'
  | 'analysis2'
  | 'analysis3'
  | 'analysis4'
  | 'analysis5'
  | 'analysis6'
  | 'analysis7'
  | 'analysis8'
  | 'analysis9'
  | 'analysis10'
  | 'analysis11'
  | 'analysis12';

export interface AnalysisReport {
  kind: AnalysisKind;
  title: string;
  intro: string;
  message: string;
  rows: LedgerLine[];
  depreciationPairs?: DepreciationPairRow[];
  isAttention: boolean;
  calculation?: AnalysisCalculation;
}

export type ReportKind = 'inverted' | 'zero' | 'comparison' | AnalysisKind;

export interface AnalysisCalculation {
  formula: string;
  items: AnalysisCalculationItem[];
}

export interface AnalysisCalculationItem {
  label: string;
  value: number;
  format?: 'money' | 'percentage';
}

export interface DepreciationPairRow {
  assetCode: string;
  assetName: string;
  assetCurrentBalance: string;
  depreciationCode: string;
  depreciationName: string;
  depreciationCurrentBalance: string;
  correctiveAction: string;
}
