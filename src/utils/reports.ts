import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CompanyReport, InvertedBalanceRow, LedgerLine, ReportKind } from '../types';
import { nowLabel, slugify } from './format';

const invertedColumns = [
  'Tipo de Alerta',
  'Conta Contabil',
  'Nome da Conta',
  'S. Anterior',
  'Debito',
  'Credito',
  'S. Atual',
  'Cod. R.',
  'Pag.'
];
const zeroColumns = ['Conta Contabil', 'Nome da Conta', 'S. Anterior', 'Debito', 'Credito', 'S. Atual', 'Cod. R.', 'Pag.'];

export function reportRows(company: CompanyReport, kind: ReportKind) {
  return kind === 'inverted' ? company.invertedRows : company.zeroMovementRows;
}

export function reportTitle(kind: ReportKind): string {
  return kind === 'inverted'
    ? 'Saldos invertidos Ativo/Passivo'
    : 'Contas com Debito e Credito zerados';
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
    'Debito Credito Zerados'
  );

  XLSX.writeFile(workbook, reportFileName(company, 'xlsx'));
}

export function downloadPdf(company: CompanyReport) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const createdAt = nowLabel();

  doc.setFontSize(14);
  doc.text('Relatorios consolidados', 40, 36);
  doc.setFontSize(9);
  doc.text(`Empresa: ${company.companyName}`, 40, 58);
  doc.text(`CNPJ: ${company.cnpj}`, 40, 74);
  doc.text(`Periodo: ${company.period}`, 40, 90);
  doc.text(`Arquivo: ${company.fileName}`, 40, 106);
  doc.text(`Gerado em: ${createdAt}`, 40, 122);

  addPdfSection(doc, reportTitle('inverted'), invertedColumns, invertedBody(company.invertedRows), 150);
  const nextY = getFinalY(doc) + 34;
  addPdfSection(doc, reportTitle('zero'), zeroColumns, zeroBody(company.zeroMovementRows), nextY);

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
    { wch: 24 },
    { wch: 22 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 }
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
    row.account,
    row.name,
    row.previousBalance,
    row.debit,
    row.credit,
    row.currentBalance,
    row.code ?? '',
    row.page ?? ''
  ]);
}

function zeroBody(rows: LedgerLine[]) {
  return rows.map((row) => [
    row.account,
    row.name,
    row.previousBalance,
    row.debit,
    row.credit,
    row.currentBalance,
    row.code ?? '',
    row.page ?? ''
  ]);
}

function getFinalY(doc: jsPDF) {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
}
