import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AnalysisCalculation, AnalysisKind, CompanyReport, InvertedBalanceRow, LedgerLine, ReportKind } from '../types';
import { balanceNature, classifyAccount, formatNumberAsBrazilianMoney, nowLabel, parseBrazilianMoney, slugify } from './format';

const balanceColumns = [
  'Natureza',
  'Conta Contabil',
  'Cod. R.',
  'Nome da Conta',
  'S. Anterior',
  'Debito',
  'Credito',
  'S. Atual'
];

const comparisonColumns = [
  'Item',
  'Natureza',
  'Conta Contabil',
  'Nome da Conta',
  'S. Atual',
  'Valor no calculo',
  'Status'
];

export const analysisOrder: AnalysisKind[] = [
  'analysis1',
  'analysis2',
  'analysis3',
  'analysis4',
  'analysis5',
  'analysis6',
  'analysis7',
  'analysis8',
  'analysis9'
];

export const reportTabs: Array<{ kind: ReportKind; label: string }> = [
  { kind: 'inverted', label: 'Saldos invertidos' },
  { kind: 'zero', label: 'Contas sem movimentacao' },
  { kind: 'comparison', label: 'Distribuicao x Resultado' },
  { kind: 'analysis1', label: 'Clientes com Saldo Atual Baixo' },
  { kind: 'analysis2', label: 'Cliente Pessoa Fisica Fora da Regra' },
  { kind: 'analysis3', label: 'Conciliacao Clientes x Receitas Operacionais' },
  { kind: 'analysis4', label: 'Clientes com Saldo Residual' },
  { kind: 'analysis5', label: 'Clientes sem Credito no Periodo' },
  { kind: 'analysis6', label: 'Fornecedores sem Debito no Periodo' },
  { kind: 'analysis7', label: 'Validacao Estoques x Fornecedores' },
  { kind: 'analysis8', label: 'Fornecedores com Saldo Residual' },
  { kind: 'analysis9', label: 'Fornecedores com Credito sem Debito' }
];

export function reportRows(company: CompanyReport, kind: ReportKind) {
  if (kind === 'inverted') return company.invertedRows;
  if (kind === 'zero') return company.zeroMovementRows;
  if (kind === 'comparison') return [];
  return company.analysisReports.find((report) => report.kind === kind)?.rows ?? [];
}

export function reportTitle(kind: ReportKind, company?: CompanyReport): string {
  if (kind === 'inverted') return 'Saldos invertidos Ativo/Passivo';
  if (kind === 'zero') return 'Contas sem movimentacao no periodo';
  if (kind === 'comparison') return 'Comparacao Distribuicao x Resultado';
  return company?.analysisReports.find((report) => report.kind === kind)?.title ?? kind;
}

export function analysisMessage(company: CompanyReport, kind: AnalysisKind): string {
  return company.analysisReports.find((report) => report.kind === kind)?.message ?? 'Relatorio nao encontrado.';
}

export function analysisIntro(company: CompanyReport, kind: AnalysisKind): string {
  return company.analysisReports.find((report) => report.kind === kind)?.intro ?? '';
}

export function analysisAttention(company: CompanyReport, kind: AnalysisKind): boolean {
  return company.analysisReports.find((report) => report.kind === kind)?.isAttention ?? true;
}

export function analysisCalculation(company: CompanyReport, kind: AnalysisKind): AnalysisCalculation | undefined {
  return company.analysisReports.find((report) => report.kind === kind)?.calculation;
}

export function reportIntro(kind: ReportKind, company?: CompanyReport): string {
  if (kind === 'inverted') {
    return 'Mostra contas do ativo com S. Atual credor e contas do passivo ou patrimonio liquido com S. Atual devedor.';
  }
  if (kind === 'zero') {
    return 'Mostra contas com Debito igual a zero e Credito igual a zero no periodo.';
  }
  if (kind === 'comparison') {
    return 'Caso 1: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) for maior que 0, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO), 6 (RESULTADO E REGULARIZACAO) e 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS) MENOS 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS).\n\nResumo: (3 + 6 + 2.4.13) - 1.1.04.019\n\nCaso 2: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) estiver zerada ou nao existir, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO) e 6 (RESULTADO E REGULARIZACAO) MENOS a conta 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS).\n\nResumo: (3 + 6) - 2.4.13';
  }
  return company ? analysisIntro(company, kind) : '';
}

export function reportFileName(company: CompanyReport, extension: 'xlsx' | 'pdf') {
  return `${slugify(company.companyName)}_relatorios-consolidados.${extension}`;
}

export function hasExportContent(company: CompanyReport): boolean {
  return (
    company.invertedRows.length > 0 ||
    company.zeroMovementRows.length > 0 ||
    Boolean(
      company.comparisonReport.distributionRow ||
        company.comparisonReport.account3Row ||
        company.comparisonReport.account6Row ||
        company.comparisonReport.account2413Row
    ) ||
    company.analysisReports.some((report) => report.rows.length > 0 || report.message.length > 0)
  );
}

export function downloadXlsx(company: CompanyReport) {
  const workbook = XLSX.utils.book_new();
  const createdAt = nowLabel();

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(
      company,
      reportTitle('inverted'),
      balanceColumns,
      balanceBody(company.invertedRows),
      createdAt,
      undefined,
      reportIntro('inverted')
    ),
    'Saldos invertidos'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(
      company,
      reportTitle('zero'),
      balanceColumns,
      balanceBody(company.zeroMovementRows),
      createdAt,
      undefined,
      reportIntro('zero')
    ),
    'Sem movimentacao'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(
      company,
      reportTitle('comparison'),
      comparisonColumns,
      comparisonBody(company),
      createdAt,
      company.comparisonReport.message,
      reportIntro('comparison')
    ),
    'Comparacao'
  );

  analysisOrder.forEach((kind, index) => {
    XLSX.utils.book_append_sheet(
      workbook,
      buildWorksheet(
        company,
        reportTitle(kind, company),
        balanceColumns,
        balanceBody(reportRows(company, kind)),
        createdAt,
        analysisMessage(company, kind),
        reportIntro(kind, company),
        analysisCalculation(company, kind)
      ),
      `Analise ${index + 1}`
    );
  });

  XLSX.writeFile(workbook, reportFileName(company, 'xlsx'));
}

export function downloadPdf(company: CompanyReport) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const createdAt = nowLabel();

  doc.setFontSize(14);
  doc.text('Relatorios consolidados', 40, 36);
  doc.setFontSize(9);
  doc.text(`Empresa: ${company.companyName}`, 40, 58);
  doc.text(`Codigo da empresa: ${company.companyCode ?? '-'}`, 40, 74);
  doc.text(`CNPJ: ${company.cnpj}`, 40, 90);
  doc.text(`Periodo: ${company.period}`, 40, 106);
  doc.text(`Arquivo: ${company.fileName}`, 40, 122);
  doc.text(`Gerado em: ${createdAt}`, 40, 138);

  let nextY = 166;
  nextY = addPdfSection(
    doc,
    reportTitle('inverted'),
    balanceColumns,
    balanceBody(company.invertedRows),
    nextY,
    undefined,
    reportIntro('inverted')
  );
  nextY = addPdfSection(
    doc,
    reportTitle('zero'),
    balanceColumns,
    balanceBody(company.zeroMovementRows),
    nextY + 34,
    undefined,
    reportIntro('zero')
  );
  nextY = addPdfSection(
    doc,
    reportTitle('comparison'),
    comparisonColumns,
    comparisonBody(company),
    nextY + 34,
    company.comparisonReport.message,
    reportIntro('comparison')
  );

  analysisOrder.forEach((kind) => {
    nextY = addPdfSection(
      doc,
      reportTitle(kind, company),
      balanceColumns,
      balanceBody(reportRows(company, kind)),
      nextY + 34,
      analysisMessage(company, kind),
      reportIntro(kind, company),
      analysisCalculation(company, kind)
    );
  });

  doc.save(reportFileName(company, 'pdf'));
}

function buildWorksheet(
  company: CompanyReport,
  title: string,
  columns: string[],
  body: Array<Array<string | number>>,
  createdAt: string,
  message?: string,
  intro?: string,
  calculation?: AnalysisCalculation
) {
  const rows = [
    ['Relatorio', title],
    ['Empresa', company.companyName],
    ['Codigo da empresa', company.companyCode ?? '-'],
    ['CNPJ', company.cnpj],
    ['Periodo', company.period],
    ['Arquivo', company.fileName],
    ['Gerado em', createdAt],
    ...(intro ? [['Introducao', intro]] : []),
    ...(message ? [['Status', message]] : []),
    ...(calculation
      ? [['Formula', calculation.formula], ...calculation.items.map((item) => [item.label, formatNumberAsBrazilianMoney(item.value)])]
      : []),
    [],
    columns,
    ...(body.length ? body : [['Nenhum resultado encontrado.']])
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 10 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 }
  ];
  return worksheet;
}

function addPdfSection(
  doc: jsPDF,
  title: string,
  columns: string[],
  body: Array<Array<string | number>>,
  startY: number,
  message?: string,
  intro?: string,
  calculation?: AnalysisCalculation
) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const normalizedStartY = startY > pageHeight - 120 ? 40 : startY;
  if (normalizedStartY !== startY) {
    doc.addPage();
  }

  doc.setFontSize(11);
  doc.text(title, 40, normalizedStartY);

  let tableStartY = normalizedStartY + 12;
  if (intro) {
    doc.setFontSize(8);
    doc.text(intro, 40, tableStartY, { maxWidth: doc.internal.pageSize.getWidth() - 80 });
    tableStartY += 14;
  }
  if (message) {
    doc.setFontSize(8);
    doc.text(message, 40, tableStartY, { maxWidth: doc.internal.pageSize.getWidth() - 80 });
    tableStartY += 14;
  }
  if (calculation) {
    doc.setFontSize(8);
    doc.text(calculation.formula, 40, tableStartY, { maxWidth: doc.internal.pageSize.getWidth() - 80 });
    tableStartY += 12;
    calculation.items.forEach((item) => {
      doc.text(`${item.label}: ${formatNumberAsBrazilianMoney(item.value)}`, 40, tableStartY, {
        maxWidth: doc.internal.pageSize.getWidth() - 80
      });
      tableStartY += 10;
    });
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [columns],
    body: body.length ? body : [['Nenhum resultado encontrado.']],
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 78, 94] },
    margin: { left: 36, right: 36 }
  });

  return getFinalY(doc);
}

function balanceBody(rows: Array<LedgerLine | InvertedBalanceRow>) {
  return rows.map((row) => [
    classifyAccount(row.account),
    row.account,
    row.code ?? '',
    row.name,
    row.previousBalance,
    row.debit,
    row.credit,
    row.currentBalance
  ]);
}

function comparisonBody(company: CompanyReport) {
  const { comparisonReport } = company;
  const status = comparisonReport.message;
  const rows: Array<Array<string | number>> = [
    ['Formula', '', '', comparisonFormula(company), '', '', status]
  ];

  rows.push(
    comparisonRow(
      comparisonLabel('Conta 3', comparisonReport.account3Row),
      comparisonReport.account3Row,
      signedCurrentBalance(comparisonReport.account3Row),
      status
    )
  );
  rows.push(
    comparisonRow(
      comparisonLabel('Conta 6', comparisonReport.account6Row),
      comparisonReport.account6Row,
      signedCurrentBalance(comparisonReport.account6Row),
      status
    )
  );
  if (comparisonReport.mode === 'distribution') {
    rows.push(
      comparisonRow(
        comparisonLabel('Conta 2.4.13', comparisonReport.account2413Row),
        comparisonReport.account2413Row,
        signedCurrentBalance(comparisonReport.account2413Row),
        status
      )
    );
  }
  rows.push(
    comparisonRow(
      comparisonReport.mode === 'fallback'
        ? comparisonLabel('Conta comparada: 2.4.13', comparisonReport.account2413Row)
        : comparisonLabel('Conta comparada: 1.1.04.019', comparisonReport.distributionRow),
      comparisonReport.mode === 'fallback' ? comparisonReport.account2413Row : comparisonReport.distributionRow,
      comparisonReport.targetValue,
      status
    )
  );

  rows.push([
    'Soma calculada',
    '',
    '',
    '',
    '',
    formatNumberAsBrazilianMoney(comparisonReport.baseValue),
    status
  ]);

  rows.push([
    'Valor comparado',
    '',
    '',
    comparisonReport.mode === 'fallback' ? 'S. Atual da conta 2.4.13' : 'S. Atual da conta 1.1.04.019',
    '',
    formatNumberAsBrazilianMoney(comparisonReport.targetValue),
    status
  ]);

  rows.push([
    'Diferenca',
    '',
    '',
    'Soma calculada menos valor comparado',
    '',
    formatNumberAsBrazilianMoney(comparisonReport.difference),
    status
  ]);

  return rows;
}

function comparisonRow(label: string, row: LedgerLine | undefined, value: number, status: string) {
  return [
    label,
    row ? classifyAccount(row.account) : '',
    row?.account ?? '',
    row?.name ?? 'Conta nao localizada',
    row?.currentBalance ?? '',
    formatNumberAsBrazilianMoney(value),
    status
  ];
}

function comparisonLabel(prefix: string, row?: LedgerLine) {
  return row ? `${prefix} (${row.name})` : prefix;
}

function signedCurrentBalance(row?: LedgerLine): number {
  if (!row) return 0;
  const value = Math.abs(parseBrazilianMoney(row.currentBalance));
  return balanceNature(row.currentBalance) === 'D' ? -value : value;
}

function comparisonFormula(company: CompanyReport): string {
  const { comparisonReport } = company;
  if (comparisonReport.mode === 'fallback') {
    return 'Caso 2: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) estiver zerada ou nao existir, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO) e 6 (RESULTADO E REGULARIZACAO) MENOS a conta 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS). Resumo: (3 + 6) - 2.4.13.';
  }

  return 'Caso 1: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) for maior que 0, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO), 6 (RESULTADO E REGULARIZACAO) e 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS) MENOS 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS). Resumo: (3 + 6 + 2.4.13) - 1.1.04.019.';
}

function getFinalY(doc: jsPDF) {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
}
