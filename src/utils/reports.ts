import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CompanyReport, InvertedBalanceRow, LedgerLine, ReportKind } from '../types';
import { classifyAccount, formatNumberAsBrazilianMoney, nowLabel, parseBrazilianMoney, slugify } from './format';

const invertedColumns = [
  'Tipo de Alerta',
  'Natureza',
  'Conta Contabil',
  'Nome da Conta',
  'S. Anterior',
  'Debito',
  'Credito',
  'S. Atual',
  'Cod. R.'
];

const zeroColumns = [
  'Natureza',
  'Conta Contabil',
  'Nome da Conta',
  'Debito',
  'Credito',
  'Cod. R.'
];

const comparisonColumns = [
  'Item',
  'Natureza',
  'Conta Contabil',
  'Nome da Conta',
  'S. Atual',
  'Valor numerico',
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
    buildWorksheet(company, reportTitle('inverted'), invertedColumns, invertedBody(company.invertedRows), createdAt),
    'Saldos invertidos'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(company, reportTitle('zero'), zeroColumns, zeroBody(company.zeroMovementRows), createdAt),
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
  doc.text(`CNPJ: ${company.cnpj}`, 40, 74);
  doc.text(`Período: ${company.period}`, 40, 90);
  doc.text(`Arquivo: ${company.fileName}`, 40, 106);
  doc.text(`Gerado em: ${createdAt}`, 40, 122);

  addPdfSection(doc, reportTitle('inverted'), invertedColumns, invertedBody(company.invertedRows), 150);
  const zeroStartY = getFinalY(doc) + 34;
  addPdfSection(doc, reportTitle('zero'), zeroColumns, zeroBody(company.zeroMovementRows), zeroStartY);
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
    { wch: 14 },
    { wch: 24 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 }
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

function invertedBody(rows: InvertedBalanceRow[]) {
  return rows.map((row) => [
    row.alertType,
    classifyAccount(row.account),
    row.account,
    row.name,
    row.previousBalance,
    row.debit,
    row.credit,
    row.currentBalance,
    row.code ?? ''
  ]);
}

function zeroBody(rows: LedgerLine[]) {
  return rows.map((row) => [
    classifyAccount(row.account),
    row.account,
    row.name,
    row.debit,
    row.credit,
    row.code ?? ''
  ]);
}

function comparisonBody(company: CompanyReport) {
  const { comparisonReport } = company;
  const status = comparisonReport.message;
  const rows: Array<Array<string | number>> = [];

  if (comparisonReport.distributionRow) {
    rows.push(comparisonRow('Distribuição Antecipada de Lucros', comparisonReport.distributionRow, status));
  }

  if (comparisonReport.resultRow) {
    rows.push(comparisonRow('Resultado do Período', comparisonReport.resultRow, status));
  }

  rows.push([
    'Diferença',
    '',
    '',
    'Distribuição menos Resultado',
    '',
    formatNumberAsBrazilianMoney(comparisonReport.difference),
    status
  ]);

  return rows;
}

function comparisonRow(label: string, row: LedgerLine, status: string) {
  return [
    label,
    classifyAccount(row.account),
    row.account,
    row.name,
    row.currentBalance,
    formatNumberAsBrazilianMoney(Math.abs(parseBrazilianMoney(row.currentBalance))),
    status
  ];
}

function getFinalY(doc: jsPDF) {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
}
