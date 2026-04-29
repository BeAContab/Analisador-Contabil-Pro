import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CompanyReport, InvertedBalanceRow, LedgerLine, ReportKind } from '../types';
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

export function reportRows(company: CompanyReport, kind: ReportKind) {
  if (kind === 'inverted') return company.invertedRows;
  if (kind === 'zero') return company.zeroMovementRows;
  return [];
}

export function reportTitle(kind: ReportKind): string {
  if (kind === 'inverted') return 'Saldos invertidos Ativo/Passivo';
  if (kind === 'zero') return 'Contas sem movimentação no período';
  return 'Comparação Distribuição x Resultado';
}

export function reportFileName(company: CompanyReport, extension: 'xlsx' | 'pdf') {
  return `${slugify(company.companyName)}_relatorios-consolidados.${extension}`;
}

export function downloadXlsx(company: CompanyReport) {
  const workbook = XLSX.utils.book_new();
  const createdAt = nowLabel();

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(company, reportTitle('inverted'), balanceColumns, balanceBody(company.invertedRows), createdAt),
    'Saldos invertidos'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(company, reportTitle('zero'), balanceColumns, balanceBody(company.zeroMovementRows), createdAt),
    'Sem movimentacao'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(company, reportTitle('comparison'), comparisonColumns, comparisonBody(company), createdAt),
    'Comparacao'
  );

  XLSX.writeFile(workbook, reportFileName(company, 'xlsx'));
}

export function downloadPdf(company: CompanyReport) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const createdAt = nowLabel();

  doc.setFontSize(14);
  doc.text('Relatórios consolidados', 40, 36);
  doc.setFontSize(9);
  doc.text(`Empresa: ${company.companyName}`, 40, 58);
  doc.text(`Código da empresa: ${company.companyCode ?? '-'}`, 40, 74);
  doc.text(`CNPJ: ${company.cnpj}`, 40, 90);
  doc.text(`Período: ${company.period}`, 40, 106);
  doc.text(`Arquivo: ${company.fileName}`, 40, 122);
  doc.text(`Gerado em: ${createdAt}`, 40, 138);

  addPdfSection(doc, reportTitle('inverted'), balanceColumns, balanceBody(company.invertedRows), 166);
  const zeroStartY = getFinalY(doc) + 34;
  addPdfSection(doc, reportTitle('zero'), balanceColumns, balanceBody(company.zeroMovementRows), zeroStartY);
  const comparisonStartY = getFinalY(doc) + 34;
  addPdfSection(doc, reportTitle('comparison'), comparisonColumns, comparisonBody(company), comparisonStartY);

  doc.save(reportFileName(company, 'pdf'));
}

function buildWorksheet(
  company: CompanyReport,
  title: string,
  columns: string[],
  body: Array<Array<string | number>>,
  createdAt: string
) {
  const rows = [
    ['Relatorio', title],
    ['Empresa', company.companyName],
    ['Código da empresa', company.companyCode ?? '-'],
    ['CNPJ', company.cnpj],
    ['Periodo', company.period],
    ['Arquivo', company.fileName],
    ['Gerado em', createdAt],
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
  startY: number
) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const normalizedStartY = startY > pageHeight - 80 ? 40 : startY;
  if (normalizedStartY !== startY) {
    doc.addPage();
  }

  doc.setFontSize(11);
  doc.text(title, 40, normalizedStartY);

  autoTable(doc, {
    startY: normalizedStartY + 12,
    head: [columns],
    body: body.length ? body : [['Nenhum resultado encontrado.']],
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 78, 94] },
    margin: { left: 36, right: 36 }
  });
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

  rows.push(comparisonRow('Conta 3', comparisonReport.account3Row, signedCurrentBalance(comparisonReport.account3Row), status));
  rows.push(comparisonRow('Conta 6', comparisonReport.account6Row, signedCurrentBalance(comparisonReport.account6Row), status));
  if (comparisonReport.mode === 'distribution') {
    rows.push(
      comparisonRow(
        'Conta 2.4.13',
        comparisonReport.account2413Row,
        signedCurrentBalance(comparisonReport.account2413Row),
        status
      )
    );
  }
  rows.push(
    comparisonRow(
      comparisonReport.mode === 'fallback' ? 'Conta comparada: 2.4.13' : 'Conta comparada: 1.1.04.019',
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
    'Diferença',
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
    row?.name ?? 'Conta não localizada',
    row?.currentBalance ?? '',
    formatNumberAsBrazilianMoney(value),
    status
  ];
}

function signedCurrentBalance(row?: LedgerLine): number {
  if (!row) return 0;
  const value = Math.abs(parseBrazilianMoney(row.currentBalance));
  return balanceNature(row.currentBalance) === 'D' ? -value : value;
}

function comparisonFormula(company: CompanyReport): string {
  const { comparisonReport } = company;
  if (comparisonReport.mode === 'fallback') {
    return 'Soma calculada = Conta 3 + Conta 6. Comparação = Soma calculada - Conta 2.4.13.';
  }

  return 'Soma calculada = Conta 3 + Conta 6 + Conta 2.4.13. Comparação = Soma calculada - Conta 1.1.04.019.';
}

function getFinalY(doc: jsPDF) {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
}
